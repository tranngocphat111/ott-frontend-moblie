import { chatApiClient } from '../client';
import type { ChatConversationWithParticipant } from '@/types/entities/chat';
import type { ChatSearchResult } from './chat.types';

export const chatConversationApi = {
  async getUserConversations(userId: string): Promise<ChatConversationWithParticipant[]> {
    return await chatApiClient.get(`/participants/${userId}`);
  },

  async createConversation(payload: {
    creatorId: string;
    type: 'private' | 'group';
    memberIds?: string[];
    name?: string;
    avatar?: string;
  }): Promise<any> {
    return await chatApiClient.post('/conversations', payload);
  },

  async updateConversation(
    conversationId: string,
    payload: { name?: string; avatar?: string },
  ): Promise<any> {
    return await chatApiClient.put(`/conversations/${conversationId}`, payload);
  },

  async searchEverything(userId: string, keyword: string): Promise<ChatSearchResult> {
    return await chatApiClient.get(
      `/search/${encodeURIComponent(userId)}?keyword=${encodeURIComponent(keyword)}`,
    );
  },
};
