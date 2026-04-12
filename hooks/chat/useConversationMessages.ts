import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';
import type { ChatConversation, ChatMessage } from '@/types/entities/chat';

const PAGE_SIZE = 20;

export function useConversationMessages(conversationId: string | undefined, userIdForChat: string | undefined) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      activeRequestIdRef.current += 1;
    };
  }, []);

  const normalizeMessages = (messageList: ChatMessage[]) => {
    return [...messageList].sort((left, right) => {
      const leftTime = new Date(left.createdAt || left.created_at || 0).getTime();
      const rightTime = new Date(right.createdAt || right.created_at || 0).getTime();

      if (leftTime !== rightTime) return leftTime - rightTime;

      const leftId = BigInt(String(left.msg_id || 0));
      const rightId = BigInt(String(right.msg_id || 0));

      if (leftId === rightId) return 0;
      return leftId < rightId ? -1 : 1;
    });
  };

  const normalizePinnedMessages = (messageList: ChatMessage[]) => {
    return [...messageList]
      .filter((message) => !!message?.is_pinned)
      .sort((left, right) => {
        const leftPinnedAt = new Date(left.pinned_at || left.createdAt || left.created_at || 0).getTime();
        const rightPinnedAt = new Date(right.pinned_at || right.createdAt || right.created_at || 0).getTime();

        if (leftPinnedAt !== rightPinnedAt) return rightPinnedAt - leftPinnedAt;

        const leftId = BigInt(String(left.msg_id || 0));
        const rightId = BigInt(String(right.msg_id || 0));

        if (leftId === rightId) return 0;
        return leftId > rightId ? -1 : 1;
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

    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    setLoading(true);

    const shouldLoadConversationMeta =
      !conversation || String(conversation._id || '') !== String(conversationId || '');

    if (shouldLoadConversationMeta) {
      setConversation(null);
    }

    try {
      const [messagePayload, pinnedPayload] = await Promise.all([
        ChatApi.getMessages(conversationId, userIdForChat),
        ChatApi.getPinnedMessages(conversationId).catch(() => [] as ChatMessage[]),
      ]);

      if (requestId !== activeRequestIdRef.current) return;

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

      setMessages(normalizeMessages(normalizedMessages));
      setPinnedMessages(normalizePinnedMessages(normalizedPinned));

      if (shouldLoadConversationMeta && userIdForChat) {
        void ChatApi.getUserConversations(userIdForChat)
          .then((conversationList) => {
            if (requestId !== activeRequestIdRef.current) return;

            const matched = conversationList.find(
              (item: any) => item.conversation._id === conversationId,
            );
            if (matched?.conversation) {
              setConversation(matched.conversation || null);
            }
          })
          .catch(() => undefined);
      }

      const lastMessage = normalizedMessages[normalizedMessages.length - 1];
      if (userIdForChat && lastMessage?.msg_id) {
        void ChatApi.markAsRead(conversationId, userIdForChat, lastMessage.msg_id).catch(() => undefined);
      }
    } catch (error) {
      if (requestId !== activeRequestIdRef.current) return;
      console.error('Failed to load chat room:', error);
      Alert.alert('Lỗi', 'Không thể tải cuộc trò chuyện');
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [conversation?._id, conversationId, userIdForChat]);

  return {
    conversation,
    messages,
    pinnedMessages,
    loading,
    setMessages,
    setPinnedMessages,
    loadConversation,
    normalizeMessages,
    normalizePinnedMessages,
    PAGE_SIZE,
  };
}
