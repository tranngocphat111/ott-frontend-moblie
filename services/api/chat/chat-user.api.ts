import { chatApiClient } from '../client';
import type { ChatServiceUser } from './chat.types';

export const chatUserApi = {
  async getAllUsers(): Promise<ChatServiceUser[]> {
    return await chatApiClient.get('/users');
  },

  async getUserByPhone(phone: string, requesterId?: string): Promise<ChatServiceUser | null> {
    try {
      const url = requesterId 
        ? `/users/phone/${encodeURIComponent(phone)}?requesterId=${encodeURIComponent(requesterId)}`
        : `/users/phone/${encodeURIComponent(phone)}`;
      const response = await chatApiClient.get<ChatServiceUser>(url);
      return response as any;
    } catch (error) {
      return null;
    }
  },
  
  async getFriends(userId: string): Promise<ChatServiceUser[]> {
    return await chatApiClient.get(`/relationships/${userId}/friends`);
  },

  async getUserById(userId: string): Promise<ChatServiceUser | null> {
    try {
      return await chatApiClient.get(`/users/${userId}`);
    } catch (error) {
      return null;
    }
  },
};
