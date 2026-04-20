import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface ChatExtraPanelProps {
  visible: boolean;
  onClose: () => void;
  onPickFile: () => void;
  onOpenPoll: () => void;
  accentColor?: string;
  height?: number;
}

export const ChatExtraPanel: React.FC<ChatExtraPanelProps> = ({
  visible,
  onClose,
  onPickFile,
  onOpenPoll,
  accentColor = '#b78457',
  height = 260,
}) => {
  if (!visible) return null;

  const CHAT_BROWN = '#d2a177';
  const CHAT_BLUE = '#3b82f6';

  return (
    <View className="bg-white px-6 py-8">
      <View className="flex-row items-center justify-around">
        <View className="items-center gap-3">
          <Pressable
            onPress={() => {
              onPickFile();
              onClose();
            }}
            className="h-16 w-16 items-center justify-center rounded-[22px]"
            style={{ backgroundColor: '#eff6ff' }}
          >
            <MaterialCommunityIcons name="file-document" size={28} color={CHAT_BLUE} />
          </Pressable>
          <Text className="text-[13px] font-bold text-slate-500">Tài liệu</Text>
        </View>

        <View className="items-center gap-3">
          <Pressable
            onPress={() => {
              onOpenPoll();
              onClose();
            }}
            className="h-16 w-16 items-center justify-center rounded-[22px]"
            style={{ backgroundColor: '#fdf8f4' }}
          >
            <MaterialCommunityIcons name="poll" size={28} color={CHAT_BROWN} />
          </Pressable>
          <Text className="text-[13px] font-bold text-slate-500">Bình chọn</Text>
        </View>
      </View>
    </View>
  );
};
