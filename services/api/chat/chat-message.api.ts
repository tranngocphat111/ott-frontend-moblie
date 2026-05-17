import { chatApiClient } from '../client';
import * as FileSystem from 'expo-file-system/legacy';
import type {
  ChatMessage,
  ChatMessagesResponse,
  ChatOlderMessagesResponse,
} from '@/types/entities/chat';
import type {
  ChatForwardMessageResponse,
  ChatLinkMessage,
  ChatMessageContextResponse,
  ChatPresignedUrlResponse,
  SendMessagePayload,
} from './chat.types';

const S3_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const sanitizeS3FileName = (fileName: string) => {
  const baseName =
    String(fileName || 'file')
      .split(/[\\/]/)
      .pop()
      ?.normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'file';

  return baseName.slice(0, 160) || 'file';
};

const resolveUploadContentDisposition = (contentType: string, fileName?: string) => {
  const disposition = /^(image|video|audio)\//i.test(contentType)
    ? 'inline'
    : 'attachment';
  return `${disposition}; filename="${sanitizeS3FileName(fileName || 'file')}"`;
};

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
    fileName?: string,
  ): Promise<void> {
    const resolvedContentType = contentType || 'application/octet-stream';
    const task = FileSystem.createUploadTask(
      uploadUrl,
      uri,
      {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': resolvedContentType,
          'Cache-Control': S3_CACHE_CONTROL,
          'Content-Disposition': resolveUploadContentDisposition(resolvedContentType, fileName),
        },
      },
      ({ totalBytesExpectedToSend, totalBytesSent }) => {
        if (!totalBytesExpectedToSend) return;
        const percent = Math.round((totalBytesSent / totalBytesExpectedToSend) * 100);
        onProgress?.(Math.max(0, Math.min(100, percent)));
      },
    );

    const result = await task.uploadAsync();
    if (!result) {
      throw new Error('S3 upload failed: no response');
    }

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`S3 upload failed: ${result.status}`);
    }

    onProgress?.(100);
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

  async forwardMessage(
    originalMsgId: string,
    conversationId: string,
    targetConversationIds: string[],
    senderId: string,
  ): Promise<ChatForwardMessageResponse> {
    return await chatApiClient.post('/messages/forward', {
      originalMsgId,
      conversationId,
      targetConversationIds,
      senderId,
    });
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
 
  async votePoll(
    conversationId: string,
    msgId: string,
    userId: string,
    optionIds: string[],
  ): Promise<ChatMessage> {
    return await chatApiClient.put(`/messages/${msgId}/vote`, {
      conversationId,
      userId,
      optionIds,
    });
  },

  async transcribeAudio(formData: FormData): Promise<{ text: string }> {
    return await chatApiClient.post('/ai/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async getSmartReplies(conversationId: string, userId?: string): Promise<string[]> {
    const response = await chatApiClient.get<
      string[] | { result?: string[]; replies?: string[]; suggestions?: Array<string | { text: string }> }
    >('/ai/smart-replies', {
      params: { conversationId, userId, detailed: true },
    });
    const payload = (response as any).result || response;
    const replies = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.replies)
        ? payload.replies
        : Array.isArray(payload?.suggestions)
          ? payload.suggestions
          : [];

    return replies
      .map((reply: string | { text: string }) => typeof reply === 'string' ? reply : reply?.text)
      .filter((reply: unknown): reply is string => typeof reply === 'string' && reply.trim().length > 0)
      .map((reply: string) => reply.trim())
      .slice(0, 5);
  },

  async summarizeConversation(conversationId: string, userId?: string): Promise<{ summary: string }> {
    const response = await chatApiClient.get('/ai/summarize', {
      params: { conversationId, userId },
    });
    const payload = (response as any).result || response;
    return {
      ...(payload as any),
      summary: (payload as any)?.summary || 'Không thể tóm tắt hội thoại lúc này.',
    };
  },

  async translateText(text: string, targetLang: string = 'vi'): Promise<{ translatedText: string }> {
    return await chatApiClient.post('/ai/translate', { text, targetLang });
  },
};
