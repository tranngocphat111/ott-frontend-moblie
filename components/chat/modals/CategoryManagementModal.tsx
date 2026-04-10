import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Alert, Easing, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME_COLORS } from '@/constants/theme';
import type { ChatCategory } from '@/services/api/chat';
import { ChatApi } from '@/services/api';

const DEFAULT_COLORS = ['#EF4444', '#F97316', '#EAB308', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];

interface CategoryManagementModalProps {
  visible: boolean;
  userId?: string | null;
  categories: ChatCategory[];
  onClose: () => void;
  onReload: () => Promise<void> | void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  visible,
  userId,
  categories,
  onClose,
  onReload,
}) => {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const translateY = useRef(new Animated.Value(24)).current;

  const editingCategory = useMemo(
    () => categories.find((item) => item._id === editingId) || null,
    [categories, editingId],
  );

  const resetForm = () => {
    setAdding(false);
    setEditingId(null);
    setName('');
    setColor(DEFAULT_COLORS[0]);
  };

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setName('');
    setColor(DEFAULT_COLORS[0]);
  };

  const startEdit = (category: ChatCategory) => {
    setEditingId(category._id);
    setAdding(false);
    setName(category.name || '');
    setColor(category.color || DEFAULT_COLORS[0]);
  };

  const handleSave = async () => {
    if (!userId || !name.trim()) return;
    try {
      setSaving(true);
      if (adding) {
        await ChatApi.createCategory({
          userId,
          name: name.trim(),
          color,
          order: categories.length,
        });
      } else if (editingCategory) {
        await ChatApi.updateCategory(editingCategory._id, {
          name: name.trim(),
          color,
        });
      }
      await onReload();
      resetForm();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thẻ phân loại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      setSaving(true);
      await ChatApi.deleteCategory(categoryId);
      await onReload();
      if (editingId === categoryId) resetForm();
    } catch {
      Alert.alert('Lỗi', 'Không thể xóa thẻ phân loại');
    } finally {
      setSaving(false);
    }
  };

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
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1">
        <Pressable className="absolute inset-0 bg-black/35" onPress={onClose} />
        <View className="flex-1 justify-end">
          <Animated.View style={{ transform: [{ translateY }] }}>
            <Pressable className="max-h-[88%] rounded-t-[28px] bg-white px-4 pb-6 pt-4" onPress={() => undefined}>
          <View className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-slate-200" />
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[20px] font-bold text-slate-900">Quản lý thẻ phân loại</Text>
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Feather name="x" size={18} color={THEME_COLORS.neutral.slate700} />
            </Pressable>
          </View>

          <ScrollView className="max-h-[52vh]" showsVerticalScrollIndicator={false}>
            {categories.map((category) => (
              <View key={category._id} className="mb-2 rounded-2xl border border-slate-200 px-3 py-3">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-row flex-1 items-center gap-3">
                    <View className="h-4 w-4 rounded-sm" style={{ backgroundColor: category.color || THEME_COLORS.neutral.slate400 }} />
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-slate-900">{category.name}</Text>
                      <Text className="text-[12px] text-slate-500">Màu {category.color || THEME_COLORS.neutral.slate400}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Pressable onPress={() => startEdit(category)} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                      <Feather name="edit-2" size={15} color={THEME_COLORS.neutral.slate700} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(category._id)} className="h-9 w-9 items-center justify-center rounded-full bg-red-50">
                      <Feather name="trash-2" size={15} color={THEME_COLORS.error.border} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="mt-4 rounded-2xl border border-slate-200 p-3">
            <Text className="mb-3 text-[13px] font-semibold text-slate-500">
              {adding ? 'Thêm thẻ mới' : editingId ? 'Chỉnh sửa thẻ' : 'Thêm thẻ mới'}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tên thẻ..."
              className="mb-3 rounded-xl border border-slate-200 px-3 py-3 text-[15px] text-slate-900"
            />
            <View className="mb-4 flex-row flex-wrap gap-2">
              {DEFAULT_COLORS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setColor(item)}
                  className={`h-8 w-8 rounded-full ${color === item ? 'border-2 border-slate-900' : ''}`}
                  style={{ backgroundColor: item }}
                />
              ))}
            </View>
            <View className="flex-row gap-3">
              <Pressable onPress={resetForm} className="flex-1 items-center rounded-full bg-slate-200 py-3">
                <Text className="text-[15px] font-semibold text-slate-600">Hủy</Text>
              </Pressable>
              <Pressable onPress={handleSave} disabled={saving || !name.trim()} className="flex-1 items-center rounded-full bg-primary-600 py-3">
                <Text className="text-[15px] font-semibold text-white">{saving ? 'Đang lưu...' : 'Lưu'}</Text>
              </Pressable>
            </View>
          </View>

          {!adding && !editingId && (
            <Pressable onPress={startAdd} className="mt-3 flex-row items-center justify-center rounded-full border border-dashed border-slate-300 py-3">
              <Feather name="plus" size={16} color={THEME_COLORS.neutral.slate500} />
              <Text className="ml-2 text-[15px] font-semibold text-slate-600">Thêm thẻ phân loại</Text>
            </Pressable>
          )}
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

