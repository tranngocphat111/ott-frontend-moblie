import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME_COLORS } from '@/constants/theme';
import type { ChatCategory } from '@/services/api/chat';

interface CategorySelectionModalProps {
  visible: boolean;
  categories: ChatCategory[];
  selectedCategoryIds: string[];
  onToggleCategory: (categoryId: string) => void;
  onApply: () => void;
  onClear: () => void;
  onManageCategories: () => void;
  onClose: () => void;
}

export const CategorySelectionModal: React.FC<CategorySelectionModalProps> = ({
  visible,
  categories,
  selectedCategoryIds,
  onToggleCategory,
  onApply,
  onClear,
  onManageCategories,
  onClose,
}) => {
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (!visible) {
      translateY.setValue(24);
      return;
    }

    translateY.setValue(24);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}
          onPress={onClose}
        />
        <Animated.View style={{ transform: [{ translateY }], maxHeight: '82%' }}>
          <View className="rounded-t-[28px] bg-white px-4 pb-6 pt-4">
              <View className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-slate-200" />
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-[20px] font-bold text-slate-900">Thẻ phân loại</Text>
                <Pressable onPress={onManageCategories} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <Feather name="settings" size={18} color={THEME_COLORS.neutral.slate700} />
                </Pressable>
              </View>

              <ScrollView className="max-h-[58vh]" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {categories.map((category) => {
                  const checked = selectedCategoryIds.includes(category._id);
                  return (
                    <Pressable
                      key={category._id}
                      onPress={() => onToggleCategory(category._id)}
                      className="mb-2 flex-row items-center rounded-2xl border border-slate-200 px-3 py-3"
                    >
                      <View
                        className="mr-3 h-4 w-4 rounded-sm"
                        style={{ backgroundColor: category.color || THEME_COLORS.neutral.slate400 }}
                      />
                      <Text className="flex-1 text-[15px] text-slate-900">{category.name}</Text>
                      <View className={`h-6 w-6 items-center justify-center rounded-full border ${checked ? 'border-primary-600 bg-primary-600' : 'border-slate-300 bg-white'}`}>
                        {checked ? <Feather name="check" size={14} color={THEME_COLORS.neutral.white} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View className="mt-4 flex-row gap-3">
                <Pressable onPress={onClear} className="flex-1 items-center rounded-full bg-slate-200 py-3">
                  <Text className="text-[15px] font-semibold text-slate-500">Bỏ chọn</Text>
                </Pressable>
                <Pressable onPress={onApply} className="flex-1 items-center rounded-full bg-primary-500 py-3">
                  <Text className="text-[15px] font-semibold text-white">Áp dụng</Text>
                </Pressable>
              </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

