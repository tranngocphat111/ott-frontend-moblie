import { useAuth } from '@/contexts/Authcontext';
import { authApi } from '@/services/api/auth.api';
import { useRouter } from 'expo-router';
import { useState } from 'react';

interface LoginErrors {
  identifier?: string;
  password?: string;
  otp?: string;
  general?: string;
}

interface LoginResult {
  authenticated?: boolean;
  requires2FA?: boolean;
  tempToken?: string;
}

const LOGIN_CREDENTIAL_ERROR_MESSAGE = 'Tài khoản hoặc mật khẩu không chính xác';
const LOGIN_CREDENTIAL_ERROR_CODES = new Set([1002, 1100, 1200, 2001, 5001, 5002]);

export function useLogin() {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});

  const validate = (identifier: string, password: string): boolean => {
    const newErrors: LoginErrors = {};
    if (!identifier) newErrors.identifier = 'Vui lòng nhập số điện thoại hoặc email';
    if (!password) newErrors.password = 'Vui lòng nhập mật khẩu';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  // ── Login ───────────────────────────────────────────────
  const login = async (identifier: string, password: string): Promise<LoginResult | undefined> => {
    const normalizedIdentifier = identifier.trim();
    if (!validate(normalizedIdentifier, password)) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.localLogin({ identifier: normalizedIdentifier, password });

      if (response.code === 1000 && response.result) {
        const { token, refreshToken, requires2FA, tempToken } = response.result;

        // 2FA required
        if (requires2FA && tempToken) {
          return { requires2FA: true, tempToken };
        }

     
        if (token && refreshToken) {
          await setTokens(token, refreshToken);
          router.replace('/(main)/(tabs)/home');
          return { authenticated: true };
        }
      }

      // Lỗi từ server
      const msg = getLoginCredentialErrorMessage(response.code, response.message);
      setErrors({ general: msg });
    } catch (error: any) {
      setErrors({
        general: getLoginCredentialErrorMessage(
          error?.details?.code ?? error?.code,
          (error?.details?.message ?? error?.message) || 'Đã xảy ra lỗi khi đăng nhập'
        ),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verify2FA = async (tempToken: string, otpCode: string, isBackupCode = false): Promise<LoginResult | undefined> => {
    const expectedLength = isBackupCode ? 8 : 6;
    if (!otpCode || otpCode.length !== expectedLength) {
      setErrors({ otp: `Vui lòng nhập đủ ${expectedLength} chữ số` });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.verify2FAOtp({ tempToken, otpCode, isBackupCode });

      if (response.code === 1000 && response.result) {
        const { token, refreshToken } = response.result;
        if (token && refreshToken) {
          await setTokens(token, refreshToken);
          router.replace('/(main)/(tabs)/home');
          return { authenticated: true };
        }
      }

      const msg = getErrorMessage(response.code, response.message);
      setErrors({ otp: msg });
    } catch (error: any) {
      setErrors({ otp: getErrorMessage(error?.code, error?.message || 'Xác thực thất bại') });
    } finally {
      setIsLoading(false);
    }
  };

  const request2FAOtp = async (identifier: string) => {
    try {
      await authApi.request2FAOtp({ identifier });
    } catch (error: any) {
      setErrors({ general: error?.message || 'Không thể gửi lại OTP' });
    }
  };

  return { login, verify2FA, request2FAOtp, isLoading, errors };
}

function getLoginCredentialErrorMessage(code?: number, fallback?: string): string {
  if (code && LOGIN_CREDENTIAL_ERROR_CODES.has(code)) {
    return LOGIN_CREDENTIAL_ERROR_MESSAGE;
  }

  if (fallback && /phone|email|identifier|mật khẩu|password|không chính xác|format|định dạng/i.test(fallback)) {
    return LOGIN_CREDENTIAL_ERROR_MESSAGE;
  }

  return getErrorMessage(code, fallback);
}

function getErrorMessage(code?: number, fallback?: string): string {
  switch (code) {
    // ── Auth-service error codes ──
    case 1002: return 'Tài khoản không tồn tại.';
    case 1003: return 'Tài khoản chưa được kích hoạt.';
    case 1004: return 'Tài khoản của bạn đã bị khóa tạm thời.';
    case 1005: return 'Tài khoản này đã bị xóa.';
    case 1006: return 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.';
    case 1007: return 'Bạn không có quyền thực hiện hành động này.';
    case 2001: return 'Mật khẩu không chính xác.';
    case 2005: return 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
    case 2006: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    // ── OTP errors ──
    case 4001: return 'Mã OTP không tồn tại hoặc đã hết hạn.';
    case 4002: return 'Mã OTP này đã được sử dụng.';
    case 4003: return 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.';
    case 4004: return 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.';
    case 4005: return 'Bạn đã yêu cầu gửi OTP quá nhiều lần. Vui lòng thử lại sau.';
    case 4006: return 'Mã OTP không hợp lệ.';
    // ── Validation errors ──
    case 5001: return 'Định dạng số điện thoại không hợp lệ.';
    case 5002: return 'Định dạng email không hợp lệ.';
    // ── Backup code ──
    case 9999: return 'Mã backup code không hợp lệ.';
    default: return fallback || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}
