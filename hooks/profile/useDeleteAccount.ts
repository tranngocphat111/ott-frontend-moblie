import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { accountApi } from '@/services/api/account.api';
import { useAuth } from '@/contexts/Authcontext';

type DeleteAccountStep = 'warning' | 'confirm' | 'otp';

interface DeleteAccountErrors {
  password?: string;
  confirmText?: string;
  otp?: string;
  general?: string;
}

export const useDeleteAccount = () => {
  const router = useRouter();
  const { logout, user } = useAuth();

  const [step, setStep] = useState<DeleteAccountStep>('warning');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<DeleteAccountErrors>({});
  const [countdown, setCountdown] = useState(0);

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const requestOtp = async () => {
    const normalized = confirmText.trim().toUpperCase();
    if (normalized !== 'DELETE') {
      setErrors({ confirmText: 'Vui lòng nhập chính xác: DELETE' });
      return;
    }
    if (user?.hasPassword && !password.trim()) {
      setErrors({ password: 'Vui lòng nhập mật khẩu' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      await accountApi.requestDeleteAccount({
        password: user?.hasPassword ? password : undefined,
      });
      setStep('otp');
      setCountdown(60);
      setConfirmText('');
    } catch (error: any) {
      const msg: string = error?.message || 'Đã xảy ra lỗi';
      if (msg.includes('mật khẩu') || msg.includes('password')) {
        setErrors({ password: 'Mật khẩu không đúng. Vui lòng thử lại.' });
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    setErrors({});
    try {
      await accountApi.requestDeleteAccount({});
      setOtp('');
      setCountdown(60);
    } catch (error: any) {
      setErrors({ general: error?.message || 'Không thể gửi lại OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Mã OTP phải có 6 chữ số' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      await accountApi.deleteAccount({ otp });
      Alert.alert(
        'Xóa tài khoản thành công',
        'Tài khoản của bạn đã được xóa vĩnh viễn.',
        [{ text: 'OK', onPress: async () => { await logout(); } }]
      );
    } catch (error: any) {
      setErrors({ general: error?.message || 'Xóa tài khoản thất bại' });
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  const goToConfirm = () => setStep('confirm');
  const backToWarning = () => { setStep('warning'); setErrors({}); };
  const backToConfirm = () => { setStep('confirm'); setOtp(''); setErrors({}); };

  return {
    step,
    isLoading,
    errors,
    countdown,
    password, setPassword,
    confirmText, setConfirmText,
    otp, setOtp,
    requestOtp,
    resendOtp,
    deleteAccount,
    goToConfirm,
    backToWarning,
    backToConfirm,
  };
};