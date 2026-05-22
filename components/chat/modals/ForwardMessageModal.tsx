import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatConversationWithParticipant, ChatMessage } from '@/types/entities/chat';
import {
  getAvatarFallbackLabel,
  getConversationAvatar,
  getConversationTitle,
  getMessageBodyText,
} from '@/utils/chat';

type Props = {
  visible: boolean;
  message: ChatMessage | null;
  conversations: ChatConversationWithParticipant[];
  currentConversationId?: string;
  currentUserId?: string;
  isLoadingConversations?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (conversationIds: string[]) => Promise<void> | void;
};

type ForwardConversationItem = {
  id: string;
  title: string;
  avatar: string;
  type: 'private' | 'group';
};

export const ForwardMessageModal: React.FC<Props> = ({
  visible,
  message,
  conversations,
  currentConversationId,
  currentUserId,
  isLoadingConversations = false,
  isSubmitting = false,
  onClose,
  onConfirm,
}) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const normalizedList = useMemo<ForwardConversationItem[]>(() => {
    return (conversations || [])
      .map((item) => item?.conversation)
      .filter((conversation): conversation is NonNullable<typeof conversation> => !!conversation?._id)
      .map((conversation) => ({
        id: String(conversation._id),
        title: getConversationTitle(conversation, currentUserId) || 'Hội thoại',
        avatar: getConversationAvatar(conversation, currentUserId),
        type: conversation.type,
      }))
      .sort((left, right) => {
        if (left.id === String(currentConversationId || '')) return -1;
        if (right.id === String(currentConversationId || '')) return 1;
        return left.title.localeCompare(right.title, 'vi');
      });
  }, [conversations, currentConversationId, currentUserId]);

  const filteredList = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return normalizedList;

    return normalizedList.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
  }, [normalizedList, query]);

  if (!visible || !message) return null;

  const previewText = getMessageBodyText(message) || '[Tin nhắn]';

  const closeAndReset = () => {
    if (isSubmitting) return;
    setQuery('');
    setSelectedIds([]);
    onClose();
  };

  const toggleSelect = (conversationId: string) => {
    setSelectedIds((current) => (
      current.includes(conversationId)
        ? current.filter((id) => id !== conversationId)
        : [...current, conversationId]
    ));
  };

  const handleConfirm = async () => {
    if (!selectedIds.length || isSubmitting) return;
    await onConfirm(selectedIds);
    setQuery('');
    setSelectedIds([]);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={closeAndReset}
    >
      <View className="flex-1 justify-end bg-black/35">
        <Pressable className="absolute inset-0" onPress={closeAndReset} />

        <View
          className="max-h-[82%] rounded-t-[28px] bg-white shadow-2xl"
          style={{ paddingBottom: Math.max(insets.bottom, 10) }}
        >
          <View className="h-5 items-center justify-center">
            <View className="h-1.5 w-12 rounded-full bg-slate-200" />
          </View>

          <View className="flex-row items-center justify-between px-5 pb-4 pt-1">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-[22px] font-black text-slate-950">Chuyển tiếp</Text>
              <Text className="mt-1 text-[13px] font-medium text-slate-500" numberOfLines={1}>
                {previewText}
              </Text>
            </View>
            <Pressable onPress={closeAndReset} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200">
              <Feather name="x" size={20} color="#334155" />
            </Pressable>
          </View>

          <View className="px-5 pb-3">
            <View className="mb-4 flex-row items-center rounded-2xl bg-slate-100 px-4">
              <Feather name="search" size={17} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm bạn bè hoặc nhóm"
                placeholderTextColor="#94a3b8"
                className="ml-2 h-12 flex-1 text-[15px] font-medium text-slate-900"
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            {isLoadingConversations ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" color="#b78457" />
                <Text className="mt-2 text-[13px] text-slate-500">Đang tải danh sách hội thoại...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredList}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 390 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View className="items-center py-8">
                    <Text className="text-[13px] text-slate-500">Không tìm thấy hội thoại phù hợp</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const selected = selectedIds.includes(item.id);
                  const showAvatar = !!item.avatar && item.avatar !== 'SPECIAL_AVATAR_SELF';
                  return (
                    <Pressable
                      onPress={() => toggleSelect(item.id)}
                      className={`mb-2 flex-row items-center rounded-2xl px-3 py-3 ${
                        selected ? 'bg-[#fff7ed]' : 'bg-white'
                      }`}
                      style={{
                        shadowColor: '#111827',
                        shadowOpacity: selected ? 0.08 : 0.04,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: selected ? 3 : 1,
                      }}
                    >
                      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#f1e5da]">
                        {showAvatar ? (
                          <Image source={{ uri: item.avatar }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <Text className="text-[15px] font-black text-[#9a6a43]">
                            {getAvatarFallbackLabel(item.title)}
                          </Text>
                        )}
                      </View>
                      <View className="ml-3 flex-1 pr-3">
                        <Text className="text-[15px] font-bold text-slate-950" numberOfLines={1}>{item.title}</Text>
                        <Text className="mt-0.5 text-[12px] font-medium text-slate-500">{item.type === 'group' ? 'Nhóm' : 'Bạn bè'}</Text>
                      </View>
                      <View
                        className={`h-7 w-7 items-center justify-center rounded-full ${
                          selected ? 'bg-[#9a6a43]' : 'bg-slate-100'
                        }`}
                      >
                        {selected && <Feather name="check" size={15} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>

          <View className="flex-row items-center gap-3 border-t border-slate-100 bg-white px-5 py-3">
            <Pressable onPress={closeAndReset} className="h-12 flex-1 items-center justify-center rounded-2xl bg-slate-100 active:bg-slate-200">
              <Text className="text-[14px] font-bold text-slate-600">Hủy</Text>
            </Pressable>
            <Pressable
              disabled={selectedIds.length === 0 || isSubmitting}
              onPress={() => void handleConfirm()}
              className={`h-12 flex-[1.35] items-center justify-center rounded-2xl ${selectedIds.length === 0 || isSubmitting ? 'bg-slate-300' : 'bg-[#9a6a43]'}`}
            >
              <Text className="text-[14px] font-semibold text-white">
                {isSubmitting ? 'Đang chuyển tiếp...' : `Chuyển tiếp (${selectedIds.length})`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
