import { chatApiClient } from '../client';
import type { ChatParticipant } from '@/types/entities/chat';
import type { ChatCategory } from './chat.types';

export const chatParticipantApi = {
  async getConversationMembers(conversationId: string): Promise<ChatParticipant[]> {
    return await chatApiClient.get(`/participants/members/${conversationId}`);
  },

  async getUserCategories(userId: string): Promise<ChatCategory[]> {
    return await chatApiClient.get(`/categories/${userId}`);
  },

  async addMembers(
    conversationId: string,
    addedBy: string,
    userIds: string[],
  ): Promise<{ members: ChatParticipant[]; message?: any }> {
    return await chatApiClient.post('/conversations/add-member', {
      conversationId,
      addedBy,
      userIds,
    });
  },

  async updateConversationCategory(
    conversationId: string,
    userId: string,
    categoryId?: string | null,
  ): Promise<ChatParticipant> {
    return await chatApiClient.put('/participants/category', {
      conversationId,
      userId,
      categoryId: categoryId ?? null,
    });
  },

  async updateNotificationStatus(
    conversationId: string,
    userId: string,
    status: 'on' | 'mute' | 'off',
    muteUntil?: string | null,
  ): Promise<ChatParticipant> {
    return await chatApiClient.put('/participants/notification', {
      conversationId,
      userId,
      status,
      muteUntil: muteUntil ?? null,
    });
  },

  async updatePinStatus(
    conversationId: string,
    userId: string,
    isPinned: boolean,
  ): Promise<ChatParticipant> {
    return await chatApiClient.put('/participants/pin', {
      conversationId,
      userId,
      isPinned,
    });
  },

  async deleteConversationForMe(
    conversationId: string,
    userId: string,
  ): Promise<ChatParticipant> {
    return await chatApiClient.put('/participants/delete-conversation', {
      conversationId,
      userId,
    });
  },

  async leaveGroup(
    conversationId: string,
    userId: string,
  ): Promise<{ success?: boolean; message?: string }> {
    return await chatApiClient.delete(`/participants/leave/${conversationId}/${userId}`);
  },

  async updateMemberRole(
    conversationId: string,
    memberUserId: string,
    adminId: string,
    newRole: 'admin' | 'user',
  ): Promise<any> {
    return await chatApiClient.put(`/participants/role/${conversationId}/${memberUserId}`, {
      adminId,
      newRole,
    });
  },

  async updateMemberNickname(
    conversationId: string,
    memberUserId: string,
    requesterId: string,
    nickname: string,
  ): Promise<any> {
    return await chatApiClient.put(`/participants/nickname/${conversationId}/${memberUserId}`, {
      requesterId,
      nickname,
    });
  },

  async removeMember(
    conversationId: string,
    memberUserId: string,
    adminId: string,
  ): Promise<any> {
    return await chatApiClient.delete(`/participants/remove/${conversationId}/${memberUserId}`, {
      data: { adminId },
    });
  },

  async markAsRead(
    conversationId: string,
    userId: string,
    msgId: string,
  ): Promise<ChatParticipant> {
    return await chatApiClient.put('/participants/read', {
      conversationId,
      userId,
      msgId,
    });
  },
};
