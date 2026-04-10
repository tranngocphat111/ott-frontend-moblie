import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { ChatConversationWithParticipant } from '@/types';
import {
  formatConversationTime,
  getConversationAvatar,
  getConversationTitle,
  getMessageBodyText,
} from '@/utils/chat';
import { Feather } from 'lucide-react-native';

interface ConversationItemProps {
  item: ChatConversationWithParticipant;
  currentUserId?: string;
  onPress: () => void;
}

const getInitials = (value: string) => {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  return tokens.slice(0, 2).map((token) => token[0]).join('').toUpperCase() || '?';
};

export const ConversationItem: React.FC<ConversationItemProps> = ({
  item,
  currentUserId,
  onPress,
}) => {
  const { conversation, participant } = item;
  const title = getConversationTitle(conversation, currentUserId);
  const avatar = getConversationAvatar(conversation, currentUserId);
  const unreadCount = participant.unread_count || 0;
  const isPinned = !!participant.settings?.is_pinned;
  const isOnline = conversation.participants?.some(
    (member) => member.status === 'online' && String(member.user_id || '') !== String(currentUserId || ''),
  );
  const previewText = conversation.last_message
    ? getMessageBodyText({
        _id: conversation.last_message.msg_id,
        msg_id: conversation.last_message.msg_id,
        content: [{ type: conversation.last_message.type, text: conversation.last_message.content }],
        type: conversation.last_message.type,
        created_at: conversation.last_message.createdAt,
        sender_id: conversation.last_message.sender_id,
        sender_name: conversation.last_message.sender_name,
      })
    : 'Bắt đầu cuộc trò chuyện';

  return (
    <Pressable
      onPress={onPress}
      className="border-b border-slate-100 bg-white px-4 py-3.5"
    >
      <View className="flex-row items-center">
        <View className="relative mr-3">
          {avatar ? (
            <Image source={{ uri: avatar }} className="h-14 w-14 rounded-full bg-slate-100" />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-200">
              <Text className="text-base font-bold text-slate-600">
                {getInitials(title)}
              </Text>
            </View>
          )}

          {isOnline && (
            <View className="absolute bottom-0 right-0 h-4 w-4 items-center justify-center rounded-full bg-white">
              <View className="h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </View>
          )}
        </View>

        <View className="flex-1">
          <View className="mb-1 flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-[16px] font-semibold text-slate-900" numberOfLines={1}>
              {title}
            </Text>
            <View className="flex-row items-center gap-2">
              {isPinned && <Feather name="pin" size={13} color="#1d84f2" />}
              <Text className="text-xs font-medium text-slate-400">
                {formatConversationTime(conversation.last_message?.createdAt)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-[13px] leading-5 text-slate-500" numberOfLines={1}>
              {conversation.last_message?.sender_id === String(currentUserId || '')
                ? `Bạn: ${previewText}`
                : previewText}
            </Text>

            {unreadCount > 0 && (
              <View className="min-w-[22px] rounded-full bg-brand-600 px-2 py-1">
                <Text className="text-center text-[11px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
};
