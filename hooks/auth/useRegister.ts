// hooks/auth/useRegister.ts
import { useAuth } from '@/contexts/Authcontext';
import { authApi } from '@/services/api/auth.api';
import { userApi } from '@/services/api/user.api';
import { useRouter } from 'expo-router';
import { useState } from 'react';

interface RegisterData {
  phone: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  otp: string;
}

interface RegisterErrors {
  phone?: string;
  email?: string;
  fullName?: string;
  password?: string;
  confirmPassword?: string;
  otp?: string;
  general?: string;
}

const OTP_RESEND_SECONDS = 60;

export const useRegister = () => {
  const router = useRouter();
  const { setTokens } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const validatePhone = (v: string) => {
    if (!v) return 'Vui lòng nhập số điện thoại';
    if (!/^(0|\+84)[0-9]{9,10}$/.test(v)) return 'Số điện thoại không hợp lệ';
  };
  const validateEmail = (v: string) => {
    if (!v) return 'Vui lòng nhập email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email không hợp lệ';
  };
  const validateFullName = (v: string) => {
    if (!v) return 'Vui lòng nhập họ tên';
    if (v.length < 2) return 'Họ tên quá ngắn';
    if (v.length > 100) return 'Họ tên quá dài';
  };
  const validatePassword = (v: string) => {
    if (!v) return 'Vui lòng nhập mật khẩu';
    if (v.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
  };
  const validateConfirmPassword = (p: string, c: string) => {
    if (!c) return 'Vui lòng xác nhận mật khẩu';
    if (p !== c) return 'Mật khẩu không khớp';
  };
  const validateOtp = (v: string) => {
    if (!v) return 'Vui lòng nhập mã OTP';
    if (v.length !== 6) return 'Mã OTP phải có 6 chữ số';
  };

  const startCountdown = (seconds = OTP_RESEND_SECONDS) => {
    setCountdown(seconds);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Bước 1: Validate tất cả fields rồi gửi OTP
  const requestOtp = async (
    phone: string,
    email: string,
    fullName: string,
    password: string,
    confirmPassword: string,
  ): Promise<boolean> => {
    setIsLoading(true);
    setErrors({});

    const phoneError = validatePhone(phone);
    const emailError = validateEmail(email);
    const fullNameError = validateFullName(fullName);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

    if (phoneError || emailError || fullNameError || passwordError || confirmPasswordError) {
      setErrors({
        phone: phoneError,
        email: emailError,
        fullName: fullNameError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      setIsLoading(false);
      return false;
    }

    try {
      const response = await userApi.requestRegisterOtp(phone, email, fullName);

      if (response.result) {
        setOtpSent(true);
        startCountdown();
        return true;
      }

      setErrors({ general: response.message || 'Không thể gửi OTP' });
      return false;
    } catch (error: any) {
      setErrors({ general: error.message || 'Đã xảy ra lỗi khi gửi OTP' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi lại OTP
  const resendOtp = async (
    phone: string,
    email: string,
    fullName: string,
    password: string,
    confirmPassword: string,
  ): Promise<boolean> => {
    if (countdown > 0) return false;
    return requestOtp(phone, email, fullName, password, confirmPassword);
  };

  // Bước 2: Xác thực OTP → đăng ký → auto đăng nhập
  const register = async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setErrors({});

    const otpError = validateOtp(data.otp);
    if (otpError) {
      setErrors({ otp: otpError });
      setIsLoading(false);
      return false;
    }

    try {
      const registerResponse = await userApi.register({
        phone: data.phone,
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        otp: data.otp,
      });

      if (!registerResponse.result) {
        setErrors({ general: registerResponse.message || 'Đăng ký thất bại' });
        return false;
      }

      // Auto login sau khi đăng ký thành công
      try {
        const loginResponse = await authApi.localLogin({
          phone: data.phone,
          password: data.password,
        });

        if (loginResponse.result?.token && loginResponse.result?.refreshToken) {
          await setTokens(loginResponse.result.token, loginResponse.result.refreshToken);
          router.replace('/(tabs)/home');
          return true;
        }
      } catch {
        // fallback về login nếu auto login lỗi
      }

      router.replace('/(auth)/login');
      return true;
    } catch (error: any) {
      setErrors({ general: error.message || 'Đã xảy ra lỗi khi đăng ký' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    errors,
    otpSent,
    countdown,
    requestOtp,
    resendOtp,
    register,
  };
};