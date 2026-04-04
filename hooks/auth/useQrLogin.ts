// hooks/auth/useQrLogin.ts
import { qrApi } from '@/services/api/qr.api';
import { useState } from 'react';
import { Alert } from 'react-native';

export function useQrLogin() {
  const [isLoading, setIsLoading] = useState(false);

  const scanQr = async (qrData: string) => {
    setIsLoading(true);
    try {
      const response = await qrApi.scanQrCode(qrData);

      if (response.result) {
        return { qrId: response.result.qrId };
      }

      Alert.alert('Lỗi', response.message || 'Mã QR không hợp lệ');
      return null;
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Đã xảy ra lỗi khi quét QR');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmQr = async (qrId: string, confirmed: boolean) => {
    setIsLoading(true);
    try {
      const response = await qrApi.confirmQrLogin(qrId, confirmed);

      if (response.result) {
        return true;
      }

      Alert.alert('Lỗi', response.message || 'Không thể xác nhận đăng nhập');
      return false;
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Đã xảy ra lỗi khi xác nhận');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { scanQr, confirmQr, isLoading };
}