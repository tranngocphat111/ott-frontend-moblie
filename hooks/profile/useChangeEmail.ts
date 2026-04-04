// hooks/profile/useChangeEmail.ts
import { useAuth } from '@/context/Authcontext';
import { accountApi } from '@/services/api/account.api';
import { useState } from 'react';
import { Alert } from 'react-native';

interface ChangeEmailErrors {
  email?: string;
  otp?: string;
  general?: string;
}

export function useChangeEmail() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ChangeEmailErrors>({});
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setErrors({ email: 'Vui lòng nhập email' });
      return false;
    }
    if (!emailRegex.test(email)) {
      setErrors({ email: 'Email không hợp lệ' });
      return false;
    }
    return true;
  };

  const requestOtp = async (newEmail: string) => {
    if (!validateEmail(newEmail)) return false;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await accountApi.requestChangeEmail({ newEmail });

      if (response.result) {
        setOtpSent(true);
        startCountdown(60);
        return true;
      }

      setErrors({ general: response.message || 'Không thể gửi OTP' });
      return false;
    } catch (error: any) {
      setErrors({ general: error?.message || 'Đã xảy ra lỗi khi gửi OTP' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (newEmail: string, otp: string) => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Vui lòng nhập mã OTP 6 số' });
      return false;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await accountApi.changeEmail({ newEmail, otp });

      if (response.result) {
        // Backend revoke toàn bộ session sau khi đổi email → cần logout
        Alert.alert('Thành công', 'Email đã được thay đổi. Vui lòng đăng nhập lại.', [
          { text: 'OK', onPress: () => logout() },
        ]);
        return true;
      }

      setErrors({ general: response.message || 'Đổi email thất bại' });
      return false;
    } catch (error: any) {
      setErrors({ general: error?.message || 'Đã xảy ra lỗi' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (newEmail: string) => {
    if (countdown > 0) return;
    return await requestOtp(newEmail);
  };

  return {
    requestOtp,
    verifyOtp,
    resendOtp,
    isLoading,
    errors,
    otpSent,
    countdown,
  };
}