import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import type { ChatMessage } from '@/types/entities/chat';

interface UseMessageHighlightProps {
  messages: ChatMessage[];
  getMessageKey: (message: ChatMessage) => string | undefined;
  listRef: React.RefObject<FlatList> | any;
  onResolveMissingMessage?: (messageId: string) => Promise<boolean> | boolean;
}

export function useMessageHighlight({
  messages,
  getMessageKey,
  listRef,
  onResolveMissingMessage,
}: UseMessageHighlightProps) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const waitForIndex = useCallback(async (messageId: string, attempts = 8) => {
    for (let i = 0; i < attempts; i += 1) {
      const index = messagesRef.current.findIndex((item) => getMessageKey(item) === messageId);
      if (index >= 0) return index;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return -1;
  }, [getMessageKey]);

  const highlightMessage = useCallback(async (messageId: string) => {
    if (!messageId) return;

    let index = await waitForIndex(messageId, 2);
    if (index < 0 && onResolveMissingMessage) {
      const resolved = await Promise.resolve(onResolveMissingMessage(messageId));
      if (resolved) {
        index = await waitForIndex(messageId, 14);
      }
    }

    if (index < 0) return;

    setHighlightedMessageId(messageId);
    if (highlightedTimerRef.current) {
      clearTimeout(highlightedTimerRef.current);
    }
    highlightedTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
      highlightedTimerRef.current = null;
    }, 2500);

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.35 });
    });
  }, [listRef, onResolveMissingMessage, waitForIndex]);

  const cleanup = useCallback(() => {
    if (highlightedTimerRef.current) {
      clearTimeout(highlightedTimerRef.current);
    }
  }, []);

  return {
    highlightedMessageId,
    highlightMessage,
    cleanup,
  };
}

