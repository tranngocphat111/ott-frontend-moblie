import { chatApiClient } from '../client';
import type { ChatServiceUser } from './chat.types';

export const chatUserApi = {
  async getAllUsers(): Promise<ChatServiceUser[]> {
    return await chatApiClient.get('/users');
  },

  async getUserByPhone(phone: string): Promise<ChatServiceUser | null> {
    try {
      return await chatApiClient.get(`/users/phone/${phone}`);
    } catch (error) {
      return null;
    }
  },
  
  async getFriends(userId: string): Promise<ChatServiceUser[]> {
    return await chatApiClient.get(`/relationships/${userId}/friends`);
  },
};
