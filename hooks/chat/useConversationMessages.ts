import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';
import type { ChatConversation, ChatMessage } from '@/types/entities/chat';

const PAGE_SIZE = 20;

export function useConversationMessages(conversationId: string | undefined, userIdForChat: string | undefined) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeMessages = (messageList: ChatMessage[]) => {
    return [...messageList].sort((left, right) => {
      const leftTime = new Date(left.createdAt || left.created_at || 0).getTime();
      const rightTime = new Date(right.createdAt || right.created_at || 0).getTime();

      if (leftTime !== rightTime) return leftTime - rightTime;

      const leftId = Number(left.msg_id || 0);
      const rightId = Number(right.msg_id || 0);

      return leftId - rightId;
    });
  };

  const loadConversation = useCallback(async () => {
    if (!conversationId || !userIdForChat) return;

    setLoading(true);
    try {
      const [conversationList, messagePayload, pinnedPayload] = await Promise.all([
        ChatApi.getUserConversations(userIdForChat),
        ChatApi.getMessages(conversationId, userIdForChat),
        ChatApi.getPinnedMessages(conversationId).catch(() => [] as ChatMessage[]),
      ]);

      const matched = conversationList.find(
        (item: any) => item.conversation._id === conversationId,
      );

      setConversation(matched?.conversation || null);
      setMessages(normalizeMessages(messagePayload.messages || []));
      setPinnedMessages((Array.isArray(pinnedPayload) ? pinnedPayload : []).slice(0, 3));

      const lastMessage = messagePayload.messages?.[messagePayload.messages.length - 1];
      if (lastMessage?.msg_id) {
        void ChatApi.markAsRead(conversationId, userIdForChat, lastMessage.msg_id).catch(() => undefined);
      }
    } catch (error) {
      console.error('Failed to load chat room:', error);
      Alert.alert('Lỗi', 'Không thể tải cuộc trò chuyện');
    } finally {
      setLoading(false);
    }
  }, [conversationId, userIdForChat]);

  return {
    conversation,
    messages,
    pinnedMessages,
    loading,
    setMessages,
    setPinnedMessages,
    loadConversation,
    normalizeMessages,
    PAGE_SIZE,
  };
}
