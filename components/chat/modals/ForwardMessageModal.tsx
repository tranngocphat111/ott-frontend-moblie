import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatConversationWithParticipant, ChatMessage } from '@/types/entities/chat';
import { getConversationTitle, getMessageBodyText } from '@/utils/chat';

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
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const normalizedList = useMemo<ForwardConversationItem[]>(() => {
    return (conversations || [])
      .map((item) => item?.conversation)
      .filter((conversation): conversation is NonNullable<typeof conversation> => !!conversation?._id)
      .map((conversation) => ({
        id: String(conversation._id),
        title: getConversationTitle(conversation, currentUserId) || 'Hội thoại',
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
      <View className="flex-1 bg-black/35 px-4 py-10">
        <Pressable className="absolute inset-0" onPress={closeAndReset} />

        <View className="mt-auto rounded-[24px] border border-slate-200 bg-white shadow-2xl">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
            <Text className="text-[17px] font-semibold text-slate-900">Chuyển tiếp tin nhắn</Text>
            <Pressable onPress={closeAndReset} className="rounded-full p-1.5 active:bg-slate-100">
              <Feather name="x" size={18} color="#475569" />
            </Pressable>
          </View>

          <View className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <Text className="mb-1 text-[12px] uppercase tracking-wide text-slate-500">Nội dung chuyển tiếp</Text>
            <Text className="text-[14px] text-slate-800" numberOfLines={2}>{previewText}</Text>
          </View>

          <View className="px-4 py-3">
            <View className="mb-3 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
              <Feather name="search" size={15} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm bạn bè hoặc nhóm"
                placeholderTextColor="#94a3b8"
                className="ml-2 h-11 flex-1 text-[14px] text-slate-900"
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
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View className="items-center py-8">
                    <Text className="text-[13px] text-slate-500">Không tìm thấy hội thoại phù hợp</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <Pressable
                      onPress={() => toggleSelect(item.id)}
                      className={`mb-1.5 flex-row items-center justify-between rounded-xl border px-3 py-2.5 ${selected ? 'border-[#b78457] bg-[#fff8f1]' : 'border-slate-200 bg-white'}`}
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-[14px] font-semibold text-slate-900" numberOfLines={1}>{item.title}</Text>
                        <Text className="mt-0.5 text-[12px] text-slate-500">{item.type === 'group' ? 'Nhóm' : 'Bạn bè'}</Text>
                      </View>
                      {selected && <Feather name="check-circle" size={18} color="#b78457" />}
                    </Pressable>
                  );
                }}
              />
            )}
          </View>

          <View className="flex-row items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <Pressable onPress={closeAndReset} className="rounded-lg px-3 py-2 active:bg-slate-200">
              <Text className="text-[14px] font-medium text-slate-600">Hủy</Text>
            </Pressable>
            <Pressable
              disabled={selectedIds.length === 0 || isSubmitting}
              onPress={() => void handleConfirm()}
              className={`rounded-lg px-4 py-2 ${selectedIds.length === 0 || isSubmitting ? 'bg-slate-300' : 'bg-[#b78457]'}`}
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
