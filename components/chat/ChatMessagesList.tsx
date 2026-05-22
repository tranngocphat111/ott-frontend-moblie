import React, { memo, useState } from 'react';
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
import { CHAT_API_CONFIG } from '@/configuration/api';

const getFullUrl = (url?: string) => {
  return resolveMediaUrl(url);
};

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

const isMessageCursorAtLeast = (cursor: unknown, msgId: unknown) => {
  try {
    return BigInt(String(cursor || "0")) >= BigInt(String(msgId || "0"));
  } catch {
    return false;
  }
};

const getParticipantUserId = (participant: any) =>
  String(participant?.user_id || participant?._id || '').trim();

const getParticipantDisplayName = (participant: any) =>
  String(
    participant?.nickname ||
    participant?.display_name ||
    participant?.name ||
    participant?.user?.name ||
    participant?.user_id ||
    'Người dùng',
  ).trim();

const getParticipantAvatar = (participant: any) =>
  String(
    participant?.avatar ||
    participant?.avatar_url ||
    participant?.profile_picture ||
    participant?.user?.avatar ||
    participant?.user?.avatar_url ||
    '',
  ).trim();

const isHiddenCallMessageType = (type?: string | null) => {
  const normalizedType = String(type || '').toLowerCase();
  return normalizedType === 'call_start' || normalizedType === 'call_join';
};

const canShowDeliveryForMessage = (message?: ChatMessage | null) =>
  Boolean(
    message &&
    !isSystemMessageType(message.type) &&
    !isHiddenCallMessageType(message.type) &&
    !message.is_deleted &&
    !message.is_revoked,
  );

const isJoinedParticipant = (participant: any) => {
  const status = String(
    participant?.membership_status ||
    participant?.participant_status ||
    participant?.status ||
    '',
  ).toLowerCase();
  return status !== 'invited' && status !== 'removed';
};

