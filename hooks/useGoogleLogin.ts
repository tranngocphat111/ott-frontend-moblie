import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { GOOGLE_CONFIG } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage, SUCCESS_MESSAGES } from '../utils/messageMapping';

export const useGoogleLogin = () => {
  const { loginWithToken } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleGoogleCallback = async (code: string): Promise<boolean> => {
    try {
      const response = await authApi.googleAuth({
        code,
        redirectUri: GOOGLE_CONFIG.REDIRECT_URI
      });

      if (!response || !response.result) {
        throw new Error('Invalid response'); 
      }

      const result = response.result;

      if (result.requiresPhoneSetup && result.tempToken) {
        navigate('/setup-phone', {
          state: {
            tempToken: result.tempToken,
            googleUserInfo: result.googleUserInfo
          },
          replace: true
        });
        return true;
      }

      if (result.requires2FA && result.tempToken) {
        navigate('/verify-2fa', {
          state: { tempToken: result.tempToken },
          replace: true
        });
        return true;
      }

      if (result.authenticated && result.token && result.refreshToken) {
        await loginWithToken(result.token, result.refreshToken);
        
        showToast(SUCCESS_MESSAGES.LOGIN, 'success', 'Thành công');
        navigate('/home', { replace: true });
        return true;
      }

      showToast('Trạng thái xác thực không xác định', 'error', 'Lỗi hệ thống');
      navigate('/login', { replace: true });
      return false;

    } catch (err: unknown) {
      let errorMessage = getErrorMessage(err);
      
      const errorStr = JSON.stringify(err).toLowerCase();
      if (errorStr.includes('invalid_grant') || errorStr.includes('already used')) {
        errorMessage = 'Phiên đăng nhập Google đã hết hạn hoặc đã được sử dụng. Vui lòng thử lại.';
      }

      showToast(errorMessage, 'error', 'Đăng nhập Google thất bại');
      navigate('/login', { replace: true });
      return false;
    }
  };

  const initiateGoogleLogin = () => {
    const params = new URLSearchParams({
      client_id: GOOGLE_CONFIG.CLIENT_ID,
      redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  return {
    handleGoogleCallback,
    initiateGoogleLogin
  };
};