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
    if (!conversationId) {
      setLoading(false);
      setMessages([]);
      setPinnedMessages([]);
      setConversation(null);
      return;
    }

    setLoading(true);
    try {
      const [conversationList, messagePayload, pinnedPayload] = await Promise.all([
        userIdForChat
          ? ChatApi.getUserConversations(userIdForChat).catch(() => [] as any[])
          : Promise.resolve([] as any[]),
        ChatApi.getMessages(conversationId, userIdForChat),
        ChatApi.getPinnedMessages(conversationId).catch(() => [] as ChatMessage[]),
      ]);

      const normalizedMessages = Array.isArray(messagePayload)
        ? messagePayload
        : Array.isArray((messagePayload as any)?.messages)
          ? (messagePayload as any).messages
          : [];

      const normalizedPinned = Array.isArray(pinnedPayload)
        ? pinnedPayload
        : Array.isArray((pinnedPayload as any)?.messages)
          ? (pinnedPayload as any).messages
          : [];

      const matched = conversationList.find(
        (item: any) => item.conversation._id === conversationId,
      );

      setConversation(matched?.conversation || null);
      setMessages(normalizeMessages(normalizedMessages));
      setPinnedMessages(normalizeMessages(normalizedPinned));

      const lastMessage = normalizedMessages[normalizedMessages.length - 1];
      if (userIdForChat && lastMessage?.msg_id) {
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
