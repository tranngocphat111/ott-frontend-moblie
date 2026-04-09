import { useState } from 'react';
import { otpApi } from '../services/api/otp.api';
import type { ApiError } from '../types';
import { authApi } from '../services/api';

export const useOTP = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const requestLinkEmailOtp = async (email: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await otpApi.requestLinkEmailOtp(email);
      
      if (response.result) {
        startCountdown(60);
        return response.result;
      }
      
      throw new Error('Gửi OTP thất bại');
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const requestLinkPhoneOtp = async (phone: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await otpApi.requestLinkPhoneOtp(phone);
      
      if (response.result) {
        startCountdown(60);
        return response.result;
      }
      
      throw new Error('Gửi OTP thất bại');
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const requestEmailLoginOtp = async (email: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await authApi.requestEmailOtpLogin(email);
      
      if (response.result) {
        startCountdown(60);
        return response.result;
      }
      
      throw new Error('Gửi OTP thất bại');
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    requestLinkEmailOtp,
    requestLinkPhoneOtp,
    requestEmailLoginOtp,
    loading,
    error,
    countdown,
    clearError: () => setError('')
  };
};