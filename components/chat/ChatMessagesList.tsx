import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import type { ChatConversation, ChatMessage } from '@/types/entities/chat';
import {
  formatMessageTimestampLabel,
  getOptimizedImageUrl,
  getMessageSenderName,
  getMessageSenderAvatar,
  isCallMessageType,
  isSystemMessageType,
  resolveMediaUrl,
  shouldBreakMessageCluster,
  shouldShowTimestampAtClusterEnd,
} from '@/utils/chat';
import { ChatMessageBubble } from './ChatMessageBubble';
import { useAuth } from '@/context/Authcontext';
import { Image as ExpoImage } from 'expo-image';

const getInitials = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '?';

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0].slice(0, 1).toUpperCase();
  }

  return `${tokens[0].slice(0, 1)}${tokens[tokens.length - 1].slice(0, 1)}`.toUpperCase();
};

const resolveParticipantDisplayName = (
  conversation: ChatConversation | null | undefined,
  userId: string,
) => {
  const participant = conversation?.participants?.find(
    (item) => String(item?.user_id || '') === String(userId || ''),
  );

  return (
    String(participant?.nickname || '').trim() ||
    String(participant?.display_name || '').trim() ||
    String(participant?.name || '').trim() ||
    ''
  );
};

const personalizeSystemAddMessage = (
  message: ChatMessage,
  conversation: ChatConversation | null | undefined,
  currentUserId: string,
) => {
  const action = String(message?.system_meta?.action || '').toLowerCase();
  if (action !== 'member_added') {
    return message;
  }

  const addedUserIds = Array.isArray(message?.system_meta?.added_user_ids)
    ? message.system_meta?.added_user_ids || []
    : [];

  if (!addedUserIds.length) {
    return message;
  }

  const addedDisplayNames = addedUserIds.map((id) => {
    if (String(id) === String(currentUserId)) {
      return 'bạn';
    }

    return resolveParticipantDisplayName(conversation, String(id)) || 'Thành viên';
  });

  const addedBy = String(message?.system_meta?.added_by || message?.sender_id || '');
  const adderName =
    String(addedBy) === String(currentUserId)
      ? 'bạn'
      : resolveParticipantDisplayName(conversation, addedBy) || String(message?.sender_name || 'Ai đó');

  const contentText = `${addedDisplayNames.join(', ')} được ${adderName} thêm vào nhóm`;

  return {
    ...message,
    content: [contentText],
  };
};

