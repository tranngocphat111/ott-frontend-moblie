// hooks/auth/useLogin.ts
import { useAuth } from '@/context/Authcontext';
import { authApi } from '@/services/api/auth.api';
import { useRouter } from 'expo-router';
import { useState } from 'react';

interface LoginErrors {
  phone?: string;
  password?: string;
  otp?: string;
  general?: string;
}

interface LoginResult {
  authenticated?: boolean;
  requires2FA?: boolean;
  tempToken?: string;
}

export function useLogin() {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});

  // ── Validation ──────────────────────────────────────────
  const validate = (phone: string, password: string): boolean => {
    const newErrors: LoginErrors = {};
    if (!phone) newErrors.phone = 'Vui lòng nhập số điện thoại';
    if (!password) newErrors.password = 'Vui lòng nhập mật khẩu';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  // ── Login ───────────────────────────────────────────────
  const login = async (phone: string, password: string): Promise<LoginResult | undefined> => {
    if (!validate(phone, password)) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.localLogin({ phone, password });

      if (response.code === 1000 && response.result) {
        const { token, refreshToken, requires2FA, tempToken } = response.result;

        // 2FA required
        if (requires2FA && tempToken) {
          return { requires2FA: true, tempToken };
        }

        // Đăng nhập thành công
        await setTokens(token, refreshToken);
        router.replace('/(main)/(tabs)/home');
        return { authenticated: true };
      }

      // Lỗi từ server
      const msg = getErrorMessage(response.code, response.message);
      setErrors({ general: msg });
    } catch (error: any) {
      setErrors({ general: error?.message || 'Đã xảy ra lỗi khi đăng nhập' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verify 2FA ──────────────────────────────────────────
  const verify2FA = async (tempToken: string, otpCode: string): Promise<LoginResult | undefined> => {
    if (!otpCode || otpCode.length !== 6) {
      setErrors({ otp: 'Vui lòng nhập đủ 6 chữ số' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.verify2FA({ tempToken, otpCode });

      if (response.code === 1000 && response.result) {
        const { token, refreshToken } = response.result;
        await setTokens(token, refreshToken);
        router.replace('/(main)/(tabs)/home');
        return { authenticated: true };
      }

      const msg = getErrorMessage(response.code, response.message);
      setErrors({ otp: msg });
    } catch (error: any) {
      setErrors({ otp: error?.message || 'Xác thực thất bại' });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend 2FA OTP ──────────────────────────────────────
  const request2FAOtp = async (phone: string) => {
    try {
      await authApi.request2FAOtp({ phone });
    } catch (error: any) {
      setErrors({ general: error?.message || 'Không thể gửi lại OTP' });
    }
  };

  return { login, verify2FA, request2FAOtp, isLoading, errors };
}

// ── Helper ──────────────────────────────────────────────
function getErrorMessage(code?: number, fallback?: string): string {
  switch (code) {
    case 1002: return 'Số điện thoại hoặc mật khẩu không đúng';
    case 1003: return 'Tài khoản chưa có mật khẩu. Vui lòng đăng nhập bằng Google hoặc OTP.';
    case 1004: return 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.';
    case 1005: return 'Mã OTP không đúng';
    case 1006: return 'Mã OTP đã hết hạn. Vui lòng gửi lại.';
    case 1007: return 'Nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.';
    default:   return fallback || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}