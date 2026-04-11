import { chatApiClient } from '../client';
import type {
  ChatMessage,
  ChatMessagesResponse,
  ChatOlderMessagesResponse,
} from '@/types/entities/chat';
import type {
  ChatLinkMessage,
  ChatMessageContextResponse,
  ChatPresignedUrlResponse,
  SendMessagePayload,
} from './chat.types';

export const chatMessageApi = {
  async getMessages(
    conversationId: string,
    userId?: string,
  ): Promise<ChatMessagesResponse> {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return await chatApiClient.get(`/conversations/${conversationId}/messages${query}`);
  },

  async getMessagePresignedUrl(
    fileName: string,
    fileType: string,
  ): Promise<ChatPresignedUrlResponse> {
    return await chatApiClient.post('/messages/presigned-url', { fileName, fileType });
  },

  async uploadFileToS3(
    uploadUrl: string,
    uri: string,
    contentType: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    const response = await fetch(uri);
    const blob = await response.blob();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress?.(Math.max(0, Math.min(100, percent)));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve();
          return;
        }

        reject(new Error(`S3 upload failed: ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('S3 upload failed: network error'));
      xhr.onabort = () => reject(new Error('S3 upload aborted'));

      xhr.send(blob);
    });
  },

  async getOlderMessages(
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
  },

  async getMessageContext(
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
  },

  async getPinnedMessages(conversationId: string): Promise<ChatMessage[]> {
    return await chatApiClient.get(`/messages/${conversationId}/pinned`);
  },

  async getMediaMessages(
    conversationId: string,
    limit = 50,
    skip = 0,
  ): Promise<ChatMessage[]> {
    return await chatApiClient.get(
      `/messages/${conversationId}/media?limit=${encodeURIComponent(String(limit))}&skip=${encodeURIComponent(String(skip))}`,
    );
  },

  async getFileMessages(
    conversationId: string,
    limit = 50,
    skip = 0,
  ): Promise<ChatMessage[]> {
    return await chatApiClient.get(
      `/messages/${conversationId}/files?limit=${encodeURIComponent(String(limit))}&skip=${encodeURIComponent(String(skip))}`,
    );
  },

  async getLinkMessages(
    conversationId: string,
    limit = 50,
    skip = 0,
  ): Promise<ChatLinkMessage[]> {
    return await chatApiClient.get(
      `/messages/${conversationId}/links?limit=${encodeURIComponent(String(limit))}&skip=${encodeURIComponent(String(skip))}`,
    );
  },

  async sendMessage(payload: SendMessagePayload): Promise<ChatMessage> {
    return await chatApiClient.post('/messages', payload);
  },

  async reactToMessage(
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
  },

  async revokeMessage(
    conversationId: string,
    msgId: string,
    userId: string,
  ): Promise<ChatMessage> {
    return await chatApiClient.put(`/messages/${msgId}/revoke`, {
      conversationId,
      userId,
    });
  },

  async deleteMessage(
    conversationId: string,
    msgId: string,
    userId: string,
  ): Promise<ChatMessage> {
    return await chatApiClient.put(`/messages/${msgId}/delete`, {
      conversationId,
      userId,
    });
  },

  async pinMessage(
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
  },
};