export const SenderAvatar: React.FC<{ name: string; avatarUrl?: string }> = ({ name, avatarUrl }) => {
  const [hasError, setHasError] = useState(false);
  const showImage = !!avatarUrl && !hasError;

  return (
    <View className="mr-2 mt-1 h-8 w-8 overflow-hidden rounded-full bg-[#f0e2d5]">
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
          className="h-full w-full"
          onError={() => setHasError(true)}
        />
      ) : (
        <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
          <Text className="text-[12px] font-bold text-[#8b5e34]">
            {getInitials(name)}
          </Text>
        </View>
      )}
    </View>
  );
};

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
  onCallPress?: (message: ChatMessage) => void;
  onReactionPress?: (message: ChatMessage, emoji: string) => void;
  onMediaReady?: (messageId: string) => void;
  accentColor: string;
  mineAccentColor: string;
  footerComponent?: React.ReactNode;
  onDeleteConversation?: () => void;
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
  onCallPress,
  onReactionPress,
  onMediaReady,
  accentColor,
  mineAccentColor,
  footerComponent,
  conversation,
  onDeleteConversation,
}) => {
  const { user, chatUserId } = useAuth();
  const currentUserId = String(chatUserId || user?.id || userIdForChat || '');

  return (
    <View className="relative flex-1">
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={getMessageKey}
        onScroll={onScroll}
        removeClippedSubviews
        drawDistance={560}
        scrollEventThrottle={16}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
        // showsVerticalScrollIndicator={false}
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
        const senderName = getMessageSenderName(item, conversation);
        const senderAvatar = item.sender_avatar || getMessageSenderAvatar(conversation, item.sender_id, currentUserId, item.sender_avatar);
        const senderAvatarUrl = getOptimizedImageUrl(senderAvatar, 'avatar') || resolveMediaUrl(senderAvatar);
        const isHighlighted = highlightedMessageId === getMessageKey(item);

        if (isSystemMessageType(item.type)) {
          const displaySystemMessage = personalizeSystemAddMessage(item, conversation, currentUserId);
          const action = String(item.system_meta?.action || '').toLowerCase();
          const isOwner = String(conversation?.created_by || '') === currentUserId;
          const isRemovedUser = String(item.system_meta?.removed_user_id || '') === currentUserId;
          const showDeleteAction =
            (action === 'group_dissolved' && !isOwner && item.system_meta?.show_delete_for_non_owner) ||
            (action === 'removed_from_group' && isRemovedUser && item.system_meta?.show_delete_action);

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

              <View className="w-full items-center px-2">
                <ChatMessageBubble
                  message={displaySystemMessage}
                  isMine={false}
                  mineAccentColor={mineAccentColor}
                  showSenderName={false}
                  highlight={highlightedMessageId === getMessageKey(item)}
                  onReactionPress={onReactionPress}
                />

                {showDeleteAction && (
                  <Pressable
                    onPress={onDeleteConversation}
                    className="mt-2 rounded-full border border-red-200 bg-red-50 px-4 py-2"
                  >
                    <Text className="text-[13px] font-semibold text-red-600">
                      Xóa cuộc trò chuyện này
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }

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

            <View
              className={`flex-row rounded-2xl px-2 ${isMine ? 'justify-end' : 'justify-start'} ${isHighlighted ? 'bg-[#f5ece4]' : ''}`}
              style={isHighlighted ? { paddingVertical: 4 } : undefined}
            >
              {!isMine && clusterStart ? (
                <SenderAvatar name={senderName} avatarUrl={senderAvatarUrl} />
              ) : !isMine ? (
                <View className="mr-2 h-8 w-8" />
              ) : null}

              <View className={`${isMine ? 'items-end' : 'items-start'} max-w-[80%]`}>
                {showSenderName && !isMine && (
                  <Text className="mb-1 ml-1 text-[12px] font-semibold text-slate-500">
                    {senderName}
                  </Text>
                )}

                <ChatMessageBubble
                  message={item}
                  isMine={isMine}
                  mineAccentColor={mineAccentColor}
                  showSenderName={false}
                  highlight={isHighlighted}
                  onReactionPress={onReactionPress}
                  onMediaReady={onMediaReady}
                  onPress={
                    item.type === 'video'
                      ? () => {
                          const firstContent = Array.isArray(item.content) ? item.content[0] : item.content;
                          const raw = typeof firstContent === 'string'
                            ? firstContent
                            : firstContent && typeof firstContent === 'object'
                              ? firstContent.url || firstContent.text || firstContent.name || ''
                              : '';
                          const selected = resolveMediaUrl(String(raw || ''));
                          if (selected) {
                            onImagePreview(selected);
                          }
                        }
                      : isCallMessageType(item.type)
                        ? () => onCallPress?.(item)
                      : undefined
                  }
                  onLongPress={(event) => onMessageLongPress(item, event)}
                  onReplyPress={() => item.reply_to_msg_id && onReplyPress(item.reply_to_msg_id)}
                  onImagePress={(imageIndex) => {
                    // Keep extraction logic aligned with ChatImageMessage (content items -> url only),
                    // otherwise indexes can diverge and open the wrong image.
                    const imageItems = Array.isArray(item.content)
                      ? item.content
                          .map((content) => (typeof content === 'string' ? content : (content as any)?.url))
                          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
                          .map((value) => resolveMediaUrl(String(value)))
                      : [];

                    const selected = imageItems[imageIndex];
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
        ListFooterComponent={
          footerComponent ? <View className="pb-2 pt-1">{footerComponent}</View> : null
        }
      />

    </View>
  );
};