const getDeliverySummary = (
  message: ChatMessage,
  conversation: ChatConversation | null | undefined,
  currentUserId: string,
) => {
  const currentMsgId = String(message?.msg_id || message?._id || '').trim();
  if (!currentMsgId) {
    if (message.local_status === 'uploading') return { label: 'Đang gửi', seen: false, seenParticipants: [] as any[] };
    if (message.local_status === 'error') return { label: 'Gửi lỗi', seen: false, seenParticipants: [] as any[] };
    return { label: 'Đã gửi', seen: false, seenParticipants: [] as any[] };
  }

  const recipients = ((conversation?.participants || []) as any[]).filter((participant) => {
    const participantUserId = getParticipantUserId(participant);
    return participantUserId && participantUserId !== currentUserId && isJoinedParticipant(participant);
  });

  const recipientCount = recipients.length;
  const deliveredCount = recipients.filter((participant) =>
    isMessageCursorAtLeast(participant.last_delivered_message_id, currentMsgId),
  ).length;
  const seenCount = recipients.filter((participant) =>
    isMessageCursorAtLeast(participant.last_read_message_id, currentMsgId),
  ).length;
  const seenParticipants = recipients.filter((participant) =>
    isMessageCursorAtLeast(participant.last_read_message_id, currentMsgId),
  );

  if (recipientCount === 0) return { label: 'Đã gửi', seen: false, seenParticipants };

  const isGroupConversation = conversation?.type === 'group' || recipientCount > 1;
  if (!isGroupConversation) {
    if (seenCount === 1) return { label: 'Đã xem', seen: true, seenParticipants };
    if (deliveredCount === 1) return { label: 'Đã nhận', seen: false, seenParticipants };
    return { label: 'Đã gửi', seen: false, seenParticipants };
  }

  if (seenCount === recipientCount) return { label: 'Tất cả đã xem', seen: true, seenParticipants };
  if (seenCount > 0) return { label: `Đã xem ${seenCount}/${recipientCount}`, seen: true, seenParticipants };
  return { label: deliveredCount > 0 ? 'Đã gửi' : 'Đã gửi', seen: false, seenParticipants };
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
  const showImage = !!avatarUrl && avatarUrl !== 'SPECIAL_AVATAR_SELF' && !hasError;

  return (
    <View className="mr-2 mt-1 h-8 w-8 overflow-hidden rounded-full bg-[#f0e2d5]">
      {avatarUrl === 'SPECIAL_AVATAR_SELF' ||
       name?.toLowerCase().includes('my documents') ||
       name?.toLowerCase().includes('truyền file') ||
       name?.toLowerCase().includes('cloud của tôi') ? (
        <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
          <Text className="text-[16px]">📁</Text>
        </View>
      ) : showImage ? (
        <Image
          source={{ uri: getFullUrl(avatarUrl) }}
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

const SeenAvatarBase: React.FC<{ participant: any }> = ({ participant }) => {
  const [hasError, setHasError] = useState(false);
  const name = getParticipantDisplayName(participant);
  const avatarUrl = getOptimizedImageUrl(getParticipantAvatar(participant), 'avatar') || resolveMediaUrl(getParticipantAvatar(participant));
  const showImage = !!avatarUrl && !hasError;

  return (
    <View className="-ml-1.5 h-4 w-4 overflow-hidden rounded-full border border-white bg-[#f0e2d5]">
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
          className="h-full w-full"
          onError={() => setHasError(true)}
        />
      ) : (
        <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
          <Text className="text-[8px] font-bold text-[#8b5e34]">
            {getInitials(name)}
          </Text>
        </View>
      )}
    </View>
  );
};

const SeenAvatar = memo(SeenAvatarBase);

type DeliverySummary = ReturnType<typeof getDeliverySummary>;

const DeliveryStatusBase: React.FC<{ summary: DeliverySummary }> = ({ summary }) => {
  const seenParticipants = summary.seenParticipants || [];

  if (seenParticipants.length > 0) {
    const visibleParticipants = seenParticipants.slice(0, 3);
    const hiddenCount = Math.max(0, seenParticipants.length - visibleParticipants.length);

    return (
      <View className="mt-[-5px] min-h-4 flex-row items-center justify-end pr-1">
        <Pressable
          className="flex-row items-center justify-end pl-2 active:opacity-80"
          accessibilityLabel={summary.label}
        >
          {hiddenCount > 0 && (
            <View className="z-10 h-4 min-w-4 items-center justify-center rounded-full border border-white bg-slate-500 px-1 shadow-sm">
              <Text className="text-[8px] font-bold leading-none text-white">
                +{hiddenCount}
              </Text>
            </View>
          )}
          {visibleParticipants.map((participant: any, avatarIndex: number) => (
            <SeenAvatar
              key={`${getParticipantUserId(participant) || getParticipantDisplayName(participant)}-${avatarIndex}`}
              participant={participant}
            />
          ))}
        </Pressable>
      </View>
    );
  }

  const isSending = summary.label === 'Đang gửi';
  const isError = summary.label === 'Gửi lỗi';

  return (
    <View className="mt-[-5px] min-h-4 flex-row items-center justify-end pr-1">
      <View
        className={`flex-row items-center rounded-full px-1.5 py-0.5 ${
          isError ? 'bg-red-50' : 'bg-transparent'
        }`}
      >
        <Feather
          name={isSending ? 'clock' : isError ? 'alert-circle' : 'check'}
          size={11}
          color={isError ? '#dc2626' : '#94a3b8'}
        />
        <Text
          className={`ml-1 text-[11px] font-medium ${
            isError ? 'text-red-600' : 'text-slate-400'
          }`}
        >
          {summary.label}
        </Text>
      </View>
    </View>
  );
};

const DeliveryStatus = memo(DeliveryStatusBase);

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
  translatedMessages?: Record<string, string>;
  onTranslateMessage?: (msgId: string) => void;
  translatingMessageId?: string | null;
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
  translatedMessages = {},
  onTranslateMessage,
  translatingMessageId,
}) => {
  const { user, chatUserId } = useAuth();
  const currentUserId = String(chatUserId || user?.id || userIdForChat || '');

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const latestOwnMessageId = React.useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (
        String(message.sender_id || '') === String(currentUserId || '') &&
        canShowDeliveryForMessage(message)
      ) {
        return getMessageKey(message);
      }
    }
    return '';
  }, [currentUserId, getMessageKey, messages]);

  // Group messages
  const displayData = React.useMemo<any[]>(() => {
    const items: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!isSystemMessageType(msg.type)) {
        items.push({ type: 'message', message: msg, key: getMessageKey(msg) });
        continue;
      }

      let endIdx = i;
      while (endIdx + 1 < messages.length && isSystemMessageType(messages[endIdx + 1].type)) {
        endIdx++;
      }

      const groupMsgs = messages.slice(i, endIdx + 1);
      if (groupMsgs.length >= 2) {
        const groupKey = `sys-group-${getMessageKey(groupMsgs[0])}-${getMessageKey(groupMsgs[groupMsgs.length - 1])}`;
        items.push({ type: 'system-group', messages: groupMsgs, key: groupKey });
      } else {
        items.push({ type: 'message', message: msg, key: getMessageKey(msg) });
      }
      i = endIdx;
    }
    return items;
  }, [messages, getMessageKey]);

  return (
    <View className="relative flex-1">
      <FlashList
        ref={listRef}
        data={displayData}
        keyExtractor={(item: any) => item.key}
        onScroll={onScroll}
        removeClippedSubviews
        drawDistance={560}
        scrollEventThrottle={16}
        {...({ maintainVisibleContentPosition: { minIndexForVisible: 0 } } as any)}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: 8,
          flexGrow: 1,
          justifyContent: 'flex-end',
        } as any}
        renderItem={({ item, index }: { item: any; index: number }) => {
          const olderItem = displayData[index - 1];

          const getOldestMsg = (it: any) => it?.type === 'system-group' ? it.messages[0] : it?.message;
          const getNewestMsg = (it: any) => it?.type === 'system-group' ? it.messages[it.messages.length - 1] : it?.message;

          const currentOldest = getOldestMsg(item);
          const olderNewest = getNewestMsg(olderItem);

          const showTimestamp = shouldShowTimestampAtClusterEnd(
            currentOldest?.createdAt || currentOldest?.created_at,
            olderNewest?.createdAt || olderNewest?.created_at,
          );

          if (item.type === 'system-group') {
            const groupMsgs = item.messages as ChatMessage[];
            const isExpanded = !!expandedGroups[item.key];
            const visibleMsgs = isExpanded ? groupMsgs : [];

            return (
              <View className="px-2">
                {showTimestamp && (
                  <View className="my-2 w-full items-center">
                    <View className="rounded-full bg-slate-200 px-3 py-1">
                      <Text className="text-[11px] font-medium text-slate-600">
                        {formatMessageTimestampLabel(currentOldest?.createdAt || currentOldest?.created_at)}
                      </Text>
                    </View>
                  </View>
                )}

                {!isExpanded && (
                  <View className="my-1 w-full items-center">
                    <Pressable
                      onPress={() => setExpandedGroups(prev => ({ ...prev, [item.key]: true }))}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1"
                    >
                      <Text className="text-[12px] text-slate-600 font-medium">Xem {groupMsgs.length} thông báo</Text>
                    </Pressable>
                  </View>
                )}

                {visibleMsgs.map((sysMsg: ChatMessage) => {
                  const displaySystemMessage = personalizeSystemAddMessage(sysMsg, conversation, currentUserId);
                  return (
                    <View key={getMessageKey(sysMsg)} className="w-full items-center px-2 py-0.5">
                      <ChatMessageBubble
                        message={displaySystemMessage}
                        isMine={false}
                        conversation={conversation}
                        isGroupConversation={isGroup}
                        mineAccentColor={mineAccentColor}
                        showSenderName={false}
                        highlight={highlightedMessageId === getMessageKey(sysMsg)}
                        onReactionPress={onReactionPress}
                      />
                    </View>
                  );
                })}

                {isExpanded && (
                  <View className="my-1 w-full items-center">
                    <Pressable
                      onPress={() => setExpandedGroups(prev => ({ ...prev, [item.key]: false }))}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1"
                    >
                      <Text className="text-[12px] text-slate-600 font-medium">Thu gọn thông báo</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }

          const msg = item.message as ChatMessage;
          const isMine = String(msg.sender_id) === String(userIdForChat || '');
          const clusterStart = shouldBreakMessageCluster(
            olderNewest?.createdAt || olderNewest?.created_at,
            msg.createdAt || msg.created_at,
            olderNewest?.sender_id,
            msg.sender_id,
          );

          const showSenderName = isGroup && !isMine && clusterStart;
          const senderName = getMessageSenderName(msg, conversation);
          const senderAvatar = msg.sender_avatar || getMessageSenderAvatar(conversation, msg.sender_id, currentUserId, msg.sender_avatar);
          const senderAvatarUrl = getOptimizedImageUrl(senderAvatar, 'avatar') || resolveMediaUrl(senderAvatar);
          const isHighlighted = highlightedMessageId === getMessageKey(msg);
          const messageKey = getMessageKey(msg);
          const shouldShowDeliveryStatus =
            isMine &&
            !!messageKey &&
            messageKey === latestOwnMessageId &&
            canShowDeliveryForMessage(msg);
          const deliverySummary = shouldShowDeliveryStatus
            ? getDeliverySummary(msg, conversation, currentUserId)
            : null;

          if (isSystemMessageType(msg.type)) {
            const displaySystemMessage = personalizeSystemAddMessage(msg, conversation, currentUserId);
            const action = String(msg.system_meta?.action || '').toLowerCase();
            const isOwner = String(conversation?.created_by || '') === currentUserId;
            const isRemovedUser = String(msg.system_meta?.removed_user_id || '') === currentUserId;
            const showDeleteAction =
              (action === 'group_dissolved' && !isOwner && msg.system_meta?.show_delete_for_non_owner) ||
              (action === 'removed_from_group' && isRemovedUser && msg.system_meta?.show_delete_action);

            return (
              <View className="px-2">
                {showTimestamp && (
                  <View className="my-2 w-full items-center">
                    <View className="rounded-full bg-slate-200 px-3 py-1">
                      <Text className="text-[11px] font-medium text-slate-600">
                        {formatMessageTimestampLabel(msg.createdAt || msg.created_at)}
                      </Text>
                    </View>
                  </View>
                )}

                <View className="w-full items-center px-2">
                  <ChatMessageBubble
                    message={displaySystemMessage}
                    isMine={false}
                    conversation={conversation}
                    isGroupConversation={isGroup}
                    mineAccentColor={mineAccentColor}
                    showSenderName={false}
                    highlight={isHighlighted}
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
                      {formatMessageTimestampLabel(msg.createdAt || msg.created_at)}
                    </Text>
                  </View>
                </View>
              )}

              <View
                key={getMessageKey(msg)}
                className={`w-full flex-row px-2 py-0.5 ${msg.type === 'poll' ? 'justify-center' : isMine ? 'justify-end' : 'justify-start'} ${isHighlighted ? 'bg-[#f5ece4]' : ''}`}
                style={isHighlighted ? { paddingVertical: 4 } : undefined}
              >
                {msg.type !== 'poll' && (
                  !isMine && clusterStart ? (
                    <SenderAvatar name={senderName} avatarUrl={senderAvatarUrl} />
                  ) : !isMine ? (
                    <View className="mr-2 h-8 w-8" />
                  ) : null
                )}

                <View className={`${msg.type === 'poll' ? 'items-center w-full' : isMine ? 'items-end' : 'items-start'} ${msg.type === 'poll' ? '' : 'max-w-[80%]'}`}>
                  {showSenderName && !isMine && msg.type !== 'poll' && (
                    <Text className="mb-1 ml-1 text-[12px] font-semibold text-slate-500">
                      {senderName}
                    </Text>
                  )}

                  <ChatMessageBubble
                    message={msg}
                    isMine={isMine}
                    conversation={conversation}
                    isGroupConversation={isGroup}
                    mineAccentColor={mineAccentColor}
                    showSenderName={false}
                    highlight={isHighlighted}
                    onReactionPress={onReactionPress}
                    onMediaReady={onMediaReady}
                    onPress={
                      msg.type === 'video'
                        ? () => {
                          const firstContent = Array.isArray(msg.content) ? msg.content[0] : msg.content;
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
                        : isCallMessageType(msg.type)
                          ? () => onCallPress?.(msg)
                          : undefined
                    }
                    onLongPress={(event) => onMessageLongPress(msg, event)}
                    onReplyPress={() => msg.reply_to_msg_id && onReplyPress(msg.reply_to_msg_id)}
                    onImagePress={(imageIndex) => {
                      const imageItems = Array.isArray(msg.content)
                        ? msg.content
                          .map((content) => (typeof content === 'string' ? content : (content as any)?.url))
                          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
                          .map((value) => resolveMediaUrl(String(value)))
                        : [];

                      const selected = imageItems[imageIndex];
                      if (selected) onImagePreview(selected);
                    }}
                    translatedText={translatedMessages[getMessageKey(msg)]}
                    onTranslate={onTranslateMessage ? () => onTranslateMessage(getMessageKey(msg)) : undefined}
                    isTranslating={translatingMessageId === getMessageKey(msg)}
                  />

                  {deliverySummary && <DeliveryStatus summary={deliverySummary} />}
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
          loading && !displayData.length ? null :
            footerComponent ? <View className="pb-2 pt-1">{footerComponent}</View> : <View className="pb-2 pt-1" />
        }
      />
    </View>
  );
};
