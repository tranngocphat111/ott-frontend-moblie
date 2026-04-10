import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/Authcontext';
import type { ChatMessage, ChatMessageContent } from '@/types/entities/chat';
import { ChatComposer, ChatMessageBubble } from '@/components/chat';
import {
  formatConversationTime,
  getConversationAvatar,
  getConversationTitle,
  getMessageBodyText,
  shouldShowTimestamp,
} from '@/utils/chat';
import {
  useConversationMessages,
  useMessageSocket,
  useMessageActions,
  useMessageScroll,
  useMessageHighlight,
} from '@/hooks/chat';

const getMessageKey = (message: ChatMessage) => message.msg_id || message._id;

const patchMessageById = (
  source: ChatMessage[],
  incoming: ChatMessage,
  options?: { remove?: boolean },
  normalizeMessages?: (messages: ChatMessage[]) => ChatMessage[],
) => {
  const key = getMessageKey(incoming);
  if (!key) return source;

  const next = [...source];
  const idx = next.findIndex((item) => getMessageKey(item) === key);

  if (options?.remove) {
    if (idx >= 0) next.splice(idx, 1);
    return next;
  }

  if (idx >= 0) {
    next[idx] = incoming;
  } else {
    next.push(incoming);
  }

  return normalizeMessages ? normalizeMessages(next) : next;
};

export default function ChatDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, chatUserId } = useAuth();

  const userIdForChat = chatUserId || user?.id;

  // Message management hooks
  const { conversation, messages, pinnedMessages, loading, setMessages, setPinnedMessages, loadConversation, normalizeMessages, PAGE_SIZE } = useConversationMessages(conversationId, userIdForChat);
  const { listRef, loadingOlder, onScroll, handleContentSizeChange, setPendingScrollToBottom } = useMessageScroll({
    conversationId,
    userIdForChat,
    messages,
    setMessages,
    normalizeMessages,
    PAGE_SIZE,
  });
  const { highlightedMessageId, highlightMessage, cleanup: cleanupHighlight } = useMessageHighlight({
    messages,
    getMessageKey,
    listRef,
  });
  const { handleMessageAction } = useMessageActions({
    conversationId,
    userIdForChat,
    onLoadConversation: loadConversation,
  });

  // Local component state
  const [messageText, setMessageText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Conversation metadata
  const title = getConversationTitle(conversation, userIdForChat);
  const avatar = getConversationAvatar(conversation, userIdForChat);
  const isGroup = conversation?.type === 'group';

  // Setup focus effect
  useFocusEffect(
    useCallback(() => {
      void loadConversation();
      return cleanupHighlight;
    }, [loadConversation, cleanupHighlight]),
  );

  // Socket event handlers
  const handleIncomingMessage = useCallback((payload: ChatMessage) => {
    if (String(payload?.conversation_id || '') !== String(conversationId)) return;
    setMessages((current) => patchMessageById(current, payload, undefined, normalizeMessages));
    setPendingScrollToBottom();
  }, [conversationId, normalizeMessages]);

  const handleReactionChanged = useCallback((payload: ChatMessage) => {
    if (String(payload?.conversation_id || '') !== String(conversationId)) return;
    setMessages((current) => patchMessageById(current, payload, undefined, normalizeMessages));
  }, [conversationId, normalizeMessages]);

  const handleMessagePinned = useCallback((payload: ChatMessage) => {
    if (String(payload?.conversation_id || '') !== String(conversationId)) return;
    setMessages((current) => patchMessageById(current, payload, undefined, normalizeMessages));
    setPinnedMessages((current) => {
      const next = patchMessageById(current, payload, { remove: !payload.is_pinned }, normalizeMessages);
      return next.slice(0, 3);
    });
  }, [conversationId, normalizeMessages]);

  const handleMessageRevoked = useCallback((payload: ChatMessage) => {
    if (String(payload?.conversation_id || '') !== String(conversationId)) return;
    setMessages((current) => patchMessageById(current, payload, undefined, normalizeMessages));
  }, [conversationId, normalizeMessages]);

  const handleMessageDeleted = useCallback((payload: ChatMessage) => {
    if (String(payload?.conversation_id || '') !== String(conversationId)) return;
    setMessages((current) => patchMessageById(current, payload, { remove: true }, normalizeMessages));
    setPinnedMessages((current) => patchMessageById(current, payload, { remove: true }, normalizeMessages).slice(0, 3));
  }, [conversationId, normalizeMessages]);

  // Setup socket listeners
  useMessageSocket({
    conversationId,
    userIdForChat,
    onIncomingMessage: handleIncomingMessage,
    onReactionChanged: handleReactionChanged,
    onMessagePinned: handleMessagePinned,
    onMessageRevoked: handleMessageRevoked,
    onMessageDeleted: handleMessageDeleted,
  });

  // Send message
  const onSendMessage = useCallback(async () => {
    if (!conversationId || !userIdForChat) return;

    const trimmed = messageText.trim();
    if (!trimmed) return;

    const isLink = /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);

    try {
      const { ChatApi } = await import('@/services/api');
      await ChatApi.sendMessage({
        conversationId,
        senderId: userIdForChat,
        content: trimmed,
        type: isLink ? 'link' : 'text',
        replyToMsgId: replyToMessage?.msg_id,
      });

      setMessageText('');
      setReplyToMessage(null);
      setPendingScrollToBottom();
      await loadConversation();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [conversationId, userIdForChat, messageText, replyToMessage?.msg_id, loadConversation]);

  const pinnedChips = pinnedMessages.slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-[#F2F4F7]" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient
          colors={['#1d84f2', '#1ca6e9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-4 py-3"
        >
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Feather name="chevron-left" size={20} color="#fff" />
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
                <Text className="text-[20px] font-bold text-white" numberOfLines={1}>
                  {title}
                </Text>
                <Text className="text-[12px] text-white/85" numberOfLines={1}>
                  {isGroup ? `${conversation?.member_count || 0} thành viên` : 'Nhắn tin riêng'}
                </Text>
              </View>
            </View>

            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Feather name="phone" size={18} color="#fff" />
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
              className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
            >
              <Feather name="menu" size={18} color="#fff" />
            </Pressable>
          </View>
        </LinearGradient>

        {pinnedChips.length > 0 && (
          <View className="border-b border-slate-200 bg-white px-4 py-2">
            <Pressable
              onPress={() => pinnedChips[0]?.msg_id && highlightMessage(pinnedChips[0].msg_id)}
              className="flex-row items-center justify-between rounded-2xl bg-slate-100 px-3 py-2"
            >
              <View className="mr-3 flex-1">
                <Text className="text-[13px] font-semibold text-slate-700" numberOfLines={1}>
                  {`@${pinnedChips[0]?.sender_name || 'Thành viên'}`}
                </Text>
                <Text className="text-[13px] text-slate-500" numberOfLines={1}>
                  {getMessageBodyText(pinnedChips[0])}
                </Text>
              </View>
              <View className="rounded-full border border-slate-300 px-3 py-1">
                <Text className="text-[12px] font-semibold text-slate-600">+{pinnedChips.length}</Text>
              </View>
            </Pressable>
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
                      onLongPress={() => {
                        setReplyToMessage(item);
                        handleMessageAction(item);
                      }}
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
            />
          )}
        </View>

        <ChatComposer
          value={messageText}
          onChangeText={setMessageText}
          onSend={() => void onSendMessage()}
          replyToMessage={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
          disabled={!conversationId || !userIdForChat}
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