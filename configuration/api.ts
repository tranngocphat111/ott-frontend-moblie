import * as AuthSession from 'expo-auth-session';

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://18.142.137.171/riff/api',
  TIMEOUT: Number(process.env.EXPO_PUBLIC_TIMEOUT) || 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const CHAT_API_CONFIG = {
  BASE_URL: `${API_CONFIG.BASE_URL.replace(/\/$/, '')}/chat`,
  TIMEOUT: API_CONFIG.TIMEOUT,
  HEADERS: API_CONFIG.HEADERS,
};

export const MEDIA_API_CONFIG = {
  BASE_URL: `${API_CONFIG.BASE_URL.replace(/\/$/, '')}/media`,
  TIMEOUT: API_CONFIG.TIMEOUT,
  HEADERS: API_CONFIG.HEADERS,
};

export const MEDIA_SOCKET_CONFIG = {
  URL: process.env.EXPO_PUBLIC_MEDIA_SOCKET_URL || '',
};

export const LIVEKIT_CONFIG = {
  URL: process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://chat-service-wplw6oap.livekit.cloud',
  ENABLE_NATIVE: process.env.EXPO_PUBLIC_ENABLE_NATIVE_LIVEKIT !== 'false',
};

export const NOTIFICATION_API_CONFIG = {
  BASE_URL: API_CONFIG.BASE_URL,
  TIMEOUT: API_CONFIG.TIMEOUT,
  HEADERS: API_CONFIG.HEADERS,
};

export const MEDIA_CONFIG = {
  BASE_URL:
    process.env.EXPO_PUBLIC_MEDIA_URL ||
    'https://riff-storage-iuh.s3.ap-southeast-1.amazonaws.com',
};

export const GOOGLE_CONFIG = {
  CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  SCOPE: 'profile email openid',
  REDIRECT_URI: AuthSession.makeRedirectUri({
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'riff',
    path: 'auth/google',
  }),
};

export const APP_CONFIG = {
  NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Riff',
  VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
};

export const API_ENDPOINTS = {
  AUTH: {
    LOCAL_LOGIN: '/auth/login/local',
    REQUEST_EMAIL_OTP_LOGIN: '/auth/login/email-otp/request',
    VERIFY_EMAIL_OTP_LOGIN: '/auth/login/email-otp/verify',
    GOOGLE_AUTH: '/auth/login/google',
    GOOGLE_COMPLETE: '/auth/login/google/complete',
    REQUEST_2FA_OTP: '/auth/2fa/otp/request',
    VERIFY_2FA: '/auth/2fa/verify',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    INTROSPECT: '/auth/introspect',
    GOOGLE_AUTH_TOKEN: '/auth/login/google/token',
  },

  USERS: {
    REQUEST_REGISTER_OTP: '/users/register/otp',
    REGISTER: '/users/register',
  },
};
