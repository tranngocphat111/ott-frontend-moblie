import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatMessage } from '@/types';
import { getMessageBodyText } from '@/utils/chat';

type Props = {
  pinnedMessages: ChatMessage[];
  showPinnedList: boolean;
  onTogglePinnedList: () => void;
  onHighlightMessage: (messageId: string) => void;
};

export const ChatPinnedMessagesBar: React.FC<Props> = ({
  pinnedMessages,
  showPinnedList,
  onTogglePinnedList,
  onHighlightMessage,
}) => {
  if (pinnedMessages.length === 0) return null;

  const pinnedChips = pinnedMessages.slice(0, 3);
  const pinnedCount = pinnedMessages.length;

  return (
    <View className="border-b border-slate-200 bg-[#faf7f4] px-4 py-2">
      <View className="flex-row items-center gap-2 rounded-2xl border border-[#ead8c6] bg-white px-3 py-2 shadow-sm">
        <Pressable
          onPress={() => pinnedChips[0]?.msg_id && onHighlightMessage(pinnedChips[0].msg_id)}
          className="flex-1"
        >
          <Text className="text-[13px] font-semibold text-slate-800" numberOfLines={1}>
            {`@${pinnedChips[0]?.sender_name || 'Thành viên'}`}
          </Text>
          <Text className="text-[13px] text-slate-500" numberOfLines={1}>
            {getMessageBodyText(pinnedChips[0])}
          </Text>
        </Pressable>

        <Pressable
          onPress={onTogglePinnedList}
          className="flex-row items-center rounded-full border border-[#e7d5c4] bg-[#faf3ec] px-3 py-1"
        >
          <Text className="mr-1 text-[12px] font-semibold text-[#b78457]">
            +{pinnedCount}
          </Text>
          <Feather
            name={showPinnedList ? 'chevron-up' : 'chevron-down'}
            size={13}
            color="#b78457"
          />
        </Pressable>
      </View>

      {showPinnedList && (
        <View className="mt-2 gap-2">
          {pinnedMessages.map((item) => (
            <Pressable
              key={item.msg_id || item._id}
              onPress={() => item.msg_id && onHighlightMessage(item.msg_id)}
              className="rounded-xl border border-[#ead8c6] bg-white px-3 py-2"
            >
              <Text className="text-[12px] font-semibold text-slate-800" numberOfLines={1}>
                {item.sender_name || 'Thành viên'}
              </Text>
              <Text className="mt-0.5 text-[13px] text-slate-500" numberOfLines={2}>
                {getMessageBodyText(item)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};
