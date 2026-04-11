import React, { memo, useMemo } from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import type { ChatMessage } from '@/types';
import { getMessageBodyText } from '@/utils/chat';
import { CornerUpLeft } from 'lucide-react-native';
import { ChatFileMessage } from './message-types/ChatFileMessage';
import { ChatImageMessage } from './message-types/ChatImageMessage';
import { ChatVideoMessage } from './message-types/ChatVideoMessage';
import { ChatAudioMessage } from './message-types/ChatAudioMessage';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  showSenderName?: boolean;
  highlight?: boolean;
  onPress?: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  onReplyPress?: () => void;
  onImagePress?: (index: number) => void;
  mineAccentColor?: string;
}

const getReactionSummary = (message: ChatMessage) => {
  const counts = new Map<string, number>();
  (message.reactions || []).forEach((reaction) => {
    counts.set(reaction.type, (counts.get(reaction.type) || 0) + 1);
  });

  return Array.from(counts.entries()).slice(0, 3);
};

const ChatMessageBubbleBase: React.FC<ChatMessageBubbleProps> = ({
  message,
  isMine,
  showSenderName = false,
  highlight = false,
  onPress,
  onLongPress,
  onReplyPress,
  onImagePress,
  mineAccentColor = '#dff0ff',
}) => {
  const contentText = getMessageBodyText(message);
  const reactions = useMemo(() => getReactionSummary(message), [message]);

  if (message.type === 'system_add') {
    return (
      <View className="my-2 items-center px-4">
        <View className="max-w-[92%] rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5">
          <Text className="text-center text-[12px] text-slate-500">{contentText}</Text>
        </View>
      </View>
    );
  }

  const bubbleStyle = isMine ? 'bg-white border-[#e7d5c4]' : 'bg-white border-slate-200';

  const textStyle = isMine ? 'text-slate-800' : 'text-slate-900';
  const metaStyle = isMine ? 'text-slate-500' : 'text-slate-400';
  const isMediaVisual = message.type === 'image' || message.type === 'video' || message.type === 'audio';

  return (
    <View className={`mb-1 ${isMine ? 'items-end' : 'items-start'}`}>
      {showSenderName && !isMine && (
        <Text className="mb-1 ml-1 text-[12px] font-semibold text-slate-500">
          {message.sender_name || 'Thành viên'}
        </Text>
      )}

      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        className={`max-w-full rounded-xl border ${isMediaVisual ? 'p-0' : 'px-3 py-2.5'} ${bubbleStyle}`}
        style={[
          isMine ? { backgroundColor: mineAccentColor, borderColor: '#e0c3ad' } : undefined,
          isMediaVisual ? { backgroundColor: 'transparent', borderColor: 'transparent' } : undefined,
          highlight ? { borderColor: '#d2a177', borderWidth: 2 } : undefined,
        ]}
      >
        {message.reply_to && (
          <Pressable
            onPress={onReplyPress}
            className={`mb-2 rounded-xl border px-3 py-2 ${isMine ? 'border-[#e7d5c4] bg-white/70' : 'border-slate-200 bg-slate-50'}`}
          >
            <View className="flex-row items-center gap-2">
              <CornerUpLeft size={12} color={isMine ? '#b78457' : '#64748b'} />
              <Text className={`flex-1 text-[12px] font-semibold ${isMine ? 'text-slate-700' : 'text-slate-600'}`} numberOfLines={1}>
                {message.reply_to.sender_name || 'Tin nhắn trước'}
              </Text>
            </View>
            <Text className={`mt-1 text-[12px] ${isMine ? 'text-slate-600' : 'text-slate-500'}`} numberOfLines={2}>
              {message.reply_to.content}
            </Text>
          </Pressable>
        )}

        {message.type === 'image' ? (
          <ChatImageMessage message={message} onImagePress={onImagePress} />
        ) : message.type === 'file' ? (
          <ChatFileMessage message={message} isMine={isMine} />
        ) : message.type === 'video' ? (
          <ChatVideoMessage message={message} onPress={onPress} />
        ) : message.type === 'audio' ? (
          <ChatAudioMessage message={message} isMine={isMine} accentColor={mineAccentColor} />
        ) : (
          <Text className={`text-[15px] leading-5 ${textStyle}`}>
            {contentText}
          </Text>
        )}

        <View className="mt-1 flex-row items-center justify-end gap-2">
          {!!reactions.length && (
            <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${isMine ? 'bg-white/70' : 'bg-slate-100'}`}>
              {reactions.map(([emoji, count]) => (
                <Text key={emoji} className={`text-[11px] font-semibold ${isMine ? 'text-slate-700' : 'text-slate-600'}`}>
                  {emoji} {count}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
};

export const ChatMessageBubble = memo(ChatMessageBubbleBase);
