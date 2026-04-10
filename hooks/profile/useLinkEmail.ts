// hooks/profile/useLinkEmail.ts
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { linkingApi } from '@/services/api/linking.api';
import { otpApi } from '@/services/api/otp.api';
import { useAuth } from '@/contexts/Authcontext';

interface LinkEmailErrors {
  email?: string;
  otp?: string;
  general?: string;
}

const OTP_EXPIRY_SECONDS = 120;

export const useLinkEmail = () => {
  const router = useRouter();
  const { updateUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LinkEmailErrors>({});
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Vui lòng nhập email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Email không hợp lệ';
    }
    return undefined;
  };

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

  const requestOtp = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setErrors({});

    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      setIsLoading(false);
      return false;
    }

    try {
      const response = await otpApi.requestLinkEmailOtp(email);

      if (response.code === 1000 && response.result) {
        setOtpSent(true);
        startCountdown();
        Alert.alert(
          'Thành công',
          `Mã OTP đã được gửi đến ${response.result.email}`
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

  const resendOtp = async (email: string): Promise<boolean> => {
    if (countdown > 0) {
      Alert.alert('Thông báo', `Vui lòng đợi ${countdown} giây trước khi gửi lại`);
      return false;
    }
    return await requestOtp(email);
  };

  const linkEmail = async (email: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    setErrors({});

    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      setIsLoading(false);
      return false;
    }

    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Mã OTP phải có 6 chữ số' });
      setIsLoading(false);
      return false;
    }

    try {
      const response = await linkingApi.linkEmail(email, otp);

      if (response.code === 1000 && response.result) {
        await updateUser(response.result);
        Alert.alert(
          'Thành công',
          'Đã liên kết email thành công',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
        return true;
      } else {
        setErrors({ general: response.message || 'Liên kết email thất bại' });
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
    linkEmail,
    isLoading,
    errors,
    otpSent,
    countdown,
  };
};