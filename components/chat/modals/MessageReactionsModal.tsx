import React, { useMemo } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatConversation, ChatMessage } from '@/types/entities/chat';

type Props = {
  visible: boolean;
  message: ChatMessage | null;
  conversation?: ChatConversation | null;
  onClose: () => void;
};

type ReactionItem = {
  userId: string;
  name: string;
  avatar?: string;
  emoji: string;
};

const normalizeId = (value?: string | null) => String(value || '').trim();

export const MessageReactionsModal: React.FC<Props> = ({
  visible,
  message,
  conversation,
  onClose,
}) => {
  const reactionItems = useMemo<ReactionItem[]>(() => {
    if (!message?.reactions?.length) return [];

    const participantMap = new Map<string, { name: string; avatar?: string }>();
    (conversation?.participants || []).forEach((participant) => {
      const key = normalizeId(participant.user_id);
      if (!key) return;
      participantMap.set(key, {
        name:
          participant.display_name ||
          participant.nickname ||
          participant.name ||
          participant.user_id ||
          'Thành viên',
        avatar: participant.avatar || '',
      });
    });

    const byUser = new Map<string, ReactionItem>();

    message.reactions.forEach((reaction) => {
      const userId = normalizeId(reaction.user_id);
      const participant = participantMap.get(userId);
      byUser.set(userId, {
        userId,
        name: participant?.name || reaction.user_id || 'Thành viên',
        avatar: participant?.avatar || '',
        emoji: reaction.type,
      });
    });

    return Array.from(byUser.values());
  }, [conversation?.participants, message?.reactions]);

  if (!visible || !message) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/35" onPress={onClose}>
        <Pressable
          className="h-[50%] rounded-t-[28px] bg-white px-4 pb-6 pt-3"
          onPress={() => undefined}
        >
          <View className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-200" />

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[17px] font-semibold text-slate-900">
              Cảm xúc ({reactionItems.length})
            </Text>
            <Pressable onPress={onClose} className="rounded-full p-1.5">
              <Feather name="x" size={18} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {reactionItems.map((item, index) => (
              <View
                key={`${item.userId}-${index}`}
                className="flex-row items-center border-b border-slate-100 px-1 py-3"
              >
                <View className="h-11 w-11 overflow-hidden rounded-full bg-slate-200">
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} className="h-full w-full" />
                  ) : (
                    <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
                      <Text className="text-[13px] font-bold text-[#8b5e34]">
                        {String(item.name || '?').trim().slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                <Text className="text-[20px]">{item.emoji}</Text>
              </View>
            ))}

            {reactionItems.length === 0 && (
              <View className="items-center py-10">
                <Feather name="smile" size={20} color="#94a3b8" />
                <Text className="mt-2 text-[13px] text-slate-500">
                  Chưa có ai thả cảm xúc
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
