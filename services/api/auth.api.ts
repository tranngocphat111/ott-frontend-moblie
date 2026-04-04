// services/api/auth.api.ts

import { apiClient, getDeviceInfo } from './client';
import { API_CONFIG, API_ENDPOINTS } from '../../configuration/api';
import type {
  ApiResponse,
  LocalLoginRequest,
  GoogleAuthRequest,
  CompleteGoogleRegistrationRequest,
  Verify2FARequest,
  Request2FAOtpRequest,
  AuthenticationResponse,
  OtpResponse,
  RefreshRequest,
  LogoutRequest,
  IntrospectRequest,
  IntrospectResponse,
  CheckRestoreByPhoneRequest,
  CheckRestoreByEmailRequest,
  CheckRestoreByGoogleRequest,
  RestoreStatusResponse,
} from '../../types';

export const authApi = {
  
  localLogin: async (data: Omit<LocalLoginRequest, 'deviceId' | 'deviceType' | 'deviceName' | 'deviceInfo' | 'ipAddress' | 'location'>): Promise<ApiResponse<AuthenticationResponse>> => {
  try {
    const deviceInfo = await getDeviceInfo();
    const payload: LocalLoginRequest = {
      ...data,
      ...deviceInfo,
    };
    
    console.log('📤 Sending login request to:', `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.LOCAL_LOGIN}`);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOCAL_LOGIN, payload);
    
    console.log('📥 Response:', JSON.stringify(response, null, 2));
    
    return response;
  } catch (error: any) {
    console.error('💥 API Error:', error);
    console.error('💥 Error Response:', error.response?.data);
    console.error('💥 Error Status:', error.response?.status);
    console.error('💥 Error Config:', error.config);
    throw error;
  }
},

  // ✅ FIX: Made async and await getDeviceInfo()
  googleAuth: async (data: Omit<GoogleAuthRequest, 'deviceId' | 'deviceType' | 'deviceName' | 'deviceInfo' | 'ipAddress' | 'location'>): Promise<ApiResponse<AuthenticationResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload: GoogleAuthRequest = {
      ...data,
      ...deviceInfo,
    };

    console.log('Calling Google Auth API with:', {
      code: payload.code?.substring(0, 20),
      redirectUri: payload.redirectUri,
      deviceType: payload.deviceType
    });

    return apiClient.post(API_ENDPOINTS.AUTH.GOOGLE_AUTH, payload);
  },

  // ✅ FIX: Made async and await getDeviceInfo()
  completeGoogleRegistration: async (data: Omit<CompleteGoogleRegistrationRequest, 'deviceId' | 'deviceType' | 'deviceName' | 'deviceInfo' | 'ipAddress' | 'location'>): Promise<ApiResponse<AuthenticationResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload: CompleteGoogleRegistrationRequest = {
      ...data,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.GOOGLE_COMPLETE, payload);
  },

  request2FAOtp: async (data: Request2FAOtpRequest): Promise<ApiResponse<OtpResponse>> => {
    return apiClient.post(API_ENDPOINTS.AUTH.REQUEST_2FA_OTP, data);
  },

  // ✅ FIX: Made async and await getDeviceInfo()
  verify2FAOtp: async (data: Omit<Verify2FARequest, 'deviceId' | 'deviceType' | 'deviceInfo' | 'ipAddress'>): Promise<ApiResponse<AuthenticationResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload: Verify2FARequest = {
      ...data,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.VERIFY_2FA, payload);
  },

  introspect: async (data: IntrospectRequest): Promise<ApiResponse<IntrospectResponse>> => {
    return apiClient.post(API_ENDPOINTS.AUTH.INTROSPECT, data);
  },

  refresh: async (data: RefreshRequest): Promise<ApiResponse<AuthenticationResponse>> => {
    return apiClient.post(API_ENDPOINTS.AUTH.REFRESH, data);
  },

  logout: async (data: LogoutRequest): Promise<ApiResponse<void>> => {
    return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, data);
  },

  /**
   * Request OTP for email login
   */
  requestEmailOtpLogin: async (email: string): Promise<ApiResponse<OtpResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload = {
      email,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.REQUEST_EMAIL_OTP_LOGIN, payload);
  },

  /**
   * Verify email OTP and login
   */
  verifyEmailOtpLogin: async (data: {
    email: string;
    otpCode: string;
  }): Promise<ApiResponse<AuthenticationResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload = {
      ...data,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL_OTP_LOGIN, payload);
  },
};