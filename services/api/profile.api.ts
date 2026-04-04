import { apiClient } from './client';
import type {
  ApiResponse,
  UserProfileResponse,
  UpdateProfileRequest,
} from '../../types';

export const profileApi = {
  /**
   * Get current user profile
   */
  getCurrentProfile: async (): Promise<ApiResponse<UserProfileResponse>> => {
    return apiClient.get('/users/profile/me');
  },

  /**
   * Get user profile by ID
   */
  getProfile: async (userId: string): Promise<ApiResponse<UserProfileResponse>> => {
    return apiClient.get(`/users/profile/${userId}`);
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<UserProfileResponse>> => {
    return apiClient.put('/users/profile/me', data);
  },
};