import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatMessage } from '@/types';
import { getMessageBodyText } from '@/utils/chat';

interface ChatComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  replyToMessage?: ChatMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChangeText,
  onSend,
  replyToMessage,
  onCancelReply,
  disabled = false,
}) => {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View className="border-t border-slate-200 bg-white px-4 pb-3 pt-2">
      {replyToMessage && (
        <View className="mb-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[12px] font-semibold text-slate-600">Đang trả lời</Text>
              <Text className="mt-0.5 text-[13px] text-slate-500" numberOfLines={1}>
                {getMessageBodyText(replyToMessage)}
              </Text>
            </View>
            <Pressable onPress={onCancelReply} className="h-8 w-8 items-center justify-center rounded-full bg-white">
              <Feather name="x" size={16} color="#64748b" />
            </Pressable>
          </View>
        </View>
      )}

      <View className="flex-row items-end gap-3 rounded-[26px] border border-slate-200 bg-slate-50 px-3 py-2.5">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
          <Feather name="plus" size={18} color="#8b5e34" />
        </Pressable>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Nhập tin nhắn"
          placeholderTextColor="#94a3b8"
          multiline
          textAlignVertical="center"
          className="max-h-28 flex-1 px-1 py-2 text-[15px] text-slate-900"
        />

        <Pressable
          onPress={onSend}
          disabled={!canSend}
          className={`h-11 w-11 items-center justify-center rounded-full ${canSend ? 'bg-brand-600' : 'bg-slate-300'}`}
        >
          <Feather name="send" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
};
