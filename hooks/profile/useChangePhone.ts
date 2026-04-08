// hooks/profile/useChangePhone.ts
import { useAuth } from '@/context/Authcontext';
import { accountApi } from '@/services/api/account.api';
import { useState } from 'react';
import { Alert } from 'react-native';

interface ChangePhoneErrors {
  phone?: string;
  otp?: string;
  general?: string;
}

export function useChangePhone() {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ChangePhoneErrors>({});
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

  const requestOtp = async (newPhone: string) => {
    if (!newPhone) {
      setErrors({ phone: 'Vui lòng nhập số điện thoại mới' });
      return false;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await accountApi.requestChangePhone({ newPhone });

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

  const verifyOtp = async (newPhone: string, otp: string) => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Vui lòng nhập mã OTP 6 số' });
      return false;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await accountApi.changePhone({ newPhone, otp });

      if (response.result) {
        // Backend revoke toàn bộ session sau khi đổi SĐT → cần logout
        Alert.alert('Thành công', 'Số điện thoại đã được thay đổi. Vui lòng đăng nhập lại.', [
          { text: 'OK', onPress: () => logout() },
        ]);
        return true;
      }

      setErrors({ general: response.message || 'Đổi số điện thoại thất bại' });
      return false;
    } catch (error: any) {
      setErrors({ general: error?.message || 'Đã xảy ra lỗi' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (newPhone: string) => {
    if (countdown > 0) return;
    return await requestOtp(newPhone);
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