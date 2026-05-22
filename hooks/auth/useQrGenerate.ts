// hooks/auth/useQrGenerate.ts
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { qrApi } from '@/services/api/qr.api';
import { useAuth } from '@/contexts/Authcontext';
import type { QrCodeResponse, QrStatusResponse } from '@/types';
import { API_CONFIG } from '@/configuration/api';

const QR_EXPIRY_SECONDS = 120; // 2 minutes
type QrUiStatus = 'pending' | 'scanned' | 'confirmed' | 'expired' | 'cancelled';

const normalizeQrStatus = (status?: string): QrUiStatus => {
  switch (String(status || '').toUpperCase()) {
    case 'SCANNED':
      return 'scanned';
    case 'CONFIRMED':
      return 'confirmed';
    case 'EXPIRED':
      return 'expired';
    case 'CANCELLED':
      return 'cancelled';
    case 'PENDING':
    default:
      return 'pending';
  }
};

export const useQrGenerate = () => {
  const router = useRouter();
  const { setTokens } = useAuth();
  
  const [qrCode, setQrCode] = useState<QrCodeResponse | null>(null);
  const [status, setStatus] = useState<QrUiStatus>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [countdown, setCountdown] = useState(QR_EXPIRY_SECONDS);
  
  const wsRef = useRef<WebSocket | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const closeWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Generate QR Code
  const generateQr = async () => {
    closeWebSocket();
    setIsLoading(true);
    setError(undefined);
    
    try {
      const response = await qrApi.generateQrCode();
      
      if (response.code === 1000 && response.result) {
        setQrCode(response.result);
        setStatus(normalizeQrStatus(response.result.status));
        setCountdown(response.result.expirySeconds || QR_EXPIRY_SECONDS);
        
        // Start countdown
        startCountdown();
        
        return response.result;
      } else {
        setError(response.message || 'Không thể tạo mã QR');
        return null;
      }
    } catch (error: any) {
      setError(error.message || 'Đã xảy ra lỗi');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Start countdown timer
  const startCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          setStatus('expired');
          closeWebSocket();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stop countdown
  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Cancel QR
  const cancelQr = async () => {
    if (qrCode) {
      closeWebSocket();
      stopCountdown();
      
      try {
        await qrApi.cancelQrCode(qrCode.qrId);
        setStatus('cancelled');
      } catch (error) {
        console.error('Cancel QR error:', error);
      }
    }
  };

  // Refresh/Regenerate QR
  const refreshQr = async () => {
    if (qrCode) {
      await cancelQr();
    }
    await generateQr();
  };

  useEffect(() => {
    if (!qrCode?.qrId) return;

    const wsUrl = API_CONFIG.BASE_URL.replace(/^http/, 'ws') + `/auth/ws/qr?qrId=${qrCode.qrId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      try {
        const statusData = JSON.parse(event.data) as QrStatusResponse;
        const nextStatus = normalizeQrStatus(statusData.status);
        setStatus(nextStatus);

        if (nextStatus === 'confirmed') {
          closeWebSocket();
          stopCountdown();
          
          if (statusData.sessionToken && statusData.refreshToken) {
            await setTokens(statusData.sessionToken, statusData.refreshToken);
            router.replace('../(main)/(tabs)/home');
          }
        } else if (nextStatus === 'expired' || nextStatus === 'cancelled') {
          closeWebSocket();
          stopCountdown();
        }
      } catch (err) {
        console.error('Lỗi khi phân tích dữ liệu WebSocket:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('Lỗi WebSocket QR Code:', error);
      // Fallback is omitted but could poll here
    };

    return () => closeWebSocket();
  }, [qrCode?.qrId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeWebSocket();
      stopCountdown();
    };
  }, []);

  return {
    qrCode,
    status,
    isLoading,
    error,
    countdown,
    generateQr,
    cancelQr,
    refreshQr,
  };
};
