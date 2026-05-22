import { apiClient } from './client';
import type {
  ApiResponse,
  LinkPhoneRequest,
  LinkEmailRequest,
  UserResponse,
} from '../../types';

export const linkingApi = {
  /**
   * Link phone number to account
   */
  linkPhone: async (phone: string, otp: string): Promise<ApiResponse<UserResponse>> => {
    const payload: LinkPhoneRequest = {
      phone,
      otp,
    };
    return apiClient.post('/users/linking/phone', payload);
  },

  /**
   * Link email to account
   */
  linkEmail: async (email: string, otp: string): Promise<ApiResponse<UserResponse>> => {
    const payload: LinkEmailRequest = {
      email,
      otp,
    };
    return apiClient.post('/users/linking/email', payload);
  },
};