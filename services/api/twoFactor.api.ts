import { apiClient } from './client';
import type {
  ApiResponse,
  Request2FAEnableOtpRequest,
  Enable2FARequest,
  Request2FADisableOtpRequest,
  Disable2FARequest,
  OtpResponse,
  Enable2FAResponse,
  TwoFactorAuthStatus,
} from '../../types';

export const twoFactorApi = {
  requestEnable: async (data?: Request2FAEnableOtpRequest): Promise<ApiResponse<OtpResponse>> => {
    return apiClient.post('/users/2fa/enable/request', data || {});
  },

  enable: async (data: Enable2FARequest): Promise<ApiResponse<Enable2FAResponse>> => {
    return apiClient.post('/users/2fa/enable', data);
  },

  requestDisable: async (data: Request2FADisableOtpRequest): Promise<ApiResponse<OtpResponse>> => {
    return apiClient.post('/users/2fa/disable/request', data);
  },

  disable: async (data: Disable2FARequest): Promise<ApiResponse<void>> => {
    return apiClient.post('/users/2fa/disable', data);
  },

  getStatus: async (): Promise<ApiResponse<TwoFactorAuthStatus>> => {
    return apiClient.get('/users/2fa/status');
  },

  isEnabled: async (): Promise<ApiResponse<boolean>> => {
    return apiClient.get('/users/2fa/enabled');
  },
};