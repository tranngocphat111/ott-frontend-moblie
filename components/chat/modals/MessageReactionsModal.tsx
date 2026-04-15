import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ChatConversation, ChatMessage } from "@/types/entities/chat";

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

const normalizeId = (value?: string | null) => String(value || "").trim();

export const MessageReactionsModal: React.FC<Props> = ({
  visible,
  message,
  conversation,
  onClose,
}) => {
  const translateY = useRef(new Animated.Value(24)).current;
  const [selectedReactionType, setSelectedReactionType] = useState<string>("");

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
          "Thành viên",
        avatar: participant.avatar || "",
      });
    });

    const byUser = new Map<string, ReactionItem>();

    message.reactions.forEach((reaction) => {
      const userId = normalizeId(reaction.user_id);
      const participant = participantMap.get(userId);
      byUser.set(userId, {
        userId,
        name: participant?.name || reaction.user_id || "Thành viên",
        avatar: participant?.avatar || "",
        emoji: reaction.type,
      });
    });

    return Array.from(byUser.values());
  }, [conversation?.participants, message?.reactions]);

  const reactionTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();

    reactionItems.forEach((item) => {
      counts.set(item.emoji, (counts.get(item.emoji) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([emoji, count]) => ({ emoji, count }));
  }, [reactionItems]);

  const filteredReactionItems = useMemo(() => {
    if (!selectedReactionType) return reactionItems;
    return reactionItems.filter((item) => item.emoji === selectedReactionType);
  }, [reactionItems, selectedReactionType]);

  useEffect(() => {
    if (!visible) {
      setSelectedReactionType("");
    }
  }, [visible, message?._id, message?.msg_id]);

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

  if (!visible || !message) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
          onPress={onClose}
        />

        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY }],
            height: "50%", // Giữ chiều cao cố định để không bị nhảy
            minHeight: 220,
          }}
        >
          {/* Lớp nền trắng chính: flex-1 để lấp đầy 50% chiều cao của cha */}
          <View className="flex-1 rounded-t-[28px] bg-white px-4 pt-3 shadow-2xl">
            {/* 1. Thanh gạch ngang nhỏ trên cùng */}
            <View className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-200" />

            {/* 2. Phần Header: Tiêu đề và nút Đóng */}
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-slate-900">
                Cảm xúc ({filteredReactionItems.length})
              </Text>
              <Pressable
                onPress={onClose}
                className="rounded-full p-1.5 active:bg-slate-100"
              >
                <Feather name="x" size={18} color="#64748b" />
              </Pressable>
            </View>

            {/* 3. Khu vực Tab cảm xúc (Ngang) */}
            {reactionTypeOptions.length > 0 && (
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-3"
                  contentContainerStyle={{ paddingRight: 8 }}
                >
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setSelectedReactionType("")}
                      className={`flex-row items-center rounded-full border px-3 py-2 ${
                        !selectedReactionType
                          ? "border-[#b78457] bg-[#fff8f1]"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <Feather
                        name="layers"
                        size={13}
                        color={!selectedReactionType ? "#b78457" : "#64748b"}
                      />
                      <Text
                        className={`ml-2 text-[13px] font-semibold ${!selectedReactionType ? "text-[#8b5e34]" : "text-slate-600"}`}
                      >
                        Tất cả
                      </Text>
                    </Pressable>

                    {reactionTypeOptions.map((item) => {
                      const isSelected = selectedReactionType === item.emoji;
                      return (
                        <Pressable
                          key={item.emoji}
                          onPress={() => setSelectedReactionType(item.emoji)}
                          className={`flex-row items-center rounded-full border px-3 py-2 ${
                            isSelected
                              ? "border-[#b78457] bg-[#fff8f1]"
                              : "border-slate-200 bg-white"
                          }`}
                        >
                          <Text className="text-[15px]">{item.emoji}</Text>
                          <Text
                            className={`ml-2 text-[13px] font-semibold ${isSelected ? "text-[#8b5e34]" : "text-slate-600"}`}
                          >
                            {item.count}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* 4. Danh sách chi tiết: flex-1 để chiếm toàn bộ phần còn lại */}
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {filteredReactionItems.map((item, index) => (
                <View
                  key={`${item.userId}-${index}`}
                  className="flex-row items-center border-b border-slate-50 px-1 py-3"
                >
                  <View className="h-11 w-11 overflow-hidden rounded-full bg-slate-200">
                    {item.avatar ? (
                      <Image
                        source={{ uri: item.avatar }}
                        className="h-full w-full"
                      />
                    ) : (
                      <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
                        <Text className="text-[13px] font-bold text-[#8b5e34]">
                          {String(item.name || "?")
                            .trim()
                            .slice(0, 1)
                            .toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text
                      className="text-[15px] font-semibold text-slate-900"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </View>

                  <Text className="text-[20px]">{item.emoji}</Text>
                </View>
              ))}

              {/* Trường hợp trống */}
              {filteredReactionItems.length === 0 && (
                <View className="items-center py-10">
                  <Feather name="smile" size={20} color="#94a3b8" />
                  <Text className="mt-2 text-[13px] text-slate-500">
                    {selectedReactionType
                      ? "Chưa có ai thả loại cảm xúc này"
                      : "Chưa có ai thả cảm xúc"}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
