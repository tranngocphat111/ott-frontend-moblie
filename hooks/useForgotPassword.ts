import { useState } from 'react';
import { accountApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { SUCCESS_MESSAGES, getErrorMessage, ERROR_MESSAGES } from '../utils/messageMapping';

export const useForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const requestPasswordReset = async (phone: string, email: string): Promise<boolean> => {
    if (!phone || !email) {
      showToast(ERROR_MESSAGES[1070] || 'Vui lòng cung cấp cả số điện thoại và email.', 'warning', 'Thông báo');
      return false;
    }

    setLoading(true);
    try {
      await accountApi.requestPasswordReset({ phone, email });
      showToast(SUCCESS_MESSAGES.OTP_SENT, 'success', 'Đã gửi mã');
      return true;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Gửi yêu cầu thất bại');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (phone: string, email: string, otp: string): Promise<boolean> => {
    if (otp.length !== 6) {
      showToast('Vui lòng nhập đầy đủ mã OTP 6 số', 'warning', 'Thông báo');
      return false;
    }

    setLoading(true);
    try {
      await accountApi.verifyForgotOtp({ phone, email, otp });
      return true;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Xác thực OTP thất bại');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    phone: string,
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<boolean> => {
    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'warning', 'Chú ý');
      return false;
    }

    if (newPassword.length < 8) {
      showToast(ERROR_MESSAGES[1302], 'warning', 'Mật khẩu yếu');
      return false;
    }

    setLoading(true);
    try {
      await accountApi.verifyPasswordReset({
        phone,
        email,
        otp,
        newPassword,
        confirmPassword,
      });

      showToast('Đặt lại mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.', 'success', 'Thành công');
      return true;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi đặt lại mật khẩu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, requestPasswordReset, verifyOtp, resetPassword };
};