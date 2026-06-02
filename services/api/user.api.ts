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

  searchUsers: async (query: string): Promise<UserResponse[]> => {
    return apiClient.get(`${API_ENDPOINTS.USERS.SEARCH}?q=${encodeURIComponent(query)}`);
  },
};