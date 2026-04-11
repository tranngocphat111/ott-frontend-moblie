import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatMessage } from '@/types';
import { getMessageBodyText } from '@/utils/chat';

interface ChatComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onToggleEmoji?: () => void;
  onToggleImagePanel?: () => void;
  onToggleVoicePanel?: () => void;
  onPickFile?: () => void;
  emojiActive?: boolean;
  imagePanelActive?: boolean;
  voicePanelActive?: boolean;
  replyToMessage?: ChatMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  accentColor?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChangeText,
  onSend,
  onToggleEmoji,
  onToggleImagePanel,
  onToggleVoicePanel,
  onPickFile,
  emojiActive = false,
  imagePanelActive = false,
  voicePanelActive = false,
  replyToMessage,
  onCancelReply,
  disabled = false,
  accentColor = '#2563eb',
}) => {
  const canSend = value.trim().length > 0 && !disabled;
  const actionButtonClass = 'h-9 w-9 items-center justify-center rounded-full';

  return (
    <View className="border-t border-slate-200 bg-white px-4  py-2">
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

      <View className="flex-row items-center rounded-[26px] border border-slate-200 bg-slate-50 px-3 py-2">
        <Pressable className={actionButtonClass} onPress={onToggleEmoji} disabled={disabled}>
          <Feather name="smile" size={18} color={emojiActive ? accentColor : '#64748b'} />
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

        {canSend ? (
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            <Feather name="send" size={16} color="#fff" />
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-1">
            <Pressable className={actionButtonClass} onPress={onPickFile} disabled={disabled}>
              <Feather name="file" size={18} color="#475569" />
            </Pressable>
            <Pressable className={actionButtonClass} onPress={onToggleVoicePanel} disabled={disabled}>
              <Feather name="mic" size={18} color={voicePanelActive ? accentColor : '#475569'} />
            </Pressable>
            <Pressable className={actionButtonClass} onPress={onToggleImagePanel} disabled={disabled}>
              <Feather name="image" size={18} color={imagePanelActive ? accentColor : '#475569'} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};
