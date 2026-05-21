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

  // Build redirect URI - let Expo handle it automatically
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'riff',
    path: 'auth/google',
  });

  console.log('🔗 Google OAuth redirectUri:', redirectUri);
  console.log('🔑 Google OAuth clientId:', GOOGLE_CONFIG.CLIENT_ID ? 'configured' : 'MISSING');

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CONFIG.CLIENT_ID,
      scopes: ['profile', 'email', 'openid'],
      responseType: AuthSession.ResponseType.Token, // Implicit flow for mobile
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    console.log('📡 Google Auth Response:', JSON.stringify(response, null, 2));
    if (response?.type === 'success') {
      const accessToken = response.params?.access_token;
      console.log('✅ Google accessToken received:', accessToken ? 'yes' : 'no');
      if (accessToken) {
        handleGoogleAuth(accessToken);
      } else {
        setError('Không lấy được token từ Google');
      }
    } else if (response?.type === 'error') {
      console.log('❌ Google Auth Error:', JSON.stringify(response.error));
      setError(response.error?.message || 'Đăng nhập Google thất bại');
    } else if (response?.type === 'dismiss') {
      console.log('🚫 Google Auth dismissed by user');
    }
  }, [response]);

  const handleGoogleAuth = async (accessToken: string) => {
    setIsLoading(true);
    setError(undefined);
    try {
      console.log('📤 Sending Google access token to backend...');
      const res = await authApi.googleAuthWithToken({ accessToken });

      console.log('📥 Backend response code:', res.code);

      if (res.code === 1000 && res.result) {
        const { authenticated, requires2FA, requiresPhoneSetup, tempToken, token: appToken, refreshToken } = res.result;

        if (requires2FA && tempToken) {
          console.log('🔐 2FA required');
          router.push({ pathname: '/(auth)/verify-2fa', params: { tempToken } } as any);
        } else if (requiresPhoneSetup && tempToken) {
          console.log('📱 Phone setup required');
          router.push({ pathname: '/(auth)/setup-phone', params: { tempToken } });
        } else if (authenticated && appToken && refreshToken) {
          console.log('✅ Google login successful');
          await setTokens(appToken, refreshToken);
          router.replace('/(main)/(tabs)/home');
        } else {
          setError('Đăng nhập Google thất bại');
        }
      } else {
        setError(res.message || 'Đăng nhập Google thất bại');
      }
    } catch (err: any) {
      console.error('❌ Google auth error:', err);
      setError(err.message || 'Không thể kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setError(undefined);
    try {
      console.log('🚀 Opening Google login prompt...');
      console.log('🔗 Using redirectUri:', redirectUri);
      await promptAsync();
    } catch (err: any) {
      console.error('❌ Cannot open Google login:', err);
      setError('Không thể mở đăng nhập Google');
    }
  };

  return { loginWithGoogle, isLoading, error };
};
