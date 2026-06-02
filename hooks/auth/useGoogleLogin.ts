import { GOOGLE_CONFIG } from '@/configuration/api';
import { useAuth } from '@/contexts/Authcontext';
import { authApi } from '@/services/api/auth.api';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const isRunningInExpoGo = Constants.appOwnership === 'expo';
type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');
let googleSigninModulePromise: Promise<GoogleSigninModule | null> | null = null;

const getGoogleSigninModule = async () => {
  if (isRunningInExpoGo) return null;

  googleSigninModulePromise ??= import('@react-native-google-signin/google-signin').catch((error) => {
    console.warn('[GoogleSignIn] Native module unavailable:', error?.message || error);
    return null;
  });

  return googleSigninModulePromise;
};

export const useGoogleLogin = () => {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isRunningInExpoGo) {
      console.log('🔑 Google native sign-in skipped in Expo Go');
      return;
    }

    void getGoogleSigninModule().then((googleModule) => {
      googleModule?.GoogleSignin.configure({
        webClientId: GOOGLE_CONFIG.CLIENT_ID,
        iosClientId: GOOGLE_CONFIG.IOS_CLIENT_ID || undefined,
        scopes: ['openid', 'profile', 'email'],
        offlineAccess: false,
      });
    });

    console.log('🔑 Google Web clientId:', GOOGLE_CONFIG.CLIENT_ID ? 'configured' : 'MISSING');
    console.log('🔑 Google Android clientId:', GOOGLE_CONFIG.ANDROID_CLIENT_ID ? 'configured' : 'MISSING');
  }, []);

  const handleGoogleAuth = async (tokens: { accessToken?: string; idToken?: string }) => {
    setIsLoading(true);
    setError(undefined);
    try {
      console.log('📤 Sending Google access token to backend...');
      const res = await authApi.googleAuthWithToken(tokens);

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
    setIsLoading(true);
    let googleStatusCodes: GoogleSigninModule['statusCodes'] | undefined;

    try {
      if (!GOOGLE_CONFIG.CLIENT_ID) {
        setError('Thiếu Google Web Client ID');
        return;
      }

      if (Platform.OS === 'android' && !GOOGLE_CONFIG.ANDROID_CLIENT_ID) {
        setError('Thiếu Google Android Client ID cho bản build Android');
        return;
      }

      const googleModule = await getGoogleSigninModule();
      if (!googleModule) {
        setError('Đăng nhập Google native cần development build, không chạy trong Expo Go');
        return;
      }

      const { GoogleSignin, statusCodes } = googleModule;
      googleStatusCodes = statusCodes;

      console.log('🚀 Opening native Google sign-in...');
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type === 'cancelled') {
        console.log('🚫 Google native sign-in cancelled by user');
        return;
      }

      const tokens = await GoogleSignin.getTokens();
      const accessToken = tokens.accessToken;
      const idToken = tokens.idToken || signInResult.data.idToken || undefined;

      console.log('✅ Google native accessToken received:', accessToken ? 'yes' : 'no');
      console.log('✅ Google native idToken received:', idToken ? 'yes' : 'no');

      if (!accessToken && !idToken) {
        setError('Không lấy được token từ Google');
        return;
      }

      await handleGoogleAuth({ accessToken, idToken });
    } catch (err: any) {
      console.error('❌ Cannot open Google login:', err);

      if (err?.code === googleStatusCodes?.SIGN_IN_CANCELLED || err?.code === 'SIGN_IN_CANCELLED') {
        return;
      }

      if (
        err?.code === googleStatusCodes?.PLAY_SERVICES_NOT_AVAILABLE ||
        err?.code === 'PLAY_SERVICES_NOT_AVAILABLE'
      ) {
        setError('Google Play Services chưa sẵn sàng trên thiết bị này');
        return;
      }

      if (err?.code === 'DEVELOPER_ERROR' || err?.message?.includes('DEVELOPER_ERROR')) {
        setError('Google Android Client ID chưa khớp package name hoặc SHA-1 của bản build');
        return;
      }

      setError(err?.message || 'Không thể mở đăng nhập Google');
    } finally {
      setIsLoading(false);
    }
  };

  return { loginWithGoogle, isLoading, error };
};
