import React, { useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { ChatMessage } from '@/types';
import { formatMessageDate, getMessageBodyText, resolveMediaUrl } from '@/utils/chat';
import { CornerUpLeft, FileText, Music, Play } from 'lucide-react-native';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  showSenderName?: boolean;
  highlight?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onReplyPress?: () => void;
  onImagePress?: (index: number) => void;
}

const getFileName = (message: ChatMessage) => {
  const firstContent = Array.isArray(message.content) ? message.content[0] : undefined;
  if (!firstContent) return 'Tệp đính kèm';
  if (typeof firstContent === 'string') {
    return firstContent.split('/').pop()?.split('?')[0] || 'Tệp đính kèm';
  }
  return firstContent.name || firstContent.text || firstContent.url || 'Tệp đính kèm';
};

const getMediaValue = (item: string | Record<string, unknown>) => {
  if (typeof item === 'string') return item;
  const candidate = item as { url?: string; text?: string; name?: string };
  return candidate.url || candidate.text || candidate.name || '';
};

const getReactionSummary = (message: ChatMessage) => {
  const counts = new Map<string, number>();
  (message.reactions || []).forEach((reaction) => {
    counts.set(reaction.type, (counts.get(reaction.type) || 0) + 1);
  });

  return Array.from(counts.entries()).slice(0, 3);
};

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isMine,
  showSenderName = false,
  highlight = false,
  onPress,
  onLongPress,
  onReplyPress,
  onImagePress,
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

  const bubbleStyle = isMine
    ? 'bg-brand-600 border-brand-600'
    : 'bg-white border-slate-200';

  const textStyle = isMine ? 'text-white' : 'text-slate-900';
  const metaStyle = isMine ? 'text-white/75' : 'text-slate-400';

  const imageItems = Array.isArray(message.content) ? message.content : [];

  return (
    <View className={`mb-2 px-4 ${isMine ? 'items-end' : 'items-start'}`}>
      {showSenderName && !isMine && (
        <Text className="mb-1 ml-1 text-[12px] font-semibold text-slate-500">
          {message.sender_name || 'Thành viên'}
        </Text>
      )}

      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        className={`max-w-[86%] rounded-[22px] border px-3 py-2.5 ${bubbleStyle} ${highlight ? 'ring-2 ring-brand-300' : ''}`}
      >
        {message.reply_to && (
          <Pressable
            onPress={onReplyPress}
            className={`mb-2 rounded-2xl border px-3 py-2 ${isMine ? 'border-white/20 bg-white/10' : 'border-slate-200 bg-slate-50'}`}
          >
            <View className="flex-row items-center gap-2">
              <CornerUpLeft size={12} color={isMine ? '#fff' : '#64748b'} />
              <Text className={`flex-1 text-[12px] font-semibold ${isMine ? 'text-white' : 'text-slate-600'}`} numberOfLines={1}>
                {message.reply_to.sender_name || 'Tin nhắn trước'}
              </Text>
            </View>
            <Text className={`mt-1 text-[12px] ${isMine ? 'text-white/80' : 'text-slate-500'}`} numberOfLines={2}>
              {message.reply_to.content}
            </Text>
          </Pressable>
        )}

        {message.type === 'image' && imageItems.length > 0 ? (
          <View className="gap-2">
            {imageItems.length === 1 ? (
              <Pressable onPress={() => onImagePress?.(0)} className="overflow-hidden rounded-2xl">
                <Image
                  source={{ uri: resolveMediaUrl(getMediaValue(imageItems[0])) }}
                  className="h-56 w-64 rounded-2xl"
                  resizeMode="cover"
                />
              </Pressable>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {imageItems.slice(0, 4).map((item, index) => {
                  const isFourth = index === 3 && imageItems.length > 4;
                  return (
                    <Pressable
                      key={`${message._id}-${index}`}
                      onPress={() => onImagePress?.(index)}
                      className="relative overflow-hidden rounded-2xl"
                    >
                      <Image
                        source={{ uri: resolveMediaUrl(getMediaValue(item)) }}
                        className="h-28 w-28 rounded-2xl"
                        resizeMode="cover"
                      />
                      {isFourth && (
                        <View className="absolute inset-0 items-center justify-center rounded-2xl bg-black/45">
                          <Text className="text-lg font-semibold text-white">
                            +{imageItems.length - 4}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : message.type === 'file' ? (
          <View className={`flex-row items-center gap-3 rounded-2xl px-3 py-2 ${isMine ? 'bg-white/10' : 'bg-slate-50'}`}>
            <View className={`h-10 w-10 items-center justify-center rounded-2xl ${isMine ? 'bg-white/15' : 'bg-brand-50'}`}>
              <FileText size={18} color={isMine ? '#fff' : '#8b5e34'} />
            </View>
            <View className="flex-1">
              <Text className={`text-[13px] font-semibold ${textStyle}`} numberOfLines={2}>
                {getFileName(message)}
              </Text>
              <Text className={`text-[11px] ${metaStyle}`}>Tệp đính kèm</Text>
            </View>
          </View>
        ) : message.type === 'video' ? (
          <View className={`flex-row items-center gap-3 rounded-2xl px-3 py-2 ${isMine ? 'bg-white/10' : 'bg-slate-50'}`}>
            <View className={`h-10 w-10 items-center justify-center rounded-2xl ${isMine ? 'bg-white/15' : 'bg-brand-50'}`}>
              <Play size={18} color={isMine ? '#fff' : '#8b5e34'} />
            </View>
            <View className="flex-1">
              <Text className={`text-[13px] font-semibold ${textStyle}`} numberOfLines={2}>
                {contentText}
              </Text>
              <Text className={`text-[11px] ${metaStyle}`}>Video</Text>
            </View>
          </View>
        ) : message.type === 'audio' ? (
          <View className={`flex-row items-center gap-3 rounded-2xl px-3 py-2 ${isMine ? 'bg-white/10' : 'bg-slate-50'}`}>
            <View className={`h-10 w-10 items-center justify-center rounded-2xl ${isMine ? 'bg-white/15' : 'bg-brand-50'}`}>
              <Music size={18} color={isMine ? '#fff' : '#8b5e34'} />
            </View>
            <View className="flex-1">
              <Text className={`text-[13px] font-semibold ${textStyle}`} numberOfLines={2}>
                {contentText}
              </Text>
              <Text className={`text-[11px] ${metaStyle}`}>Âm thanh</Text>
            </View>
          </View>
        ) : (
          <Text className={`text-[15px] leading-5 ${textStyle}`}>
            {contentText}
          </Text>
        )}

        <View className="mt-2 flex-row items-center justify-between gap-2">
          <Text className={`text-[11px] ${metaStyle}`}>
            {formatMessageDate(message.createdAt || message.created_at)}
          </Text>

          {!!reactions.length && (
            <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${isMine ? 'bg-white/12' : 'bg-slate-100'}`}>
              {reactions.map(([emoji, count]) => (
                <Text key={emoji} className={`text-[11px] font-semibold ${isMine ? 'text-white' : 'text-slate-600'}`}>
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
