import { chatApiClient } from './client';
import type {
  ChatConversationWithParticipant,
  ChatMessage,
  ChatMessagesResponse,
  ChatOlderMessagesResponse,
  ChatParticipant,
} from '@/types';

export interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  content: string | string[];
  type?: 'text' | 'link' | 'image' | 'file' | 'video' | 'audio' | 'system_add';
  size?: number;
  fileName?: string;
  replyToMsgId?: string;
}

export interface ChatMessageContextResponse {
  success: boolean;
  conversationId: string;
  messageId: string;
  beforeCount: number;
  afterCount: number;
  messages: ChatMessage[];
  target?: ChatMessage | null;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
}

export interface ChatServiceUser {
  _id?: string;
  user_id: string;
  name?: string;
  avatar?: string;
  is_online?: boolean;
}

export interface ChatCategory {
  _id: string;
  user_id: string;
  name: string;
  color?: string;
  icon?: string;
  order?: number;
  is_default?: boolean;
}

export interface ChatLinkMessage {
  _id: string;
  msg_id?: string;
  sender_id?: string;
  sender_name?: string;
  createdAt?: string;
  created_at?: string;
  links: string[];
}

export class ChatApi {
  static async getAllUsers(): Promise<ChatServiceUser[]> {
    return await chatApiClient.get('/users');
  }

  static async getUserConversations(
    userId: string,
  ): Promise<ChatConversationWithParticipant[]> {
    return await chatApiClient.get(`/participants/${userId}`);
  }

  static async getConversationMembers(
    conversationId: string,
  ): Promise<ChatParticipant[]> {
    return await chatApiClient.get(`/participants/members/${conversationId}`);
  }

  static async getMessages(
    conversationId: string,
    userId?: string,
  ): Promise<ChatMessagesResponse> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return await chatApiClient.get(`/messages/${conversationId}${query}`);
  }

  static async getOlderMessages(
    conversationId: string,
    before: string,
    limit = 20,
    userId?: string,
  ): Promise<ChatOlderMessagesResponse> {
    const params = new URLSearchParams();
    params.set('before', before);
    params.set('limit', String(limit));
    if (userId) params.set('userId', userId);

    return await chatApiClient.get(
      `/conversations/${conversationId}/messages/older?${params.toString()}`,
    );
  }

  static async getMessageContext(
    conversationId: string,
    messageId: string,
    before = 20,
    after = 20,
    userId?: string,
  ): Promise<ChatMessageContextResponse> {
    const params = new URLSearchParams();
    params.set('messageId', messageId);
    params.set('before', String(before));
    params.set('after', String(after));
    if (userId) params.set('userId', userId);

    return await chatApiClient.get(
      `/conversations/${conversationId}/messages/around?${params.toString()}`,
    );
  }

  static async getPinnedMessages(conversationId: string): Promise<ChatMessage[]> {
    return await chatApiClient.get(`/messages/${conversationId}/pinned`);
  }

  static async getMediaMessages(
    conversationId: string,
    limit = 50,
    skip = 0,
  ): Promise<ChatMessage[]> {
    return await chatApiClient.get(
      `/messages/${conversationId}/media?limit=${encodeURIComponent(String(limit))}&skip=${encodeURIComponent(String(skip))}`,
    );
  }

  static async getFileMessages(
    conversationId: string,
    limit = 50,
    skip = 0,
  ): Promise<ChatMessage[]> {
    return await chatApiClient.get(
      `/messages/${conversationId}/files?limit=${encodeURIComponent(String(limit))}&skip=${encodeURIComponent(String(skip))}`,
    );
  }

  static async getLinkMessages(
    conversationId: string,
    limit = 50,
    skip = 0,
  ): Promise<ChatLinkMessage[]> {
    return await chatApiClient.get(
      `/messages/${conversationId}/links?limit=${encodeURIComponent(String(limit))}&skip=${encodeURIComponent(String(skip))}`,
    );
  }

  static async getUserCategories(userId: string): Promise<ChatCategory[]> {
    return await chatApiClient.get(`/categories/${userId}`);
  }

  static async updateConversationCategory(
    conversationId: string,
    userId: string,
    categoryId?: string | null,
  ): Promise<ChatParticipant> {
    return await chatApiClient.put('/participants/category', {
      conversationId,
      userId,
      categoryId: categoryId ?? null,
    });
  }

  static async updateNotificationStatus(
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
  }

  static async updatePinStatus(
    conversationId: string,
    userId: string,
    isPinned: boolean,
  ): Promise<ChatParticipant> {
    return await chatApiClient.put('/participants/pin', {
      conversationId,
      userId,
      isPinned,
    });
  }

  static async deleteConversationForMe(
    conversationId: string,
    userId: string,
  ): Promise<ChatParticipant> {
    return await chatApiClient.put('/participants/delete-conversation', {
      conversationId,
      userId,
    });
  }

  static async leaveGroup(conversationId: string, userId: string): Promise<{ success?: boolean; message?: string }> {
    return await chatApiClient.delete(`/participants/leave/${conversationId}/${userId}`);
  }

  static async sendMessage(payload: SendMessagePayload): Promise<ChatMessage> {
    return await chatApiClient.post('/messages', payload);
  }

  static async reactToMessage(
    conversationId: string,
    msgId: string,
    userId: string,
    reactionType: string,
  ): Promise<ChatMessage> {
    return await chatApiClient.put(`/messages/${msgId}/reaction`, {
      conversationId,
      userId,
      reactionType,
    });
  }

  static async revokeMessage(
    conversationId: string,
    msgId: string,
    userId: string,
  ): Promise<ChatMessage> {
    return await chatApiClient.put(`/messages/${msgId}/revoke`, {
      conversationId,
      userId,
    });
  }

  static async deleteMessage(
    conversationId: string,
    msgId: string,
    userId: string,
  ): Promise<ChatMessage> {
    return await chatApiClient.put(`/messages/${msgId}/delete`, {
      conversationId,
      userId,
    });
  }

  static async pinMessage(
    conversationId: string,
    msgId: string,
    userId: string,
    isPinned: boolean,
  ): Promise<ChatMessage> {
    return await chatApiClient.put(`/messages/${msgId}/pin`, {
      conversationId,
      userId,
      isPinned,
    });
  }

  static async markAsRead(
    conversationId: string,
    userId: string,
    msgId: string,
  ): Promise<ChatParticipant> {
    return await chatApiClient.put('/participants/read', {
      conversationId,
      userId,
      msgId,
    });
  }
}
