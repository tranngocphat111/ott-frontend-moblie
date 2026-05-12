import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';
import type { ChatConversation, ChatMessage } from '@/types/entities/chat';
import { countVisualItems } from '@/utils/chat';

const PAGE_SIZE = 20;

export function useConversationMessages(conversationId: string | undefined, userIdForChat: string | undefined) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const activeRequestIdRef = useRef(0);
  const loadedConversationIdRef = useRef<string>('');

  useEffect(() => {
    return () => {
      activeRequestIdRef.current += 1;
    };
  }, []);

  const normalizeMessages = useCallback((messageList: ChatMessage[]) => {
    const map = new Map<string, ChatMessage>();
    
    // Iterate to deduplicate, merging if necessary
    messageList.forEach(item => {
      const id = item.msg_id || item._id;
      const key = id ? String(id) : String(item.local_temp_id || '');
      if (!key) return;
      
      const existing = map.get(key);
      if (existing) {
         // Keep the local_temp_id if it exists, and prefer the newer/more complete item
         map.set(key, { ...existing, ...item, local_temp_id: existing.local_temp_id || item.local_temp_id });
      } else {
         map.set(key, item);
      }
    });

    return Array.from(map.values()).sort((left, right) => {
      const leftTime = new Date(left.createdAt || left.created_at || 0).getTime();
      const rightTime = new Date(right.createdAt || right.created_at || 0).getTime();

      if (leftTime !== rightTime) return rightTime - leftTime;

      const leftMsgId = String(left.msg_id || '0');
      const rightMsgId = String(right.msg_id || '0');
      
      if (/^\d+$/.test(leftMsgId) && /^\d+$/.test(rightMsgId)) {
        try {
          const lId = BigInt(leftMsgId);
          const rId = BigInt(rightMsgId);
          if (lId === rId) return 0;
          return lId > rId ? -1 : 1;
        } catch {
          // Fallback to localeCompare if BigInt fails
        }
      }

      return rightMsgId.localeCompare(leftMsgId);
    });
  }, []);

  const normalizePinnedMessages = useCallback((messageList: ChatMessage[]) => {
    const map = new Map<string, ChatMessage>();
    
    messageList.forEach(item => {
      if (!item?.is_pinned) return;
      const id = item.msg_id || item._id;
      const key = id ? String(id) : String(item.local_temp_id || '');
      if (!key) return;
      
      const existing = map.get(key);
      if (existing) {
         map.set(key, { ...existing, ...item, local_temp_id: existing.local_temp_id || item.local_temp_id });
      } else {
         map.set(key, item);
      }
    });

    return Array.from(map.values()).sort((left, right) => {
      const leftPinnedAt = new Date(left.pinned_at || left.createdAt || left.created_at || 0).getTime();
      const rightPinnedAt = new Date(right.pinned_at || right.createdAt || right.created_at || 0).getTime();

      if (leftPinnedAt !== rightPinnedAt) return rightPinnedAt - leftPinnedAt;

      const leftMsgId = String(left.msg_id || '0');
      const rightMsgId = String(right.msg_id || '0');

      if (/^\d+$/.test(leftMsgId) && /^\d+$/.test(rightMsgId)) {
          try {
            const lId = BigInt(leftMsgId);
            const rId = BigInt(rightMsgId);
            if (lId === rId) return 0;
            return lId > rId ? -1 : 1;
          } catch {
             // Fallback
          }
        }
        return rightMsgId.localeCompare(leftMsgId);
      });
  }, []);

  useEffect(() => {
    loadedConversationIdRef.current = String(conversation?._id || '');
  }, [conversation?._id]);

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

    const normalizedConversationId = String(conversationId || '');
    const isVirtual = normalizedConversationId.startsWith('VIRTUAL_CONV_');

    if (isVirtual) {
      setMessages([]);
      setPinnedMessages([]);
      setLoading(false);
      return;
    }

    const shouldLoadConversationMeta = loadedConversationIdRef.current !== normalizedConversationId;

    if (shouldLoadConversationMeta) {
      setConversation(null);
      loadedConversationIdRef.current = '';
    }

    try {
      const [messagePayload, pinnedPayload] = await Promise.all([
        ChatApi.getMessages(conversationId as string, userIdForChat),
        ChatApi.getPinnedMessages(conversationId as string).catch(() => [] as ChatMessage[]),
      ]);

      if (requestId !== activeRequestIdRef.current) return;

      const rawMessages = Array.isArray(messagePayload)
        ? messagePayload
        : Array.isArray((messagePayload as any)?.messages)
          ? (messagePayload as any).messages
          : [];

      let initialMessages = normalizeMessages(rawMessages);
      let hasMore = Array.isArray(messagePayload) ? false : !!(messagePayload as any)?.hasMore;
      let attempts = 0;

      // Auto-fill logic: if visual items are few, fetch older messages automatically
      while (hasMore && countVisualItems(initialMessages) < 20 && attempts < 5) {
        attempts++;
        const oldest = initialMessages[initialMessages.length - 1];
        if (!oldest?.msg_id) break;

        try {
          const olderPayload = await ChatApi.getOlderMessages(
            conversationId,
            oldest.msg_id,
            PAGE_SIZE,
            userIdForChat,
          );
          const olderBatch = normalizeMessages(olderPayload.messages || []);
          if (olderBatch.length === 0) {
            hasMore = false;
            break;
          }
          initialMessages = normalizeMessages([...initialMessages, ...olderBatch]);
          hasMore = olderPayload.hasMore;
        } catch (err) {
          console.error('Initial auto-fill failed:', err);
          break;
        }
      }

      setMessages(initialMessages);
      setPinnedMessages(normalizePinnedMessages(pinnedPayload));

      if (shouldLoadConversationMeta && userIdForChat) {
        void ChatApi.getUserConversations(userIdForChat)
          .then((conversationList) => {
            if (requestId !== activeRequestIdRef.current) return;

            const matched = conversationList.find(
              (item: any) => item.conversation._id === conversationId,
            );
            if (matched?.conversation) {
              setConversation(matched.conversation || null);
              setParticipant(matched.participant || null);
              loadedConversationIdRef.current = normalizedConversationId;
            }
          })
          .catch(() => undefined);
      }

      const newestMessage = initialMessages[0];
      if (userIdForChat && newestMessage?.msg_id) {
        void ChatApi.markAsRead(conversationId, userIdForChat, newestMessage.msg_id).catch(() => undefined);
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
  }, [conversationId, normalizeMessages, normalizePinnedMessages, userIdForChat]);

  const [participant, setParticipant] = useState<any>(null);

  const isDissolved = messages.some(m => 
    String(m.system_meta?.action || '').toLowerCase() === 'group_dissolved'
  );

  return {
    conversation,
    participant,
    messages,
    pinnedMessages,
    loading,
    isDissolved,
    setMessages,
    setPinnedMessages,
    loadConversation,
    normalizeMessages,
    normalizePinnedMessages,
    PAGE_SIZE,
  };
}
