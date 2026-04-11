import React from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatMessage, ChatMessageContent } from '@/types/entities/chat';
import { formatConversationTime, shouldShowTimestamp } from '@/utils/chat';
import { ChatMessageBubble } from './ChatMessageBubble';

type Props = {
  loading: boolean;
  messages: ChatMessage[];
  listRef: React.RefObject<FlatList<ChatMessage>>;
  onScroll: (event: any) => void;
  onContentSizeChange: (width: number, height: number) => void;
  onScrollToIndexFailed: (info: { averageItemLength: number; index: number }) => void;
  userIdForChat?: string | number;
  isGroup: boolean;
  highlightedMessageId?: string | null;
  getMessageKey: (message: ChatMessage) => string;
  onMessageLongPress: (message: ChatMessage) => void;
  onReplyPress: (replyToMsgId: string) => void;
  onImagePreview: (imageUrl: string) => void;
  accentColor: string;
};

export const ChatMessagesList: React.FC<Props> = ({
  loading,
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
}) => {
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={accentColor} />
        <Text className="mt-3 text-[14px] text-slate-500">Đang tải cuộc trò chuyện...</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={getMessageKey}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onContentSizeChange={onContentSizeChange}
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
      onScrollToIndexFailed={onScrollToIndexFailed}
      renderItem={({ item, index }) => {
        const prevMessage = messages[index - 1];
        const isMine = String(item.sender_id) === String(userIdForChat || '');
        const showTimestamp = shouldShowTimestamp(
          item.createdAt || item.created_at,
          prevMessage?.createdAt || prevMessage?.created_at,
        );
        const showSenderName =
          isGroup &&
          !isMine &&
          (index === 0 || prevMessage?.sender_id !== item.sender_id || showTimestamp);

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
              mineAccentColor={accentColor}
              showSenderName={showSenderName}
              highlight={highlightedMessageId === getMessageKey(item)}
              onLongPress={() => onMessageLongPress(item)}
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
  );
};
