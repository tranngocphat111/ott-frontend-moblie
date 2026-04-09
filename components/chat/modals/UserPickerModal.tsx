import React from 'react';
import { FlatList, Image, Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatServiceUser } from '@/services/api/chat';

interface UserPickerModalProps {
  visible: boolean;
  users: ChatServiceUser[];
  selectedUserId?: string | null;
  loading: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export const UserPickerModal: React.FC<UserPickerModalProps> = ({
  visible,
  users,
  selectedUserId,
  loading,
  onClose,
  onSelectUser,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/35" onPress={onClose}>
        <Pressable className="max-h-[78%] rounded-t-[28px] bg-white px-4 pb-6 pt-4" onPress={() => undefined}>
          <View className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-slate-200" />
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[18px] font-bold text-slate-900">Chọn user chat</Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <Feather name="x" size={18} color="#334155" />
            </Pressable>
          </View>

          {loading ? (
            <View className="items-center py-8">
              <Text className="text-[14px] text-slate-500">Đang tải user...</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item._id || item.user_id}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => {
                const isSelected = item.user_id === selectedUserId;
                return (
                  <Pressable
                    onPress={() => onSelectUser(item.user_id)}
                    className={`mb-2 flex-row items-center rounded-2xl border px-3 py-3 ${isSelected ? 'border-[#8b6642] bg-[#f7efe7]' : 'border-slate-200 bg-white'}`}
                  >
                    <View className="mr-3 h-12 w-12 overflow-hidden rounded-full bg-slate-200 items-center justify-center">
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} className="h-full w-full" />
                      ) : (
                        <Feather name="user" size={18} color="#94a3b8" />
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-slate-900" numberOfLines={1}>
                        {item.name || item.user_id}
                      </Text>
                      <Text className="text-[12px] text-slate-500" numberOfLines={1}>
                        {item.user_id}
                      </Text>
                    </View>

                    {isSelected ? (
                      <View className="h-6 w-6 items-center justify-center rounded-full bg-[#8b6642]">
                        <Feather name="check" size={14} color="#fff" />
                      </View>
                    ) : (
                      <Feather name="chevron-right" size={18} color="#94a3b8" />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
