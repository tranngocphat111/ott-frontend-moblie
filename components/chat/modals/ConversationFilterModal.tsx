import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
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
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      return;
    }

    slideAnim.setValue(-10);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/15" onPress={onClose}>
        <Animated.View style={{ opacity: fadeAnim }} className="absolute right-4 top-16">
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
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
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

