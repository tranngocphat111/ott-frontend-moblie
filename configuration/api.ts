// configuration/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.6:8080/riff/api',
  TIMEOUT: Number(process.env.EXPO_PUBLIC_TIMEOUT) || 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const CHAT_API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_CHAT_API_URL || 'http://192.168.1.3:5000/api',
  TIMEOUT: Number(process.env.EXPO_PUBLIC_TIMEOUT) || 30000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
};

export const MEDIA_CONFIG = {
  BASE_URL:
    process.env.EXPO_PUBLIC_MEDIA_URL ||
    'https://riff-storage-iuh.s3.ap-southeast-1.amazonaws.com/',
};

export const GOOGLE_CONFIG = {
  // Web Client ID — dùng cho Expo Go
  CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  // Mobile Client IDs — tạo riêng trên Google Console
  IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  SCOPE: 'profile email openid',
};

export const APP_CONFIG = {
  NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Riff',
  VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
};

export const API_ENDPOINTS = {
  AUTH: {
    LOCAL_LOGIN: '/auth/login/local',
    GOOGLE_AUTH: '/auth/login/google',
    GOOGLE_AUTH_TOKEN: '/auth/login/google/token',
    GOOGLE_COMPLETE: '/auth/login/google/complete',
    REQUEST_2FA_OTP: '/auth/2fa/otp/request',
    VERIFY_2FA: '/auth/2fa/verify',
    INTROSPECT: '/auth/introspect',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    REQUEST_EMAIL_OTP_LOGIN: '/auth/login/email-otp/request',
    VERIFY_EMAIL_OTP_LOGIN: '/auth/login/email-otp/verify',
  },
};