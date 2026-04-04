import { apiClient } from './client';
import type {
  ApiResponse,
  SetPasswordRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  VerifyPasswordResetRequest,
  RequestChangeEmailOtpRequest,
  ChangeEmailRequest,
  RequestChangePhoneOtpRequest,
  ChangePhoneRequest,
  RequestDeleteAccountOtpRequest,
  DeleteAccountRequest,
  OtpResponse,
  PasswordChangeResponse,
  EmailChangeResponse,
  PhoneChangeResponse,
  AccountDeletionResponse,
} from '../../types';

export const accountApi = {
  // Password Management
  setPassword: async (data: SetPasswordRequest): Promise<ApiResponse<void>> => {
    return apiClient.post('/users/account/password/set', data);
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<PasswordChangeResponse>> => {
    return apiClient.post('/users/account/password/change', data);
  },

  requestPasswordReset: async (data: ForgotPasswordRequest): Promise<ApiResponse<OtpResponse>> => {
    return apiClient.post('/users/account/password/forgot/request', data);
  },

  verifyPasswordReset: async (data: VerifyPasswordResetRequest): Promise<ApiResponse<void>> => {
    return apiClient.post('/users/account/password/forgot/verify', data);
  },

  // Email Management
  requestChangeEmail: async (data: RequestChangeEmailOtpRequest): Promise<ApiResponse<OtpResponse>> => {
    return apiClient.post('/users/account/email/change/request', data);
  },

  changeEmail: async (data: ChangeEmailRequest): Promise<ApiResponse<EmailChangeResponse>> => {
    return apiClient.post('/users/account/email/change', data);
  },

  // Phone Management
  requestChangePhone: async (data: RequestChangePhoneOtpRequest): Promise<ApiResponse<OtpResponse>> => {
    return apiClient.post('/users/account/phone/change/request', data);
  },

  changePhone: async (data: ChangePhoneRequest): Promise<ApiResponse<PhoneChangeResponse>> => {
    return apiClient.post('/users/account/phone/change', data);
  },

  // Account Deletion
  requestDeleteAccount: async (data: RequestDeleteAccountOtpRequest): Promise<ApiResponse<OtpResponse>> => {
    return apiClient.post('/users/account/delete/request', data);
  },

  deleteAccount: async (data: DeleteAccountRequest): Promise<ApiResponse<AccountDeletionResponse>> => {
    return apiClient.delete('/users/account', { data });
  },
};