import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { accountApi } from '@/services/api/account.api';
import { getErrorMessage } from '@/utils/messageMapping';

type Step = 'request' | 'verify' | 'reset';

interface ForgotPasswordErrors {
  phone?: string;
  email?: string;
  otp?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export function useForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCountdown = (seconds = 60) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCountdown(seconds);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Bước 1: Gửi OTP
  const requestPasswordReset = async (phone: string, email: string): Promise<boolean> => {
    setErrors({});

    if (!phone?.trim()) {
      setErrors({ phone: 'Vui lòng nhập số điện thoại' });
      return false;
    }
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Email không hợp lệ' });
      return false;
    }

    setIsLoading(true);
    try {
      await accountApi.requestPasswordReset({ phone, email });
      setStep('verify');
      startCountdown(60);
      return true;
    } catch (err: unknown) {
      setErrors({ general: getErrorMessage(err) });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Xác thực OTP
  const verifyOtp = async (phone: string, email: string, otp: string): Promise<boolean> => {
    setErrors({});

    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Vui lòng nhập mã OTP 6 số' });
      return false;
    }

    setIsLoading(true);
    try {
      await accountApi.verifyForgotOtp({ phone, email, otp });
      setStep('reset');
      return true;
    } catch (err: unknown) {
      setErrors({ otp: getErrorMessage(err) });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 3: Đặt mật khẩu mới
  const resetPassword = async (
    phone: string,
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<boolean> => {
    setErrors({});

    if (newPassword.length < 8) {
      setErrors({ password: 'Mật khẩu phải có ít nhất 8 ký tự' });
      return false;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Mật khẩu không khớp' });
      return false;
    }

    setIsLoading(true);
    try {
      await accountApi.verifyPasswordReset({ phone, email, otp, newPassword, confirmPassword });
      Alert.alert(
        'Thành công',
        'Đặt lại mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.',
        [{ text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login') }]
      );
      return true;
    } catch (err: unknown) {
      setErrors({ general: getErrorMessage(err) });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (phone: string, email: string) => {
    if (countdown > 0) return;
    await requestPasswordReset(phone, email);
    // Không setStep lại vì vẫn ở bước verify
    setStep('verify');
  };

  return {
    step,
    isLoading,
    errors,
    countdown,
    requestPasswordReset,
    verifyOtp,
    resetPassword,
    resendOtp,
  };
}