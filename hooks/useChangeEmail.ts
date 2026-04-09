import { useState } from 'react';
import { accountApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/Authcontext';
import type { OtpResponse } from '../types';
import { SUCCESS_MESSAGES, getErrorMessage, ERROR_MESSAGES } from '../utils/messageMapping';

type ChangeEmailStep = 1 | 2;

export const useChangeEmail = (onSuccess?: () => void) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<ChangeEmailStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otpData, setOtpData] = useState<OtpResponse | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const requestOtp = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showToast(ERROR_MESSAGES[1301], 'warning', 'Thông báo');
      return;
    }

    if (newEmail === user?.email) {
      showToast(ERROR_MESSAGES[2100] || 'Email mới phải khác email hiện tại', 'warning', 'Thông báo');
      return;
    }

    setIsLoading(true);
    try {
      const response = await accountApi.requestChangeEmail({ newEmail });
      if (response.result) {
        setOtpData(response.result);
        setStep(2);
        showToast(SUCCESS_MESSAGES.OTP_SENT, 'success', 'Thành công');
      }
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
      const response = await accountApi.changeEmail({ newEmail, otp: otpCode });

      if (response.result) {
        const sessionsRevoked = response.result.sessionsRevoked || 0;

        const successMessage = sessionsRevoked > 0
          ? `Đổi email thành công! Đã đăng xuất tất cả ${sessionsRevoked} phiên làm việc để bảo mật.`
          : 'Đổi email thành công. Vui lòng đăng nhập lại với email mới.';

        showToast(successMessage, 'success', 'Thành công');

        // Force logout tất cả thiết bị (giống đổi mật khẩu)
        setTimeout(() => {
          logout();
        }, 1800);
      }

      onSuccess?.();
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Xác thực thất bại');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    setOtp(['', '', '', '', '', '']);
    setIsLoading(true);
    try {
      const response = await accountApi.requestChangeEmail({ newEmail });
      if (response.result) {
        setOtpData(response.result);
        showToast(SUCCESS_MESSAGES.OTP_RESENT, 'success', 'Đã gửi lại');
      }
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi gửi lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
  };

  const backToStep1 = () => {
    setStep(1);
    setOtp(['', '', '', '', '', '']);
  };

  return {
    step,
    isLoading,
    newEmail,
    setNewEmail,
    otpData,
    otp,
    handleOtpChange,
    requestOtp,
    verifyOtp,
    resendOtp,
    backToStep1,
  };
};