import { useState, useEffect } from 'react';
import { twoFactorApi } from '../services/api';
import type {
  TwoFactorAuthStatus,
  Enable2FARequest,
  Disable2FARequest
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SUCCESS_MESSAGES, getErrorMessage } from '../utils/messageMapping';

export const useTwoFactor = () => {
  const { refreshUser } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<TwoFactorAuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const response = await twoFactorApi.getStatus();
      if (response.result) {
        setStatus(response.result);
      }
    } catch (err: unknown) {
      // Fetch ngầm khi load trang nên không cần văng Toast lỗi để tránh phiền người dùng
      console.error('Failed to fetch 2FA status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const requestEnableOtp = async () => {
    setIsLoading(true);
    try {
      const response = await twoFactorApi.requestEnable();
      showToast(SUCCESS_MESSAGES.OTP_SENT || 'Mã OTP đã được gửi đến email của bạn', 'success', 'Đã gửi');
      return response.result;
    } catch (err: unknown) {
      const msg: string = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as { message?: string })?.message || '';

      // Không văng Toast lỗi nếu flow chỉ đang yêu cầu người dùng tạo password hoặc đã bật 2FA rồi
      if (!msg.includes('password required') && !msg.includes('already enabled') && !msg.includes('đã được bật')) {
        showToast(getErrorMessage(err), 'error', 'Lỗi');
      }

      throw err; // Vẫn throw để EnableFlow.tsx chuyển qua bước set-password
    } finally {
      setIsLoading(false);
    }
  };

  const enable = async (data: Enable2FARequest) => {
    setIsLoading(true);
    try {
      const response = await twoFactorApi.enable(data);
      if (response.result) {
        await fetchStatus();
        await refreshUser();
        showToast(SUCCESS_MESSAGES.TWO_FA_ENABLED || 'Xác thực 2 bước đã được bật!', 'success', 'Thành công');
      }
      return response.result;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Xác thực thất bại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestDisableOtp = async (password: string) => {
    setIsLoading(true);
    try {
      const response = await twoFactorApi.requestDisable({ password });
      showToast(SUCCESS_MESSAGES.OTP_SENT || 'Mã OTP đã được gửi đến email của bạn', 'success', 'Đã gửi');
      return response.result;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disable = async (data: Disable2FARequest) => {
    setIsLoading(true);
    try {
      const response = await twoFactorApi.disable(data);
      await fetchStatus();
      await refreshUser();
      showToast(SUCCESS_MESSAGES.TWO_FA_DISABLED || 'Xác thực 2 bước đã được tắt', 'info', 'Đã tắt');
      return response;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi tắt xác thực');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    isLoading,
    fetchStatus,
    requestEnableOtp,
    enable,
    requestDisableOtp,
    disable,
  };
};