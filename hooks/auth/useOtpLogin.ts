import { useAuth } from '@/contexts/Authcontext';
import { authApi } from '@/services/api/auth.api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

interface OtpLoginErrors {
  email?: string;
  otp?: string;
  general?: string;
}

export function useOtpLogin() {
  const router = useRouter();
  const { setTokens } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<OtpLoginErrors>({});
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

  const requestOtp = async (email: string) => {
    if (!email) {
      setErrors({ email: 'Vui lòng nhập email' });
      return false;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.requestEmailOtpLogin(email);

      console.log("OTP RESPONSE:", response);

      if (response.code === 1000) {
        setOtpSent(true);
        startCountdown(60);
        Alert.alert('Thành công', 'OTP đã được gửi đến email của bạn');
        return true;
      }

      setErrors({ general: response.message });
      return false;

    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Không thể gửi OTP';
      setErrors({ general: message });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    if (otp.length !== 6) {
      setErrors({ otp: 'Vui lòng nhập đủ 6 số OTP' });
      return false;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.verifyEmailOtpLogin({
        email,
        otpCode: otp,
      });

      console.log("VERIFY RESPONSE:", response);

      if (response.code === 1000 && response.result) {

        // ✅ SỬA QUAN TRỌNG Ở ĐÂY
        await setTokens(
          response.result.token,          // 🔥 ĐÚNG FIELD
          response.result.refreshToken    // 🔥 ĐÚNG FIELD
        );

        router.replace('/(main)/(tabs)/home');
        return true;
      }

      setErrors({ general: response.message });
      return false;

    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'OTP không hợp lệ';
      setErrors({ general: message });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (email: string) => {
    if (countdown > 0) return;
    return await requestOtp(email);
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