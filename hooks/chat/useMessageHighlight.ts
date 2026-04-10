import { useCallback, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import type { ChatMessage } from '@/types/entities/chat';

interface UseMessageHighlightProps {
  messages: ChatMessage[];
  getMessageKey: (message: ChatMessage) => string | undefined;
  listRef: React.RefObject<FlatList> | any;
}

export function useMessageHighlight({
  messages,
  getMessageKey,
  listRef,
}: UseMessageHighlightProps) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlightMessage = useCallback((messageId: string) => {
    if (!messageId) return;

    setHighlightedMessageId(messageId);
    if (highlightedTimerRef.current) {
      clearTimeout(highlightedTimerRef.current);
    }
    highlightedTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
      highlightedTimerRef.current = null;
    }, 2500);

    const index = messages.findIndex((item) => getMessageKey(item) === messageId);
    if (index >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.35 });
      });
    }
  }, [messages, getMessageKey, listRef]);

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

