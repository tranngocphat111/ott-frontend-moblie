import React, { useRef } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatMessage } from '@/types/entities/chat';
import { getMessageBodyText } from '@/utils/chat';

interface ChatComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onToggleImagePanel?: () => void;
  onToggleVoicePanel?: () => void;
  onPickFile?: () => void;
  onToggleExtraPanel?: () => void;
  imagePanelActive?: boolean;
  voicePanelActive?: boolean;
  extraPanelActive?: boolean;
  replyToMessage?: ChatMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  accentColor?: string;
  selectedMediaIds?: string[];
  onClearSelection?: () => void;
  onSendSelected?: () => void;
  onInputFocus?: () => void;
  onInputPressIn?: () => void;
  isGroup?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChangeText,
  onSend,
  onToggleImagePanel,
  onToggleVoicePanel,
  onPickFile,
  onToggleExtraPanel,
  imagePanelActive = false,
  voicePanelActive = false,
  extraPanelActive = false,
  replyToMessage,
  onCancelReply,
  disabled = false,
  accentColor = '#2563eb',
  selectedMediaIds = [],
  onClearSelection,
  onSendSelected,
  onInputFocus,
  onInputPressIn,
  isGroup = false,
}) => {
  const textInputRef = useRef<TextInput>(null);
  const canSend = value.trim().length > 0 && !disabled;
  const actionButtonClass = 'h-9 w-9 items-center justify-center rounded-full';
  const selectedCount = selectedMediaIds.length;

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

      {selectedCount > 0 ? (
        <View className="h-14 flex-row items-center justify-between gap-2 rounded-[26px] border border-slate-200 bg-slate-50 px-3 py-2">
          <Pressable onPress={onClearSelection} className="h-9 w-9 items-center justify-center">
            <Feather name="chevron-left" size={24} color="#334155" />
          </Pressable>
          <Text className="flex-1 text-center text-[15px] font-semibold text-slate-700">{selectedCount} được chọn</Text>
          <Pressable disabled={selectedCount === 0} onPress={onSendSelected} className="h-9 w-9 items-center justify-center">
            <Feather name="send" size={26} color={accentColor} />
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center rounded-[26px] border border-slate-200 bg-slate-50 px-3 py-2">

          <TextInput
            ref={textInputRef}
            value={value}
            onChangeText={onChangeText}
            onFocus={onInputFocus}
            onPressIn={onInputPressIn}
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
              {isGroup ? (
                <Pressable
                  className={actionButtonClass}
                  onPress={() => {
                    Keyboard.dismiss();
                    textInputRef.current?.blur();
                    onToggleExtraPanel?.();
                  }}
                  disabled={disabled}
                >
                  <Feather name="more-horizontal" size={20} color={extraPanelActive ? accentColor : '#475569'} />
                </Pressable>
              ) : (
                <Pressable
                  className={actionButtonClass}
                  onPress={() => {
                    Keyboard.dismiss();
                    textInputRef.current?.blur();
                    onPickFile?.();
                  }}
                  disabled={disabled}
                >
                  <Feather name="paperclip" size={20} color="#475569" />
                </Pressable>
              )}
              <Pressable
                className={actionButtonClass}
                onPress={() => {
                  Keyboard.dismiss();
                  textInputRef.current?.blur();
                  onToggleVoicePanel?.();
                }}
                disabled={disabled}
              >
                <Feather name="mic" size={18} color={voicePanelActive ? accentColor : '#475569'} />
              </Pressable>
              <Pressable
                className={actionButtonClass}
                onPress={() => {
                  Keyboard.dismiss();
                  textInputRef.current?.blur();
                  onToggleImagePanel?.();
                }}
                disabled={disabled}
              >
                <Feather name="image" size={18} color={imagePanelActive ? accentColor : '#475569'} />
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
};
