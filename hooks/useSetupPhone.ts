import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

interface LocationState {
  tempToken: string;
  googleUserInfo?: GoogleUserInfo;
}

export const useSetupPhone = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithToken } = useAuth();
  const { showToast } = useToast();

  const state = location.state as LocationState;
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || phone.length < 10) {
      showToast('Vui lòng nhập số điện thoại hợp lệ (10–11 chữ số)', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.completeGoogleRegistration({
        tempToken: state.tempToken,
        phone,
      });
      if (response.result?.token && response.result?.refreshToken) {
        await loginWithToken(response.result.token, response.result.refreshToken);
        navigate('/home', { replace: true });
      }
    } catch (err: unknown) {
      showToast(
        (err as { message?: string })?.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
        'error', 'Lỗi'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    phone,
    setPhone,
    isLoading,
    handleSubmit,
    googleUserInfo: state?.googleUserInfo,
    isValidState: !!state?.tempToken,
  };
};