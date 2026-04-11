import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME_COLORS } from '@/constants/theme';

export type ConversationFilterMode = 'all' | 'unread' | 'category';

interface ConversationFilterModalProps {
  visible: boolean;
  onChangeFilterMode: (mode: ConversationFilterMode) => void;
  onOpenCategoryPicker: () => void;
  onClose: () => void;
}

export const ConversationFilterModal: React.FC<ConversationFilterModalProps> = ({
  visible,
  onChangeFilterMode,
  onOpenCategoryPicker,
  onClose,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/15" onPress={onClose}>
        <View className="items-end px-4 pt-40">
          <View className="w-56 rounded-[24px] bg-white px-4 py-3 shadow-2xl shadow-black/20">
            <Pressable
              onPress={() => {
                onChangeFilterMode('unread');
                onClose();
              }}
              className="flex-row items-center gap-3 rounded-2xl px-1 py-2.5"
            >
              <Feather name="message-circle" size={18} color={THEME_COLORS.chat.otherText} />
              <Text className="text-[16px] text-slate-900">Chưa đọc</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                onOpenCategoryPicker();
                onClose();
              }}
              className="flex-row items-center gap-3 rounded-2xl px-1 py-2.5"
            >
              <Feather name="tag" size={18} color={THEME_COLORS.chat.otherText} />
              <Text className="text-[16px] text-slate-900">Thẻ phân loại</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

