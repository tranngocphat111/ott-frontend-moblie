// hooks/profile/useTwoFactor.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { twoFactorApi } from '@/services/api/twoFactor.api';

export function useTwoFactor() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await twoFactorApi.isEnabled();
      if (response.success && response.data !== undefined) {
        setIsEnabled(response.data);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kiểm tra trạng thái 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const requestEnable = async () => {
    try {
      const response = await twoFactorApi.requestEnable();
      if (response.success) {
        startCountdown(60);
        Alert.alert('Thành công', 'Mã OTP đã được gửi đến số điện thoại của bạn');
        return true;
      }
      return false;
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể gửi OTP');
      return false;
    }
  };

  const enable = async (otp: string) => {
    try {
      const response = await twoFactorApi.enable({ otp });
      if (response.success) {
        setIsEnabled(true);
        Alert.alert('Thành công', 'Đã bật xác thực 2 bước');
        return true;
      }
      return false;
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể bật 2FA');
      return false;
    }
  };

  const requestDisable = async () => {
    try {
      const response = await twoFactorApi.requestDisable({ reason: 'User request' });
      if (response.success) {
        startCountdown(60);
        Alert.alert('Thành công', 'Mã OTP đã được gửi đến số điện thoại của bạn');
        return true;
      }
      return false;
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể gửi OTP');
      return false;
    }
  };

  const disable = async (otp: string) => {
    try {
      const response = await twoFactorApi.disable({ otp });
      if (response.success) {
        setIsEnabled(false);
        Alert.alert('Thành công', 'Đã tắt xác thực 2 bước');
        return true;
      }
      return false;
    } catch (error: any) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể tắt 2FA');
      return false;
    }
  };

  return {
    isEnabled,
    isLoading,
    countdown,
    checkStatus,
    requestEnable,
    enable,
    requestDisable,
    disable,
  };
}