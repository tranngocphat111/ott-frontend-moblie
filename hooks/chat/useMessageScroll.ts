import { useCallback, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { ChatApi } from '@/services/api';
import type { ChatMessage } from '@/types/entities/chat';

interface UseMessageScrollProps {
  conversationId: string | undefined;
  userIdForChat: string | undefined;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  normalizeMessages: (messages: ChatMessage[]) => ChatMessage[];
  PAGE_SIZE: number;
}

export function useMessageScroll({
  conversationId,
  userIdForChat,
  messages,
  setMessages,
  normalizeMessages,
  PAGE_SIZE,
}: UseMessageScrollProps) {
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const pendingScrollToBottomRef = useRef(false);
  const pendingPrependRef = useRef(false);
  const contentHeightRef = useRef(0);
  const lastOffsetRef = useRef(0);

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !userIdForChat || loadingOlder || !hasMoreOlder || messages.length === 0) {
      return;
    }

    const firstMessage = messages[0];
    const before = firstMessage.msg_id || firstMessage._id;
    if (!before) return;

    setLoadingOlder(true);
    pendingPrependRef.current = true;
    try {
      const payload = await ChatApi.getOlderMessages(conversationId, before, PAGE_SIZE, userIdForChat);
      const nextMessages = normalizeMessages(payload.messages || []);

      if (nextMessages.length > 0) {
        setMessages(normalizeMessages([...nextMessages, ...messages]));
      }

      setHasMoreOlder(payload.hasMore);
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMoreOlder, loadingOlder, messages, setMessages, normalizeMessages, userIdForChat, PAGE_SIZE]);

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      if (pendingScrollToBottomRef.current) {
        pendingScrollToBottomRef.current = false;
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: false });
        });
      }

      if (pendingPrependRef.current) {
        const heightDiff = height - contentHeightRef.current;
        const nextOffset = Math.max(lastOffsetRef.current + heightDiff, 0);
        pendingPrependRef.current = false;
        requestAnimationFrame(() => {
          listRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
        });
      }

      contentHeightRef.current = height;
    },
    [],
  );

  const onScroll = useCallback((event: any) => {
    lastOffsetRef.current = event.nativeEvent.contentOffset.y;
    if (event.nativeEvent.contentOffset.y < 120) {
      void loadOlderMessages();
    }
  }, [loadOlderMessages]);

  const setPendingScrollToBottom = useCallback(() => {
    pendingScrollToBottomRef.current = true;
  }, []);

  return {
    listRef,
    loadingOlder,
    hasMoreOlder,
    onScroll,
    handleContentSizeChange,
    setPendingScrollToBottom,
  };
}
