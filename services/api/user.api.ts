// services/api/user.api.ts

import { apiClient, getDeviceInfo } from './client';
import type {
  ApiResponse,
  RequestRegisterOtpRequest,
  RegisterRequest,
  UserResponse,
  OtpResponse,
} from '../../types';
import { API_ENDPOINTS } from '../../configuration/api';

export const userApi = {
  /**
   * Request OTP for registration
   */
  requestRegisterOtp: async (
    phone: string,
    email: string,
    fullName: string
  ): Promise<ApiResponse<OtpResponse>> => {
    const payload: RequestRegisterOtpRequest = {
      phone,
      email,
      fullName,
      ...getDeviceInfo(),
    };
    return apiClient.post(API_ENDPOINTS.USERS.REQUEST_REGISTER_OTP, payload);
  },

  /**
   * Complete registration with OTP
   */
  register: async (data: {
    phone: string;
    email: string;
    password: string;
    fullName: string;
    otp: string;
  }): Promise<ApiResponse<UserResponse>> => {
    const payload: RegisterRequest = {
      ...data,
      ...getDeviceInfo(),
    };
    return apiClient.post(API_ENDPOINTS.USERS.REGISTER, payload);
  },
};