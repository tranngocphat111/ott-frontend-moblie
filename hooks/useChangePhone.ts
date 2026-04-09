import { useState, useEffect } from 'react';
import { accountApi } from '../services/api/account.api';
import { useAuth } from '../contexts/Authcontext';
import { useToast } from '../contexts/ToastContext';
import type { PhoneChangeResponse } from '../types';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, getErrorMessage } from '../utils/messageMapping';

type ChangePhoneStep = 'request' | 'verify';

export const useChangePhone = () => {
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<ChangePhoneStep>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const requestOtp = async () => {
    if (!newPhone || !/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(newPhone)) {
      showToast(ERROR_MESSAGES[1300], 'warning', 'Thông báo');
      return;
    }

    setIsLoading(true);
    try {
      await accountApi.requestChangePhone({ newPhone });
      setStep('verify');
      startCountdown();
      showToast(SUCCESS_MESSAGES.OTP_SENT, 'success', 'Đã gửi');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi yêu cầu');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      showToast('Vui lòng nhập đầy đủ mã OTP 6 số', 'warning', 'Thông báo');
      return;
    }

    setIsLoading(true);
    try {
      const response = await accountApi.changePhone({ newPhone, otp: otpCode });
      const result = response.result as PhoneChangeResponse;

      const sessionsRevoked = result?.sessionsRevoked || 0;

      const successMsg = sessionsRevoked > 0
        ? `Đổi số điện thoại thành công! Đã đăng xuất tất cả ${sessionsRevoked} phiên làm việc để bảo mật.`
        : 'Đổi số điện thoại thành công. Vui lòng đăng nhập lại.';

      showToast(successMsg, 'success', 'Thành công');

      setTimeout(() => {
        logout();
      }, 1800);
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Xác thực thất bại');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    try {
      await accountApi.requestChangePhone({ newPhone });
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

  const backToRequest = () => {
    setStep('request');
    setOtp(['', '', '', '', '', '']);
    setCountdown(0);
  };

  return {
    step,
    isLoading,
    newPhone,
    setNewPhone,
    otp,
    countdown,
    handleOtpChange,
    requestOtp,
    verifyOtp,
    resendOtp,
    backToRequest,
  };
};