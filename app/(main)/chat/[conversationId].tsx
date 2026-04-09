import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/Authcontext';
import { ChatApi } from '@/services/api';
import type { ChatConversation, ChatConversationWithParticipant, ChatMessage, ChatMessageContent } from '@/types';
import { ChatComposer, ChatMessageBubble } from '@/components/chat';
import {
  formatConversationTime,
  getConversationAvatar,
  getConversationTitle,
  getMessageBodyText,
  shouldShowTimestamp,
} from '@/utils/chat';

const PAGE_SIZE = 20;

const normalizeMessages = (messages: ChatMessage[]) => {
  return [...messages].sort((left, right) => {
    const leftTime = new Date(left.createdAt || left.created_at || 0).getTime();
    const rightTime = new Date(right.createdAt || right.created_at || 0).getTime();

    if (leftTime !== rightTime) return leftTime - rightTime;

    const leftId = Number(left.msg_id || 0);
    const rightId = Number(right.msg_id || 0);

    return leftId - rightId;
  });
};

const getMessageKey = (message: ChatMessage) => message.msg_id || message._id;

export default function ChatDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, chatUserId } = useAuth();

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const pendingScrollToBottomRef = useRef(false);
  const pendingPrependRef = useRef(false);
  const contentHeightRef = useRef(0);
  const lastOffsetRef = useRef(0);
  const highlightedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = getConversationTitle(conversation, user?.id);
  const avatar = getConversationAvatar(conversation, user?.id);
  const isGroup = conversation?.type === 'group';

  const loadConversation = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    setLoading(true);
    // Use chatUserId if available (demo mode), otherwise use user.id
    const userIdForChat = chatUserId || user.id;

    try {
      const [conversationList, messagePayload, pinnedPayload] = await Promise.all([
        ChatApi.getUserConversations(userIdForChat),
        ChatApi.getMessages(conversationId, userIdForChat),
        ChatApi.getPinnedMessages(conversationId).catch(() => [] as ChatMessage[]),
      ]);

      const matched = conversationList.find(
        (item: ChatConversationWithParticipant) => item.conversation._id === conversationId,
      );

      setConversation(matched?.conversation || null);
      setMessages(normalizeMessages(messagePayload.messages || []));
      setPinnedMessages((Array.isArray(pinnedPayload) ? pinnedPayload : []).slice(0, 3));
      setHasMoreOlder((messagePayload.messages || []).length >= PAGE_SIZE);
      pendingScrollToBottomRef.current = true;

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
  }, [conversationId, user?.id, chatUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadConversation();

      return () => {
        if (highlightedTimerRef.current) {
          clearTimeout(highlightedTimerRef.current);
          highlightedTimerRef.current = null;
        }
      };
    }, [loadConversation]),
  );

  useEffect(() => {
    return () => {
      if (highlightedTimerRef.current) {
        clearTimeout(highlightedTimerRef.current);
      }
    };
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !user?.id || loadingOlder || !hasMoreOlder || messages.length === 0) {
      return;
    }

    const userIdForChat = chatUserId || user.id;
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
  }, [conversationId, hasMoreOlder, loadingOlder, messages, user?.id, chatUserId]);

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
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    const userIdForChat = chatUserId || user.id;
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const isLink = /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);

    try {
      await ChatApi.sendMessage({
        conversationId,
        senderId: userIdForChat,
        content: trimmed,
        type: isLink ? 'link' : 'text',
        replyToMsgId: replyToMessage?.msg_id,
      });

      setMessageText('');
      setReplyToMessage(null);
      pendingScrollToBottomRef.current = true;
      void loadConversation();
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    }
  }, [conversationId, loadConversation, messageText, replyToMessage?.msg_id, user?.id, chatUserId]);

  const handleMessageAction = useCallback(
    (message: ChatMessage) => {
      const userIdForChat = chatUserId || user?.id;
      const isMine = String(message.sender_id) === String(userIdForChat || '');
      const items: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
        { text: 'Trả lời', onPress: () => setReplyToMessage(message) },
      ];

      if (message.msg_id) {
        const isPinned = !!message.is_pinned;
        items.push({
          text: isPinned ? 'Bỏ ghim' : 'Ghim',
          onPress: async () => {
            if (!userIdForChat || !conversationId || !message.msg_id) return;
            try {
              await ChatApi.pinMessage(conversationId, message.msg_id, userIdForChat, !isPinned);
              await loadConversation();
            } catch (error) {
              console.error('Failed to toggle pin:', error);
              const errorMessage = error instanceof Error ? error.message : 'Không thể ghim tin nhắn';
              Alert.alert('Lỗi', errorMessage);
            }
          },
        });
      }

      if (isMine && message.msg_id) {
        items.push({
          text: 'Thu hồi',
          style: 'destructive',
          onPress: async () => {
            if (!userIdForChat || !conversationId || !message.msg_id) return;
            try {
              await ChatApi.revokeMessage(conversationId, message.msg_id, userIdForChat);
              await loadConversation();
            } catch (error) {
              console.error('Failed to revoke message:', error);
              Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
            }
          },
        });
      }

      if (message.msg_id) {
        items.push({
          text: 'Xóa ở phía bạn',
          style: 'destructive',
          onPress: async () => {
            if (!userIdForChat || !conversationId || !message.msg_id) return;
            try {
              await ChatApi.deleteMessage(conversationId, message.msg_id, userIdForChat);
              await loadConversation();
            } catch (error) {
              console.error('Failed to delete message:', error);
              Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
            }
          },
        });
      }

      items.push({ text: 'Hủy', style: 'cancel' });

      Alert.alert('Tùy chọn tin nhắn', '', items);
    },
    [conversationId, loadConversation, user?.id, chatUserId],
  );

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

  const pinnedChips = pinnedMessages.slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-[#F2F4F7]" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="border-b border-slate-200 bg-white px-4 py-3">
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Feather name="chevron-left" size={20} color="#0f172a" />
            </Pressable>

            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-11 w-11 overflow-hidden rounded-full bg-slate-200">
                {avatar ? (
                  <Image source={{ uri: avatar }} className="h-full w-full" />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-brand-100">
                    <Text className="text-[15px] font-bold text-brand-700">
                      {title.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-1">
                <Text className="text-[16px] font-semibold text-slate-900" numberOfLines={1}>
                  {title}
                </Text>
                <Text className="text-[12px] text-slate-500" numberOfLines={1}>
                  {isGroup ? `${conversation?.member_count || 0} thành viên` : 'Nhắn tin riêng'}
                </Text>
              </View>
            </View>

            <Pressable onPress={() => Alert.alert('Gọi thoại', 'Chức năng gọi sẽ được nối sau')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Feather name="phone" size={18} color="#0f172a" />
            </Pressable>
            <Pressable
              onPress={() =>
                router.push(
                  {
                    pathname: '/chat/info/[conversationId]',
                    params: { conversationId },
                  } as any,
                )
              }
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            >
              <Feather name="info" size={18} color="#0f172a" />
            </Pressable>
          </View>
        </View>

        {pinnedChips.length > 0 && (
          <View className="border-b border-slate-200 bg-white px-4 pb-3 pt-3">
            <Text className="mb-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tin nhắn ghim
            </Text>
            <View className="flex-row gap-2">
              {pinnedChips.map((item) => (
                <Pressable
                  key={item._id}
                  onPress={() => item.msg_id && highlightMessage(item.msg_id)}
                  className="max-w-[70%] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <Text className="text-[12px] font-semibold text-slate-500" numberOfLines={1}>
                    {item.sender_name || 'Thành viên'}
                  </Text>
                  <Text className="mt-0.5 text-[13px] text-slate-800" numberOfLines={1}>
                    {getMessageBodyText(item)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View className="flex-1">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#8b5e34" />
              <Text className="mt-3 text-[14px] text-slate-500">Đang tải cuộc trò chuyện...</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={getMessageKey}
              onScroll={onScroll}
              scrollEventThrottle={16}
              onContentSizeChange={handleContentSizeChange}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              onScrollToIndexFailed={(info) => {
                requestAnimationFrame(() => {
                  listRef.current?.scrollToOffset({
                    offset: Math.max(info.averageItemLength * info.index, 0),
                    animated: true,
                  });
                });
              }}
              renderItem={({ item, index }) => {
                const userIdForChat = chatUserId || user?.id;
                const prevMessage = messages[index - 1];
                const isMine = String(item.sender_id) === String(userIdForChat || '');
                const showTimestamp = shouldShowTimestamp(
                  item.createdAt || item.created_at,
                  prevMessage?.createdAt || prevMessage?.created_at,
                );
                const showSenderName = isGroup && !isMine && (index === 0 || prevMessage?.sender_id !== item.sender_id || showTimestamp);

                return (
                  <View>
                    {showTimestamp && (
                      <View className="my-3 items-center">
                        <View className="rounded-full bg-slate-200 px-3 py-1">
                          <Text className="text-[11px] font-medium text-slate-600">
                            {formatConversationTime(item.createdAt || item.created_at)}
                          </Text>
                        </View>
                      </View>
                    )}

                    <ChatMessageBubble
                      message={item}
                      isMine={isMine}
                      showSenderName={showSenderName}
                      highlight={highlightedMessageId === getMessageKey(item)}
                      onLongPress={() => handleMessageAction(item)}
                      onReplyPress={() => item.reply_to_msg_id && highlightMessage(item.reply_to_msg_id)}
                      onImagePress={(imageIndex) => {
                        const imageItems = Array.isArray(item.content)
                          ? item.content.filter((content): content is ChatMessageContent => typeof content !== 'string')
                          : [];
                        const selected = (imageItems[imageIndex] as any)?.url || '';
                        if (selected) setSelectedImage(selected);
                      }}
                    />
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center px-6 py-24">
                  <Feather name="message-square" size={32} color="#94a3b8" />
                  <Text className="mt-3 text-[15px] font-semibold text-slate-900">
                    Chưa có tin nhắn
                  </Text>
                  <Text className="mt-2 text-center text-[13px] leading-5 text-slate-500">
                    Hãy gửi lời chào đầu tiên để bắt đầu cuộc trò chuyện.
                  </Text>
                </View>
              }
              ListHeaderComponent={
                loadingOlder ? (
                  <View className="items-center py-3">
                    <ActivityIndicator size="small" color="#8b5e34" />
                    <Text className="mt-1 text-[12px] text-slate-500">Đang tải tin nhắn cũ...</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>

        <ChatComposer
          value={messageText}
          onChangeText={setMessageText}
          onSend={() => void handleSendMessage()}
          replyToMessage={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
          disabled={!conversationId || !user?.id}
        />
      </KeyboardAvoidingView>

      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <Pressable className="flex-1 items-center justify-center bg-black/90 px-4" onPress={() => setSelectedImage(null)}>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} className="h-[72%] w-full rounded-3xl" resizeMode="contain" />
          )}
          <Pressable onPress={() => setSelectedImage(null)} className="absolute right-5 top-16 h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}