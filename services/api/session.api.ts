import { apiClient } from './client';
import type { ApiResponse, UserSessionsResponse } from '../../types';

export const sessionApi = {
  getUserSessions: async (): Promise<ApiResponse<UserSessionsResponse>> => {
    return apiClient.get('/users/sessions');
  },

  revokeSession: async (sessionId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/users/sessions/${sessionId}`);
  },

  revokeAllOtherSessions: async (): Promise<ApiResponse<void>> => {
    return apiClient.delete('/users/sessions/others');
  },

  revokeAllSessions: async (): Promise<ApiResponse<void>> => {
    return apiClient.delete('/users/sessions/all');
  },
};