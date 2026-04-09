import { chatApiClient } from '../client';
import type { ChatServiceUser } from './chat.types';

export const chatUserApi = {
  async getAllUsers(): Promise<ChatServiceUser[]> {
    return await chatApiClient.get('/users');
  },
};
