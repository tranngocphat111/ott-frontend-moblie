import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { ChatApi } from '@/services/api';
import type { ChatMessage } from '@/types/entities/chat';

import { countVisualItems } from '@/utils/chat';

interface UseMessageScrollProps {
  conversationId: string | undefined;
  userIdForChat: string | undefined;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
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
  const [loadingNewer, setLoadingNewer] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [hasMoreNewer, setHasMoreNewer] = useState(false);
  const [initialScrollReady, setInitialScrollReady] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const showScrollToBottomRef = useRef(false);

  useEffect(() => {
    setInitialScrollReady(false);
    setShowScrollToBottom(false);
    showScrollToBottomRef.current = false;
    setHasMoreNewer(false);
  }, [conversationId]);

  const setScrollToBottomVisible = useCallback((next: boolean) => {
    if (showScrollToBottomRef.current === next) return;
    showScrollToBottomRef.current = next;
    setShowScrollToBottom(next);
  }, []);

  const compareIds = useCallback((left?: string, right?: string) => {
    const l = String(left || '0');
    const r = String(right || '0');
    
    if (/^\d+$/.test(l) && /^\d+$/.test(r)) {
      try {
        const leftId = BigInt(l);
        const rightId = BigInt(r);
        if (leftId === rightId) return 0;
        return leftId > rightId ? 1 : -1;
      } catch {
        // Fallback
      }
    }
    
    if (l === r) return 0;
    return l > r ? 1 : -1;
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !userIdForChat || loadingOlder || !hasMoreOlder || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const before = lastMessage.msg_id || lastMessage._id;
    if (!before) return;

    setLoadingOlder(true);
    try {
      const payload = await ChatApi.getOlderMessages(conversationId, before, PAGE_SIZE, userIdForChat);
      let batchMessages = normalizeMessages(payload.messages || []);
      let hasMore = payload.hasMore;
      let attempts = 0;

      // Ensure we load enough "logical" items in this batch to fill the viewport
      // Increase target to 20 and allow up to 5 attempts to fill the gap.
      while (hasMore && countVisualItems(batchMessages) < 20 && attempts < 5) {
        attempts++;
        const oldestInBatch = batchMessages[batchMessages.length - 1];
        if (!oldestInBatch?.msg_id) break;

        try {
          const nextPayload = await ChatApi.getOlderMessages(conversationId, oldestInBatch.msg_id, PAGE_SIZE, userIdForChat);
          const nextMessages = normalizeMessages(nextPayload.messages || []);
          if (nextMessages.length === 0) {
            hasMore = false;
            break;
          }
          batchMessages = [...batchMessages, ...nextMessages];
          hasMore = nextPayload.hasMore;
        } catch (err) {
          console.error('Batch auto-fill failed:', err);
          break;
        }
      }

      if (batchMessages.length > 0) {
        setMessages((current) => normalizeMessages([...current, ...batchMessages]));
      }

      setHasMoreOlder(hasMore);
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMoreOlder, loadingOlder, messages, setMessages, normalizeMessages, userIdForChat, PAGE_SIZE]);

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      if (!initialScrollReady && messages.length > 0) {
        setInitialScrollReady(true);
      }
    },
    [initialScrollReady, messages.length],
  );

  const loadNewerMessages = useCallback(async () => {
    if (!conversationId || !userIdForChat || loadingNewer || !hasMoreNewer || messages.length === 0) {
      return;
    }

    const firstMessage = messages[0];
    const anchorId = firstMessage.msg_id || firstMessage._id;
    if (!anchorId) return;

    setLoadingNewer(true);
    try {
      const payload = await ChatApi.getMessageContext(conversationId, anchorId, 0, PAGE_SIZE, userIdForChat);
      const contextMessages = normalizeMessages(payload.messages || []);
      setMessages((current) => {
        const currentMap = new Map(current.map((item) => [String(item.msg_id || item._id || ''), item]));
        const appendable = contextMessages.filter((item) => {
          const id = String(item.msg_id || item._id || '');
          if (!id || currentMap.has(id)) return false;
          return compareIds(id, String(anchorId)) > 0;
        });

        if (appendable.length === 0) return current;
        return normalizeMessages([...current, ...appendable]);
      });

      setHasMoreNewer(Boolean(payload?.hasMoreAfter));
    } catch (error) {
      console.error('Failed to load newer messages:', error);
    } finally {
      setLoadingNewer(false);
    }
  }, [conversationId, userIdForChat, loadingNewer, hasMoreNewer, messages, PAGE_SIZE, normalizeMessages, compareIds, setMessages]);

  const onScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const distanceToOldest =
      event.nativeEvent.contentSize.height -
      (event.nativeEvent.layoutMeasurement.height + currentOffset);

    // FlashList is inverted: offset 0 is the newest message at the bottom.
    if (currentOffset > 120) {
      setScrollToBottomVisible(true);
    } else {
      setScrollToBottomVisible(false);
    }

    if (distanceToOldest < 120) {
      void loadOlderMessages();
    }

    if (currentOffset < 120 && hasMoreNewer) {
      void loadNewerMessages();
    }
  }, [hasMoreNewer, loadNewerMessages, loadOlderMessages, setScrollToBottomVisible]);

  const setPendingScrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    setScrollToBottomVisible(false);
  }, [setScrollToBottomVisible]);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setScrollToBottomVisible(false);
  }, [setScrollToBottomVisible]);

  return {
    listRef,
    loadingOlder,
    hasMoreOlder,
    hasMoreNewer,
    initialScrollReady,
    showScrollToBottom,
    onScroll,
    handleContentSizeChange,
    setPendingScrollToBottom,
    setHasMoreNewer,
    scrollToBottom,
  };
}
