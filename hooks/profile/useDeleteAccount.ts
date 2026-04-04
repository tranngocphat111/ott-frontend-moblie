// hooks/profile/useDeleteAccount.ts
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { accountApi } from '@/services/api/account.api';
import { useAuth } from '@/context/Authcontext';

interface DeleteAccountErrors {
  password?: string;
  otp?: string;
  general?: string;
}

const OTP_EXPIRY_SECONDS = 120;

export const useDeleteAccount = () => {
  const router = useRouter();
  const { logout } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<DeleteAccountErrors>({});
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(OTP_EXPIRY_SECONDS);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const requestOtp = async (): Promise<boolean> => {
    setIsLoading(true);
    setErrors({});

    try {
      const response = await accountApi.requestDeleteAccount({});

      if (response.code === 1000 && response.result) {
        setOtpSent(true);
        startCountdown();
        Alert.alert(
          'Thành công',
          `Mã OTP đã được gửi đến ${response.result.email || response.result.phone}`
        );
        return true;
      } else {
        setErrors({ general: response.message || 'Không thể gửi OTP' });
        return false;
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Đã xảy ra lỗi' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (): Promise<boolean> => {
    if (countdown > 0) {
      Alert.alert('Thông báo', `Vui lòng đợi ${countdown} giây trước khi gửi lại`);
      return false;
    }
    return await requestOtp();
  };

  const deleteAccount = async (otp: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    setErrors({});

    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Mã OTP phải có 6 chữ số' });
      setIsLoading(false);
      return false;
    }

    try {
      const response = await accountApi.deleteAccount({
        otp,
        password,
      });

      if (response.code === 1000) {
        Alert.alert(
          'Xóa tài khoản thành công',
          'Tài khoản của bạn đã được xóa. Bạn sẽ được đăng xuất.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await logout();
                router.replace('../(auth)/landing');
              },
            },
          ]
        );
        return true;
      } else {
        setErrors({ general: response.message || 'Xóa tài khoản thất bại' });
        return false;
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Đã xảy ra lỗi' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    requestOtp,
    resendOtp,
    deleteAccount,
    isLoading,
    errors,
    otpSent,
    countdown,
  };
};