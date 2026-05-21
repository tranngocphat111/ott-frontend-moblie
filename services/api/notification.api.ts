import axios from 'axios';
import { NOTIFICATION_API_CONFIG } from '@/configuration/api';
import * as SecureStore from 'expo-secure-store';

export interface InAppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  type: string;
  content: string;
  referenceId: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationApiClient = axios.create({
  baseURL: NOTIFICATION_API_CONFIG.BASE_URL,
  timeout: NOTIFICATION_API_CONFIG.TIMEOUT,
  headers: NOTIFICATION_API_CONFIG.HEADERS,
});

notificationApiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const NotificationApi = {
  getNotifications: async (userId: string): Promise<InAppNotification[]> => {
    try {
      const response = await notificationApiClient.get(`/notifications/inapp/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },
  
  markAsRead: async (notificationId: string): Promise<boolean> => {
    try {
      await notificationApiClient.put(`/notifications/inapp/${notificationId}/read`);
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  deleteNotification: async (notificationId: string): Promise<boolean> => {
    try {
      await notificationApiClient.delete(`/notifications/inapp/${notificationId}`);
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }
};

