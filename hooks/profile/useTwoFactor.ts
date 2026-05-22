import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { twoFactorApi } from '@/services/api/twoFactor.api';
import { useAuth } from '@/contexts/Authcontext';
import { getErrorMessage } from '@/utils/messageMapping';
import type { TwoFactorAuthStatus, Enable2FARequest, Disable2FARequest } from '@/types';

export function useTwoFactor() {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<TwoFactorAuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchStatus();
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

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const response = await twoFactorApi.getStatus();
      if (response.result) setStatus(response.result);
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Bật 2FA - bước 1: gửi OTP
  const requestEnableOtp = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await twoFactorApi.requestEnable();
      startCountdown(60);
    } catch (err: unknown) {
      const msg: string =
        (err as any)?.response?.data?.message ||
        (err as any)?.message || '';
      if (!msg.includes('password required') && !msg.includes('already enabled') && !msg.includes('đã được bật')) {
        Alert.alert('Lỗi', getErrorMessage(err));
      }
      throw err; 
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
      }
      return response.result; // có backupCodes
    } catch (err: unknown) {
      Alert.alert('Lỗi', getErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Tắt 2FA - bước 1: xác nhận mật khẩu → gửi OTP
  const requestDisableOtp = async (password: string): Promise<void> => {
    setIsLoading(true);
    try {
      await twoFactorApi.requestDisable({ password });
      startCountdown(60);
    } catch (err: unknown) {
      Alert.alert('Lỗi', getErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Tắt 2FA - bước 2: xác nhận OTP
  const disable = async (data: Disable2FARequest) => {
    setIsLoading(true);
    try {
      const response = await twoFactorApi.disable(data);
      await fetchStatus();
      await refreshUser();
      return response;
    } catch (err: unknown) {
      Alert.alert('Lỗi', getErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    status,
    isLoading,
    countdown,
    fetchStatus,
    requestEnableOtp,
    enable,
    requestDisableOtp,
    disable,
  };
}
