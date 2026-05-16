import { chatApiClient } from '../client';
import type { ChatConversation, ChatConversationWithParticipant } from '@/types/entities/chat';
import type { ChatSearchOptions, ChatSearchResult } from './chat.types';

export const chatConversationApi = {
  async getUserConversations(userId: string): Promise<ChatConversationWithParticipant[]> {
    return await chatApiClient.get(`/participants/${userId}`);
  },

  async getConversationById(conversationId: string): Promise<ChatConversation> {
    const response = await chatApiClient.get<ChatConversation | { data?: ChatConversation }>(`/conversations/${conversationId}`);
    return ((response as any)?.data || response) as ChatConversation;
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

  async getInviteLink(conversationId: string, requesterId: string): Promise<string> {
    const response = (await chatApiClient.post(`/conversations/${conversationId}/invite-link`, {
      requesterId,
    })) as any;
    return response.inviteLink || response.invite_link || '';
  },

  async joinByInviteLink(
    token: string,
    userId: string,
  ): Promise<{ conversation: any; isNewJoin: boolean }> {
    return await chatApiClient.post('/conversations/join-by-link', { token, userId });
  },

  async getInviteLinkInfo(
    token: string,
    userId?: string,
  ): Promise<{ conversation: any; isMember: boolean }> {
    const url = userId
      ? `/conversations/invite-link/${token}?userId=${encodeURIComponent(userId)}`
      : `/conversations/invite-link/${token}`;
    return await chatApiClient.get(url);
  },

  async blockMember(
    conversationId: string,
    userId: string,
    adminId: string,
  ): Promise<{ success: boolean }> {
    return await chatApiClient.post(`/conversations/${conversationId}/block`, {
      userId,
      adminId,
    });
  },

  async unblockMember(
    conversationId: string,
    userId: string,
    adminId: string,
  ): Promise<{ success: boolean }> {
    return await chatApiClient.post(`/conversations/${conversationId}/unblock`, {
      userId,
      adminId,
    });
  },

  async getBlockedMembers(conversationId: string, requesterId: string): Promise<any[]> {
    return await chatApiClient.get(
      `/conversations/${conversationId}/blocked-members?requesterId=${requesterId}`,
    );
  },
};
