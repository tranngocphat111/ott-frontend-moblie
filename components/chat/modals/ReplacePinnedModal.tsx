import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatConversation, ChatMessage } from '@/types/entities/chat';
import { getMessageBodyText, getMessageSenderName } from '@/utils/chat';

type Props = {
  visible: boolean;
  pendingMessage: ChatMessage | null;
  pinnedMessages: ChatMessage[];
  conversation?: ChatConversation | null;
  onClose: () => void;
  onConfirm: (messageToUnpin: ChatMessage) => Promise<void>;
};

export const ReplacePinnedModal: React.FC<Props> = ({
  visible,
  pendingMessage,
  pinnedMessages,
  conversation,
  onClose,
  onConfirm,
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedPinned = useMemo(
    () => pinnedMessages.filter((item) => !!(item?.msg_id || item?._id)),
    [pinnedMessages],
  );

  useEffect(() => {
    if (!visible) return;
    setSelectedMessageId(String(normalizedPinned[0]?.msg_id || normalizedPinned[0]?._id || ''));
  }, [normalizedPinned, visible]);

  if (!visible || !pendingMessage) return null;

  const handleConfirm = async () => {
    const selectedMessage = normalizedPinned.find(
      (item) => String(item.msg_id || item._id || '') === selectedMessageId,
    );
    if (!selectedMessage) return;

    setIsSubmitting(true);
    try {
      await onConfirm(selectedMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/45 px-4">
        <View className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
            <View className="flex-row items-center gap-2">
              <Feather name="paperclip" size={18} color="#b78457" />
              <Text className="text-[20px] font-semibold text-slate-900">Đã đạt giới hạn 3 ghim</Text>
            </View>
            <Pressable onPress={onClose} className="rounded-full p-1.5">
              <Feather name="x" size={18} color="#94a3b8" />
            </Pressable>
          </View>

          <View className="px-5 py-4">
            <Text className="text-[13px] leading-5 text-slate-500">
              Bạn chỉ có thể ghim tối đa 3 tin nhắn trong cuộc trò chuyện này. Vui lòng chọn một tin nhắn để bỏ ghim và thay thế bằng tin nhắn mới.
            </Text>

            <View className="mt-4 rounded-xl border border-[#e7d5c4] bg-[#fcf7f2] p-3">
              <Text className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#a6794f]">Tin nhắn mới sẽ ghim</Text>
              <View className="rounded-lg border border-[#f0e2d5] bg-white px-3 py-2">
                <Text className="text-[14px] font-medium text-slate-800" numberOfLines={1}>
                  {getMessageSenderName(pendingMessage, conversation)}: {getMessageBodyText(pendingMessage)}
                </Text>
              </View>
            </View>

            <Text className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Chọn tin nhắn để bỏ ghim</Text>
            <ScrollView className="max-h-[230px]" showsVerticalScrollIndicator>
              <View className="gap-2">
                {normalizedPinned.map((item) => {
                  const itemId = String(item.msg_id || item._id || '');
                  const isSelected = itemId === selectedMessageId;

                  return (
                    <Pressable
                      key={itemId}
                      onPress={() => setSelectedMessageId(itemId)}
                      className={`flex-row items-center gap-3 rounded-xl border px-3 py-3 ${isSelected ? 'border-[#b78457] bg-[#fff8f1]' : 'border-slate-200 bg-white'}`}
                    >
                      <View className={`h-4 w-4 items-center justify-center rounded-full border ${isSelected ? 'border-[#b78457] bg-[#b78457]' : 'border-slate-300'}`}>
                        {isSelected ? <View className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                      </View>
                      <Text className={`flex-1 text-[14px] ${isSelected ? 'font-medium text-slate-900' : 'text-slate-700'}`} numberOfLines={1}>
                        {getMessageSenderName(item, conversation)}: {getMessageBodyText(item)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View className="flex-row items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
            <Pressable onPress={onClose} className="rounded-lg px-3 py-2">
              <Text className="text-[15px] font-medium text-slate-500">Hủy</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleConfirm()}
              disabled={!selectedMessageId || isSubmitting}
              className={`rounded-lg px-4 py-2 ${!selectedMessageId || isSubmitting ? 'bg-[#d9c3ab]' : 'bg-[#9a6d42]'}`}
            >
              <Text className="text-[15px] font-semibold text-white">{isSubmitting ? 'Đang cập nhật...' : 'Cập nhật ghim'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
