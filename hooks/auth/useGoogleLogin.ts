import { GOOGLE_CONFIG } from '@/configuration/api';
import { useAuth } from '@/contexts/Authcontext';
import { authApi } from '@/services/api/auth.api';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export const useGoogleLogin = () => {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CONFIG.CLIENT_ID,
      scopes: ['profile', 'email', 'openid'],
      responseType: AuthSession.ResponseType.Token, // ✅ Dùng implicit flow
      redirectUri: AuthSession.makeRedirectUri(),   // ✅ Để tự detect
    },
    discovery
  );

  useEffect(() => {
    console.log('📡 Response:', JSON.stringify(response));
    if (response?.type === 'success') {
      const accessToken = response.params?.access_token;
      console.log('✅ accessToken:', accessToken ? 'có' : 'không');
      if (accessToken) {
        handleGoogleAuth(accessToken);
      } else {
        setError('Không lấy được token từ Google');
      }
    } else if (response?.type === 'error') {
      console.log('❌ Error:', response.error);
      setError('Đăng nhập Google thất bại');
    }
  }, [response]);

  const handleGoogleAuth = async (accessToken: string) => {
    setIsLoading(true);
    setError(undefined);
    try {
      const res = await authApi.googleAuthWithToken({ accessToken });

      if (res.code === 1000 && res.result) {
        const { authenticated, requires2FA, requiresPhoneSetup, tempToken, token: appToken, refreshToken } = res.result;

        if (requires2FA && tempToken) {
          router.push({ pathname: '/(auth)/verify-2fa', params: { tempToken } });
        } else if (requiresPhoneSetup && tempToken) {
          router.push({ pathname: '/(auth)/setup-phone', params: { tempToken } });
        } else if (authenticated && appToken && refreshToken) {
          await setTokens(appToken, refreshToken);
          router.replace('/(main)/(tabs)/home');
        } else {
          setError('Đăng nhập Google thất bại');
        }
      } else {
        setError(res.message || 'Đăng nhập Google thất bại');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setError(undefined);
    try {
      await promptAsync();
    } catch (err: any) {
      setError('Không thể mở đăng nhập Google');
    }
  };

  return { loginWithGoogle, isLoading, error };
};