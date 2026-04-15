import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { ChatApi } from '@/services/api';
import type { ChatMessage } from '@/types/entities/chat';

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
  const pendingScrollToBottomRef = useRef(false);
  const pendingPrependRef = useRef(false);
  const contentHeightRef = useRef(0);
  const lastOffsetRef = useRef(0);
  const showScrollToBottomRef = useRef(false);

  useEffect(() => {
    pendingScrollToBottomRef.current = false;
    pendingPrependRef.current = false;
    contentHeightRef.current = 0;
    lastOffsetRef.current = 0;
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
    try {
      const leftId = BigInt(l);
      const rightId = BigInt(r);
      if (leftId === rightId) return 0;
      return leftId > rightId ? 1 : -1;
    } catch {
      if (l === r) return 0;
      return l > r ? 1 : -1;
    }
  }, []);

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
        setMessages((current) => normalizeMessages([...nextMessages, ...current]));
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
          setInitialScrollReady(true);
        });
      } else if (!initialScrollReady && messages.length === 0) {
        setInitialScrollReady(true);
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
    [initialScrollReady, messages.length],
  );

  const loadNewerMessages = useCallback(async () => {
    if (!conversationId || !userIdForChat || loadingNewer || !hasMoreNewer || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const anchorId = lastMessage.msg_id || lastMessage._id;
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
    const isScrollingUp = currentOffset < lastOffsetRef.current - 1;
    const isScrollingDown = currentOffset > lastOffsetRef.current + 1;
    const distanceToBottom =
      event.nativeEvent.contentSize.height -
      (event.nativeEvent.layoutMeasurement.height + currentOffset);

    if (distanceToBottom < 120) {
      setScrollToBottomVisible(false);
    } else if (isScrollingUp) {
      setScrollToBottomVisible(true);
    }

    lastOffsetRef.current = currentOffset;

    if (currentOffset < 120) {
      void loadOlderMessages();
    }

    if (isScrollingDown && distanceToBottom < 120 && hasMoreNewer) {
      void loadNewerMessages();
    }
  }, [hasMoreNewer, loadNewerMessages, loadOlderMessages, setScrollToBottomVisible]);

  const setPendingScrollToBottom = useCallback(() => {
    pendingScrollToBottomRef.current = true;
    setScrollToBottomVisible(false);
  }, [setScrollToBottomVisible]);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: false });
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
