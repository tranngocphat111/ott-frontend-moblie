import { useState, useEffect, useRef, useCallback } from 'react';
import { qrApi } from '../services/api/qr.api';
import { QrCodeStatus } from '../types/enums';
import type { ApiError, QrCodeResponse, QrStatusResponse } from '../types';
import { useToast } from '../contexts/ToastContext';

export const useQRCode = () => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCode, setQrCode] = useState<QrCodeResponse | null>(null);
  const [qrStatus, setQrStatus] = useState<QrStatusResponse | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingRef = useRef<boolean>(false);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const checkQRStatus = useCallback(async (qrId: string) => {
    try {
      const response = await qrApi.checkQrStatus(qrId);

      if (response.result) {
        setQrStatus(response.result);
        return response.result;
      }
    } catch (err) {
      // Vẫn giữ nguyên: Không hiện Toast khi polling lỗi mạng để tránh spam
      console.error('Lỗi khi kiểm tra trạng thái QR:', err);
    }
    return null;
  }, []);

  const generateQRCode = useCallback(async () => {
    stopPolling();
    setLoading(true);
    setError('');
    setQrStatus(null);

    try {
      const response = await qrApi.generateQrCode();

      if (response.result) {
        setQrCode(response.result);
        return response.result;
      }

      throw new Error('Định dạng dữ liệu trả về không hợp lệ');
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Không thể tạo mã QR. Vui lòng kiểm tra lại kết nối.';

      setError(errorMessage);
      showToast(errorMessage, 'error', 'Lỗi tạo QR'); // Sử dụng custom toast

      throw err;
    } finally {
      setLoading(false);
    }
  }, [stopPolling, showToast]);

  const cancelQRCode = useCallback(async (qrId: string) => {
    stopPolling();
    try {
      await qrApi.cancelQrCode(qrId);
      showToast('Đã hủy mã QR thành công', 'success'); // Sử dụng custom toast
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Lỗi hệ thống: Không thể hủy mã QR lúc này.';

      showToast(errorMessage, 'error', 'Hủy thất bại'); // Sử dụng custom toast
      console.error('Cancel QR code error:', err);
    } finally {
      setQrCode(null);
      setQrStatus(null);
    }
  }, [stopPolling, showToast]);

  // Auto polling
  useEffect(() => {
    if (!qrCode?.qrId) return;

    isPollingRef.current = true;

    const poll = async () => {
      if (!isPollingRef.current) return;

      const status = await checkQRStatus(qrCode.qrId);

      if (status) {
        if (status.status === QrCodeStatus.CONFIRMED) {
          showToast('Giao dịch thành công!', 'success');
          stopPolling();
        } else if (status.status === QrCodeStatus.EXPIRED) {
          showToast('Mã QR đã hết hạn. Vui lòng tạo mã mới.', 'warning');
          stopPolling();
        } else if (status.status === QrCodeStatus.CANCELLED) {
          stopPolling();
        } else if (isPollingRef.current) {
          timeoutRef.current = setTimeout(poll, 2000);
        }
      } else if (isPollingRef.current) {
        timeoutRef.current = setTimeout(poll, 2000);
      }
    };

    poll();

    return () => stopPolling();
  }, [qrCode?.qrId, checkQRStatus, stopPolling, showToast]);

  return {
    qrCode,
    qrStatus,
    generateQRCode,
    checkQRStatus,
    cancelQRCode,
    loading,
    error,
    clearError: () => setError(''),
  };
};