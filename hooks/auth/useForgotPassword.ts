// hooks/auth/useForgotPassword.ts
import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { accountApi } from '@/services/api/account.api';

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
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCountdown = (seconds: number) => {
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

  const requestOtp = async (phone: string, email: string) => {
    console.log('🔄 [requestOtp] called with:', { phone, email });

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
    console.log('📡 [requestOtp] Calling API...');

    try {
      const response = await accountApi.requestPasswordReset({ phone, email });
      console.log('📨 [requestOtp] API Response:', response);

      // Kiểm tra linh hoạt nhiều dạng response
      const isSuccess =
        response?.success === true ||
        response?.status === 'success' ||
        response?.ok === true ||
        response?.code === 200 ||
        (response?.message && response.message.toLowerCase().includes('sent'));

      if (isSuccess) {
        console.log('✅ OTP sent successfully!');
        setOtpSent(true);
        startCountdown(60);
        Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn');
        return true;
      } else {
        const msg = response?.message || 'Không thể gửi OTP';
        console.log('❌ API success = false:', msg);
        setErrors({ general: msg });
        return false;
      }
    } catch (error: any) {
      console.error('🚨 [requestOtp] Error:', error?.response?.data || error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Đã xảy ra lỗi khi gửi OTP';
      setErrors({ general: errorMessage });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (
    phone: string,
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    setErrors({});

    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Vui lòng nhập mã OTP 6 số' });
      return false;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrors({ password: 'Mật khẩu phải có ít nhất 8 ký tự' });
      return false;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Mật khẩu không khớp' });
      return false;
    }

    setIsLoading(true);

    try {
      const response = await accountApi.verifyPasswordReset({
        phone,
        email,
        otp,
        newPassword,
        confirmPassword,   // ← ĐÃ SỬA (trước là '')
      });

      if (response?.success) {
        Alert.alert(
          'Thành công',
          'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
        return true;
      } else {
        setErrors({ general: response?.message || 'Đặt lại mật khẩu thất bại' });
        return false;
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Đã xảy ra lỗi';
      setErrors({ general: errorMessage });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (phone: string, email: string) => {
    if (countdown > 0) return;
    return await requestOtp(phone, email);
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