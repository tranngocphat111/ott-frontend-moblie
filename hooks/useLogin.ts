import { useState } from 'react';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SUCCESS_MESSAGES, getErrorMessage } from '../utils/messageMapping';

export type PhoneLoginStep = 'credentials' | '2fa';

export interface UsePhoneLoginReturn {
  step: PhoneLoginStep;
  phone: string;
  password: string;
  otpCode: string;
  loading: boolean;
  tempToken: string;
  setPhone: (v: string) => void;
  setPassword: (v: string) => void;
  setOtpCode: (v: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleVerify2FA: (e: React.FormEvent) => Promise<void>;
  handleResendOTP: () => Promise<void>;
  backToCredentials: () => void;
  use2FABackupCode: boolean;
  setUse2FABackupCode: (v: boolean) => void;
}

export const usePhoneLogin = (onSuccess: () => void): UsePhoneLoginReturn => {
  const { login, verify2FA, request2FAOtp } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<PhoneLoginStep>('credentials');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [use2FABackupCode, setUse2FABackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      showToast('Vui lòng nhập đầy đủ số điện thoại và mật khẩu', 'warning', 'Thiếu thông tin');
      return;
    }

    setLoading(true);
    try {
      const result = await login(phone, password);
      if (result.requires2FA && result.tempToken) {
        setTempToken(result.tempToken);
        setStep('2fa');
        showToast('Vui lòng nhập mã xác thực 2 lớp', 'info', 'Xác thực 2FA');
      } else if (result.authenticated) {
        showToast(SUCCESS_MESSAGES.LOGIN, 'success', 'Thành công');
        onSuccess();
      }
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      showToast('Vui lòng nhập mã xác thực', 'warning');
      return;
    }

    setLoading(true);
    try {
      const result = await verify2FA(tempToken, otpCode, use2FABackupCode);
      if (result.authenticated) {
        showToast(SUCCESS_MESSAGES.LOGIN, 'success', 'Thành công');
        onSuccess();
      }
    } catch (err: unknown) {
      // Nếu sai mã, xóa mã cũ để người dùng nhập lại
      setOtpCode('');
      showToast(getErrorMessage(err), 'error',
        use2FABackupCode ? 'Mã dự phòng sai' : 'Mã 2FA sai');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await request2FAOtp(phone);
      showToast(SUCCESS_MESSAGES.OTP_RESENT, 'success', 'Đã gửi lại');
      setOtpCode('');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Không thể gửi lại mã');
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setOtpCode('');
    setUse2FABackupCode(false);
  };

  return {
    step, phone, password, otpCode, loading, tempToken,
    setPhone, setPassword, setOtpCode, handleSubmit,
    handleVerify2FA, handleResendOTP, backToCredentials,
    use2FABackupCode, setUse2FABackupCode,
  };
};

export type EmailOtpStep = 'email' | 'otp';

export interface UseEmailOtpLoginReturn {
  step: EmailOtpStep;
  email: string;
  otpCode: string;
  loading: boolean;
  setEmail: (v: string) => void;
  setOtpCode: (v: string) => void;
  handleRequestOtp: (e: React.FormEvent) => Promise<void>;
  handleVerifyOtp: (e: React.FormEvent) => Promise<void>;
  backToEmail: () => void;
}

export const useEmailOtpLogin = (onSuccess: () => void): UseEmailOtpLoginReturn => {
  const { loginWithToken } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<EmailOtpStep>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate email cơ bản
    if (!email || !email.includes('@')) {
      showToast('Vui lòng nhập địa chỉ email hợp lệ', 'warning', 'Thông báo');
      return;
    }

    setLoading(true);
    try {
      await authApi.requestEmailOtpLogin(email);
      showToast(SUCCESS_MESSAGES.OTP_SENT, 'success', 'Đã gửi mã');
      setStep('otp');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Yêu cầu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      showToast('Mã OTP phải gồm 6 chữ số', 'warning', 'Chú ý');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyEmailOtpLogin({ email, otpCode });
      const { token, refreshToken } = res.result || {};

      if (token && refreshToken) {
        await loginWithToken(token, refreshToken);
        showToast(SUCCESS_MESSAGES.LOGIN, 'success', 'Thành công');
        onSuccess();
      } else {
        throw new Error('Dữ liệu xác thực không hợp lệ');
      }
    } catch (err: unknown) {
      setOtpCode('');
      showToast(getErrorMessage(err), 'error', 'Xác thực thất bại');
    } finally {
      setLoading(false);
    }
  };

  const backToEmail = () => {
    setStep('email');
    setOtpCode('');
  };

  return {
    step, email, otpCode, loading,
    setEmail, setOtpCode, handleRequestOtp,
    handleVerifyOtp, backToEmail,
  };
};