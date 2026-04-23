import { chatApiClient } from '../client';
import type { ChatConversationWithParticipant } from '@/types/entities/chat';
import type { ChatSearchOptions, ChatSearchResult } from './chat.types';

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
    payload: {
      name?: string;
      avatar?: string;
      background?: string;
      requesterId?: string;
    },
  ): Promise<any> {
    return await chatApiClient.put(`/conversations/${conversationId}`, payload);
  },

  async dissolveGroup(
    conversationId: string,
    userId: string,
  ): Promise<{ success: boolean; conversationId: string }> {
    return await chatApiClient.delete(`/conversations/${conversationId}/dissolve/${userId}`);
  },

  async searchEverything(
    userId: string,
    keyword: string,
    options?: ChatSearchOptions,
  ): Promise<ChatSearchResult> {
    const params = new URLSearchParams();
    params.set('q', keyword);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.senderId) params.set('senderId', options.senderId);

    return await chatApiClient.get(`/search/${encodeURIComponent(userId)}?${params.toString()}`);
  },

};
