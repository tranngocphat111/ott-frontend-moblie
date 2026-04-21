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
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ChatConversation, ChatMessage } from "@/types/entities/chat";
import { THEME_COLORS } from "@/constants/theme";

type Props = {
  visible: boolean;
  message: ChatMessage | null;
  conversation?: ChatConversation | null;
  onClose: () => void;
  currentUserId?: string;
};

type VoterItem = {
  id: string;
  name: string;
  avatar?: string;
};

const normalizeId = (value?: string | null) => String(value || "").trim();

export const PollVoterDetailModal: React.FC<Props> = ({
  visible,
  message,
  conversation,
  onClose,
  currentUserId,
}) => {
  const translateY = useRef(new Animated.Value(24)).current;
  const [activeOptionId, setActiveOptionId] = useState<string>("");

  const options = useMemo(() => message?.poll_options || [], [message?.poll_options]);

  useEffect(() => {
    if (visible && options.length > 0 && !activeOptionId) {
      setActiveOptionId(options[0].id);
    }
  }, [visible, options, activeOptionId]);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(24);
      return;
    }

    Animated.timing(translateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const participantMap = useMemo(() => {
    const map = new Map<string, { name: string; avatar?: string }>();
    (conversation?.participants || []).forEach((p) => {
      const key = normalizeId(p.user_id);
      if (!key) return;
      map.set(key, {
        name: p.nickname || p.display_name || p.name || p.user_id || "Thành viên",
        avatar: p.avatar || "",
      });
    });
    return map;
  }, [conversation?.participants]);

  const votersForActiveOption = useMemo<VoterItem[]>(() => {
    const activeOption = options.find((opt) => opt.id === activeOptionId);
    if (!activeOption?.voters) return [];

    return activeOption.voters.map((voterId) => {
      const id = normalizeId(voterId);
      const details = participantMap.get(id);
      return {
        id,
        name: details?.name || "Thành viên",
        avatar: details?.avatar,
      };
    });
  }, [activeOptionId, options, participantMap]);

  if (!visible || !message) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
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
            height: "60%",
            minHeight: 350,
          }}
        >
          <View className="flex-1 rounded-t-[28px] bg-white px-4 pt-3 shadow-2xl">
            {/* Handle bar */}
            <View className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-200" />

            {/* Header */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-slate-900">
                Chi tiết bình chọn
              </Text>
              <Pressable
                onPress={onClose}
                className="rounded-full p-2 active:bg-slate-100"
              >
                <Feather name="x" size={20} color="#64748b" />
              </Pressable>
            </View>

            {/* Poll Question */}
            <View className="mb-4 rounded-2xl bg-slate-50 p-3">
              <Text className="text-[14px] text-slate-600 italic">
                Câu hỏi:
              </Text>
              <Text className="mt-1 text-[15px] font-medium text-slate-800" numberOfLines={2}>
                {message.poll_question}
              </Text>
            </View>

            {/* Option Tabs */}
            <View className="mb-4">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 8 }}
              >
                <View className="flex-row gap-2">
                  {options.map((opt) => {
                    const isSelected = activeOptionId === opt.id;
                    const voteCount = opt.voters?.length || 0;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setActiveOptionId(opt.id)}
                        className={`flex-row items-center rounded-full border px-4 py-2 ${
                          isSelected
                            ? "border-[#d2a177] bg-[#fdf8f4]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <Text
                          className={`text-[14px] font-semibold ${
                            isSelected ? "text-[#8b5e34]" : "text-slate-600"
                          }`}
                        >
                          {opt.name}
                        </Text>
                        <View
                          className={`ml-2 rounded-full px-1.5 py-0.5 ${
                            isSelected ? "bg-[#d2a177]" : "bg-slate-200"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isSelected ? "text-white" : "text-slate-500"
                            }`}
                          >
                            {voteCount}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Voter List */}
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {votersForActiveOption.map((voter, index) => (
                <View
                  key={`${voter.id}-${index}`}
                  className="flex-row items-center border-b border-slate-50 px-1 py-3"
                >
                  <View className="h-11 w-11 overflow-hidden rounded-full bg-slate-200">
                    {voter.avatar ? (
                      <Image
                        source={{ uri: voter.avatar }}
                        className="h-full w-full"
                      />
                    ) : (
                      <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
                        <Text className="text-[13px] font-bold text-[#8b5e34]">
                          {voter.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text
                        className="text-[15px] font-semibold text-slate-900"
                        numberOfLines={1}
                      >
                        {voter.name}
                      </Text>
                      {normalizeId(voter.id) === normalizeId(currentUserId) && (
                        <View className="ml-2 rounded bg-primary-50 px-1.5 py-0.5 border border-primary-100">
                          <Text className="text-[9px] font-bold text-primary-700 uppercase">
                            Bạn
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}

              {votersForActiveOption.length === 0 && (
                <View className="items-center py-10">
                  <Feather name="users" size={24} color="#cbd5e1" />
                  <Text className="mt-2 text-[14px] text-slate-400">
                    Chưa có ai bình chọn đáp án này
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
