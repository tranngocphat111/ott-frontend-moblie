import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import type { ChatConversation, ChatMessage, ChatMessageContent } from '@/types/entities/chat';
import {
  formatMessageTimestampLabel,
  getMessageSenderAvatar,
  resolveMediaUrl,
  shouldBreakMessageCluster,
  shouldShowTimestampAtClusterEnd,
} from '@/utils/chat';
import { ChatMessageBubble } from './ChatMessageBubble';
import { useAuth } from '@/context/Authcontext';

type Props = {
  loading: boolean;
  preparing?: boolean;
  messages: ChatMessage[];
  conversation?: ChatConversation | null;
  listRef: React.RefObject<any>;
  onScroll: (event: any) => void;
  onContentSizeChange: (width: number, height: number) => void;
  onScrollToIndexFailed: (info: { averageItemLength: number; index: number }) => void;
  userIdForChat?: string | number;
  isGroup: boolean;
  highlightedMessageId?: string | null;
  getMessageKey: (message: ChatMessage) => string;
  onMessageLongPress: (message: ChatMessage, event?: any) => void;
  onReplyPress: (replyToMsgId: string) => void;
  onImagePreview: (imageUrl: string) => void;
  accentColor: string;
  mineAccentColor: string;
};

export const ChatMessagesList: React.FC<Props> = ({
  loading,
  preparing = false,
  messages,
  listRef,
  onScroll,
  onContentSizeChange,
  onScrollToIndexFailed,
  userIdForChat,
  isGroup,
  highlightedMessageId,
  getMessageKey,
  onMessageLongPress,
  onReplyPress,
  onImagePreview,
  accentColor,
  mineAccentColor,
  conversation,
}) => {
  const { user, chatUserId } = useAuth();
  const currentUserId = String(chatUserId || user?.id || userIdForChat || '');

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={accentColor} />
        <Text className="mt-3 text-[14px] text-slate-500">Đang tải cuộc trò chuyện...</Text>
      </View>
    );
  }

  return (
    <View className="relative flex-1">
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={getMessageKey}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
        const prevMessage = messages[index - 1];
        const nextMessage = messages[index + 1];
        const isMine = String(item.sender_id) === String(userIdForChat || '');
        const clusterStart = shouldBreakMessageCluster(
          prevMessage?.createdAt || prevMessage?.created_at,
          item.createdAt || item.created_at,
          prevMessage?.sender_id,
          item.sender_id,
        );
        const showTimestamp = shouldShowTimestampAtClusterEnd(
          item.createdAt || item.created_at,
          nextMessage?.createdAt || nextMessage?.created_at,
        );
        const showSenderName = isGroup && !isMine && clusterStart;
        const senderAvatar = getMessageSenderAvatar(conversation, item.sender_id, currentUserId);

        return (
          <View className="px-2">
            {showTimestamp && (
              <View className="my-2 w-full items-center">
                <View className="rounded-full bg-slate-200 px-3 py-1">
                  <Text className="text-[11px] font-medium text-slate-600">
                    {formatMessageTimestampLabel(item.createdAt || item.created_at)}
                  </Text>
                </View>
              </View>
            )}

            <View className={`flex-row px-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && clusterStart ? (
                <View className="mr-2 mt-1 h-8 w-8 overflow-hidden rounded-full bg-slate-200">
                  {senderAvatar ? (
                    <Image source={{ uri: resolveMediaUrl(senderAvatar) }} className="h-full w-full" contentFit="cover" transition={120} />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Feather name="user" size={15} color="#8b5e34" />
                    </View>
                  )}
                </View>
              ) : !isMine ? (
                <View className="mr-2 h-8 w-8" />
              ) : null}

              <View className={`${isMine ? 'items-end' : 'items-start'} max-w-[80%]`}>
                {showSenderName && !isMine && (
                  <Text className="mb-1 ml-1 text-[12px] font-semibold text-slate-500">
                    {item.sender_name || 'Thành viên'}
                  </Text>
                )}

                <ChatMessageBubble
                  message={item}
                  isMine={isMine}
                  mineAccentColor={mineAccentColor}
                  showSenderName={false}
                  highlight={highlightedMessageId === getMessageKey(item)}
                  onLongPress={(event) => onMessageLongPress(item, event)}
                  onReplyPress={() => item.reply_to_msg_id && onReplyPress(item.reply_to_msg_id)}
                  onImagePress={(imageIndex) => {
                    const imageItems = Array.isArray(item.content)
                      ? item.content.filter(
                          (content): content is ChatMessageContent => typeof content !== 'string',
                        )
                      : [];
                    const selected = (imageItems[imageIndex] as any)?.url || '';
                    if (selected) onImagePreview(selected);
                  }}
                />
              </View>
            </View>
          </View>
        );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 py-24">
            <Feather name="message-square" size={32} color="#94a3b8" />
            <Text className="mt-3 text-[15px] font-semibold text-slate-900">Chưa có tin nhắn</Text>
            <Text className="mt-2 text-center text-[13px] leading-5 text-slate-500">
              Hãy gửi lời chào đầu tiên để bắt đầu cuộc trò chuyện.
            </Text>
          </View>
        }
      />

      {preparing && messages.length > 0 && (
        <View className="absolute inset-0 items-center justify-center bg-surface-sunken/75">
          <ActivityIndicator size="small" color={accentColor} />
          <Text className="mt-2 text-[13px] text-slate-500">Đang đồng bộ vị trí tin nhắn...</Text>
        </View>
      )}
    </View>
  );
};
