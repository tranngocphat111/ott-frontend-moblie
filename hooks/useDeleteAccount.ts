import { useState, useEffect } from 'react';
import { accountApi } from '../services/api/account.api';
import { useAuth } from '../contexts/Authcontext';
import { useToast } from '../contexts/ToastContext';
import { SUCCESS_MESSAGES, getErrorMessage } from '../utils/messageMapping';

type DeleteAccountStep = 'warning' | 'confirm' | 'otp';

export const useDeleteAccount = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<DeleteAccountStep>('warning');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const startCountdown = () => setCountdown(60);

  const requestOtp = async () => {
    const normalizedConfirm = confirmText.trim().toUpperCase();

    if (normalizedConfirm !== 'DELETE') {
      showToast('Vui lòng nhập chính xác: DELETE', 'warning', 'Xác nhận');
      return;
    }

    if (user?.hasPassword && !password.trim()) {
      showToast('Vui lòng nhập mật khẩu', 'warning', 'Thông báo');
      return;
    }

    setIsLoading(true);
    try {
      await accountApi.requestDeleteAccount({
        password: user?.hasPassword ? password : undefined,
      });

      showToast('Mã OTP đã được gửi đến email của bạn', 'success', 'Thành công');
      setStep('otp');
      startCountdown();
      setConfirmText('');
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);

      if (errorMsg.includes('mật khẩu') || errorMsg.includes('password')) {
        showToast('Mật khẩu không đúng. Vui lòng thử lại.', 'error', 'Lỗi');
      } else {
        showToast(errorMsg, 'error', 'Lỗi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      showToast('Vui lòng nhập đầy đủ mã OTP 6 số', 'warning', 'Thông báo');
      return;
    }

    setIsLoading(true);
    try {
      await accountApi.deleteAccount({ otp: otpCode });

      showToast('Tài khoản đã được xóa thành công. Tạm biệt!', 'success', 'Thành công');

      // logout() trong AuthContext mobile đã tự navigate về /login
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Xóa tài khoản thất bại');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    try {
      await accountApi.requestDeleteAccount({});
      setOtp(['', '', '', '', '', '']);
      startCountdown();
      showToast(SUCCESS_MESSAGES.OTP_RESENT, 'success', 'Đã gửi lại');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Gửi lại thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
  };

  const goToConfirm = () => setStep('confirm');
  const backToWarning = () => setStep('warning');
  const backToConfirm = () => {
    setStep('confirm');
    setOtp(['', '', '', '', '', '']);
  };

  return {
    step,
    isLoading,
    countdown,
    password,
    setPassword,
    confirmText,
    setConfirmText,
    otp,
    handleOtpChange,
    requestOtp,
    deleteAccount,
    resendOtp,
    goToConfirm,
    backToWarning,
    backToConfirm,
  };
};