// hooks/auth/useQrGenerate.ts
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { qrApi } from '@/services/api/qr.api';
import { useAuth } from '@/context/Authcontext';
import type { QrCodeResponse, QrStatusResponse } from '@/types';

const POLLING_INTERVAL = 2000; // 2 seconds
const QR_EXPIRY_SECONDS = 120; // 2 minutes

export const useQrGenerate = () => {
  const router = useRouter();
  const { setTokens } = useAuth();
  
  const [qrCode, setQrCode] = useState<QrCodeResponse | null>(null);
  const [status, setStatus] = useState<'pending' | 'scanned' | 'confirmed' | 'expired' | 'cancelled'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [countdown, setCountdown] = useState(QR_EXPIRY_SECONDS);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate QR Code
  const generateQr = async () => {
    setIsLoading(true);
    setError(undefined);
    
    try {
      const response = await qrApi.generateQrCode();
      
      if (response.code === 1000 && response.result) {
        setQrCode(response.result);
        setStatus(response.result.status);
        setCountdown(response.result.expirySeconds || QR_EXPIRY_SECONDS);
        
        // Start polling
        startPolling(response.result.qrId);
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
          stopPolling();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Poll QR status
  const pollStatus = async (qrId: string) => {
    try {
      const response = await qrApi.checkQrStatus(qrId);
      
      if (response.code === 1000 && response.result) {
        const statusData: QrStatusResponse = response.result;
        setStatus(statusData.status);
        
        // Handle different statuses
        if (statusData.status === 'confirmed') {
          // QR confirmed - login successful
          stopPolling();
          stopCountdown();
          
          if (statusData.sessionToken && statusData.refreshToken) {
            await setTokens(statusData.sessionToken, statusData.refreshToken);
            router.replace('../(main)/(tabs)/home');
          }
        } else if (statusData.status === 'expired' || statusData.status === 'cancelled') {
          stopPolling();
          stopCountdown();
        }
      }
    } catch (error: any) {
      console.error('Polling error:', error);
      // Don't stop polling on error, continue trying
    }
  };

  // Start polling
  const startPolling = (qrId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      pollStatus(qrId);
    }, POLLING_INTERVAL);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
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
      stopPolling();
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
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