import { apiClient, getDeviceInfo } from './client';
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
} from '../../types';
import { API_ENDPOINTS } from '../../configuration/api';

export const authApi = {

  localLogin: async (
    data: Omit<LocalLoginRequest, 'deviceId' | 'deviceType' | 'deviceName' | 'deviceInfo' | 'ipAddress' | 'location'>
  ): Promise<ApiResponse<AuthenticationResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload: LocalLoginRequest = {
      ...data,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.LOCAL_LOGIN, payload);
  },

  googleAuth: async (
    data: Omit<GoogleAuthRequest, 'deviceId' | 'deviceType' | 'deviceName' | 'deviceInfo' | 'ipAddress' | 'location'>
  ): Promise<ApiResponse<AuthenticationResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload: GoogleAuthRequest = {
      ...data,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.GOOGLE_AUTH, payload);
  },

  googleAuthWithToken: async (data: {
    idToken?: string;
    accessToken?: string;
  }): Promise<ApiResponse<AuthenticationResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload = {
      ...data,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.GOOGLE_AUTH_TOKEN, payload);
  },

  completeGoogleRegistration: async (
    data: Omit<CompleteGoogleRegistrationRequest, 'deviceId' | 'deviceType' | 'deviceName' | 'deviceInfo' | 'ipAddress' | 'location'>
  ): Promise<ApiResponse<AuthenticationResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload: CompleteGoogleRegistrationRequest = {
      ...data,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.GOOGLE_COMPLETE, payload);
  },

  request2FAOtp: async (
    data: Request2FAOtpRequest
  ): Promise<ApiResponse<OtpResponse>> => {
    return apiClient.post(API_ENDPOINTS.AUTH.REQUEST_2FA_OTP, data);
  },

  verify2FAOtp: async (
    data: Omit<Verify2FARequest, 'deviceId' | 'deviceType' | 'deviceInfo' | 'ipAddress'>
  ): Promise<ApiResponse<AuthenticationResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload: Verify2FARequest = {
      ...data,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.VERIFY_2FA, payload);
  },

  introspect: async (
    data: IntrospectRequest
  ): Promise<ApiResponse<IntrospectResponse>> => {
    return apiClient.post(API_ENDPOINTS.AUTH.INTROSPECT, data);
  },

  refresh: async (
    data: RefreshRequest
  ): Promise<ApiResponse<AuthenticationResponse>> => {
    return apiClient.post(API_ENDPOINTS.AUTH.REFRESH, data);
  },

  logout: async (
    data: LogoutRequest
  ): Promise<ApiResponse<void>> => {
    return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, data);
  },

  requestEmailOtpLogin: async (
    email: string
  ): Promise<ApiResponse<OtpResponse>> => {
    const deviceInfo = await getDeviceInfo();
    const payload = {
      email,
      ...deviceInfo,
    };
    return apiClient.post(API_ENDPOINTS.AUTH.REQUEST_EMAIL_OTP_LOGIN, payload);
  },

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
  }
};