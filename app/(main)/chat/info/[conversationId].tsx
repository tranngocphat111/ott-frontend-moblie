import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/context/Authcontext";
import { THEME_COLORS } from "@/constants/theme";
import { ChatApi } from "@/services/api";
import type { ChatMessage } from "@/types/entities/chat";
import {
  getConversationAvatar,
  getConversationTitle,
  resolveMediaUrl,
} from "@/utils/chat";
import { useConversationInfo, useNicknameEditor } from "@/hooks/chat";

type InfoTab = "members" | "pinned" | "media" | "files" | "links";
type StorageTab = "media" | "files" | "links" | "audios";
type ViewMode = "main" | "storage";

const storageTabs: { key: StorageTab; label: string }[] = [
  { key: "media", label: "Ảnh" },
  { key: "files", label: "File" },
  { key: "links", label: "Link" },
  { key: "audios", label: "Tin nhắn thoại" },
];

const getFirstContent = (message: ChatMessage) => {
  const first = Array.isArray(message.content) ? message.content[0] : "";
  if (typeof first === "string") return first;
  if (first && typeof first === "object")
    return first.url || first.text || first.name || "";
  return "";
};

const getDateGroupLabel = (value?: string | null) => {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "Không rõ ngày";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor(
    (today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diff === 0) return "Hôm nay";

  return `${date.getDate()} tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
};

const sortByNewest = <T extends { createdAt?: string; created_at?: string }>(
  items: T[],
) => {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.createdAt || left.created_at || 0).getTime();
    const rightTime = new Date(
      right.createdAt || right.created_at || 0,
    ).getTime();
    return rightTime - leftTime;
  });
};

export default function ChatInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, chatUserId } = useAuth();

  const userIdForChat = chatUserId || user?.id;

  // Hooks
  const {
    loading,
    conversation,
    participant,
    members,
    allUsers,
    categories,
    pinnedMessages,
    mediaMessages,
    fileMessages,
    linkMessages,
    voiceMessages,
    loadInfo,
  } = useConversationInfo(conversationId, userIdForChat);
  const {
    nicknameModalVisible,
    setNicknameModalVisible,
    nicknameInput,
    setNicknameInput,
    openNicknameEditor,
    submitNickname,
  } = useNicknameEditor({
    conversationId,
    userIdForChat,
    onLoadInfo: loadInfo,
  });

  // Derived state
  const title = getConversationTitle(conversation, userIdForChat);
  const avatar = getConversationAvatar(conversation, userIdForChat);
  const isGroup = conversation?.type === "group";
  const myMember = useMemo(
    () =>
      members.find(
        (member) =>
          String(member.user_id || "") === String(userIdForChat || ""),
      ),
    [members, userIdForChat],
  );
  const isAdmin = String(myMember?.roles || "") === "admin";
  const memberIds = useMemo(
    () => new Set(members.map((member) => String(member.user_id || ""))),
    [members],
  );
  const addableUsers = useMemo(
    () =>
      allUsers.filter(
        (candidate) => !memberIds.has(String(candidate.user_id || "")),
      ),
    [allUsers, memberIds],
  );

  // Member management
  const handleMemberPress = useCallback(
    (member: any) => {
      const memberUserId = String(member?.user_id || "");
      const isSelf = memberUserId === String(userIdForChat || "");

      const options: {
        text: string;
        style?: "cancel" | "destructive";
        onPress?: () => void;
      }[] = [
        {
          text: "Đổi biệt danh",
          onPress: () => {
            const currentName =
              member?.nickname || member?.user?.name || member?.name || "";
            openNicknameEditor(memberUserId, currentName);
          },
        },
      ];

      if (isAdmin && !isSelf) {
        const nextRole = member?.roles === "admin" ? "user" : "admin";
        options.push({
          text:
            nextRole === "admin"
              ? "Đặt làm quản trị viên"
              : "Gỡ quyền quản trị viên",
          onPress: async () => {
            if (!conversationId || !userIdForChat) return;
            try {
              await ChatApi.updateMemberRole(
                conversationId,
                memberUserId,
                userIdForChat,
                nextRole,
              );
              await loadInfo();
            } catch {
              Alert.alert("Lỗi", "Không thể cập nhật vai trò");
            }
          },
        });
        options.push({
          text: "Xóa khỏi nhóm",
          style: "destructive",
          onPress: async () => {
            if (!conversationId || !userIdForChat) return;
            try {
              await ChatApi.removeMember(
                conversationId,
                memberUserId,
                userIdForChat,
              );
              await loadInfo();
            } catch {
              Alert.alert("Lỗi", "Không thể xóa thành viên");
            }
          },
        });
      }

      options.push({ text: "Hủy", style: "cancel" });
      Alert.alert("Tùy chọn thành viên", "", options);
    },
    [conversationId, userIdForChat, isAdmin, loadInfo, openNicknameEditor],
  );

  const handleAddMember = useCallback(
    async (newMemberId: string) => {
      if (!conversationId || !userIdForChat) return;
      try {
        await ChatApi.addMembers(conversationId, userIdForChat, [newMemberId]);
        await loadInfo();
        setMemberModalVisible(false);
      } catch {
        Alert.alert("Lỗi", "Không thể thêm thành viên");
      }
    },
    [conversationId, userIdForChat, loadInfo],
  );

  // Settings
  const handleTogglePinConversation = useCallback(async () => {
    if (!conversationId || !userIdForChat || !participant) return;
    try {
      await ChatApi.updatePinStatus(
        conversationId,
        userIdForChat,
        !participant.settings?.is_pinned,
      );
      await loadInfo();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thay đổi trạng thái ghim hội thoại");
    }
  }, [conversationId, userIdForChat, participant, loadInfo]);

  const handleSelectCategory = useCallback(
    async (categoryId?: string | null) => {
      if (!conversationId || !userIdForChat) return;
      try {
        await ChatApi.updateConversationCategory(
          conversationId,
          userIdForChat,
          categoryId ?? null,
        );
        await loadInfo();
      } catch {
        Alert.alert("Lỗi", "Không thể cập nhật phân loại hội thoại");
      }
    },
    [conversationId, userIdForChat, loadInfo],
  );

  const handleDeleteConversation = useCallback(() => {
    if (!conversationId || !userIdForChat) return;
    Alert.alert("Xóa hội thoại", "Bạn chỉ xóa ở phía bạn. Tiếp tục?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await ChatApi.deleteConversationForMe(
              conversationId,
              userIdForChat,
            );
            router.back();
          } catch {
            Alert.alert("Lỗi", "Không thể xóa hội thoại");
          }
        },
      },
    ]);
  }, [conversationId, userIdForChat, router]);

  const handleChangeNotificationStatus = useCallback(
    async (status: "on" | "mute" | "off") => {
      if (!conversationId || !userIdForChat) return;
      try {
        await ChatApi.updateNotificationStatus(
          conversationId,
          userIdForChat,
          status,
          null,
        );
        await loadInfo();
      } catch {
        Alert.alert("Lỗi", "Không thể cập nhật trạng thái thông báo");
      }
    },
    [conversationId, userIdForChat, loadInfo],
  );

  const handleLeaveGroup = useCallback(async () => {
    if (!conversationId || !userIdForChat || !isGroup) return;
    Alert.alert("Rời nhóm", "Bạn chắc chắn muốn rời nhóm này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: async () => {
          try {
            await ChatApi.leaveGroup(conversationId, userIdForChat);
            router.back();
          } catch {
            Alert.alert("Lỗi", "Không thể rời nhóm");
          }
        },
      },
    ]);
  }, [conversationId, userIdForChat, isGroup, router]);

  // Local UI state
  const [tab, setTab] = useState<InfoTab>("media");
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [isBestFriend, setIsBestFriend] = useState(false);
  const [isHiddenConversation, setIsHiddenConversation] = useState(false);
  const [storageTab, setStorageTab] = useState<StorageTab>("media");
  const [senderFilter, setSenderFilter] = useState<string>("");
  const [videoOnly, setVideoOnly] = useState(false);
  const [timeSortEnabled, setTimeSortEnabled] = useState(true);

  const openStorageTab = useCallback((nextTab: InfoTab) => {
    if (nextTab === "files") {
      setStorageTab("files");
    } else if (nextTab === "links") {
      setStorageTab("links");
    } else {
      setStorageTab("media");
    }

    setTab(nextTab);
    setViewMode("storage");
  }, []);

  // Setup focus
  useFocusEffect(
    useCallback(() => {
      void loadInfo();
    }, [loadInfo]),
  );

  const emptyMessage = useMemo(() => {
    switch (tab) {
      case "members":
        return "Chưa có thành viên";
      case "pinned":
        return "Chưa có tin ghim";
      case "media":
        return "Chưa có ảnh/video";
      case "files":
        return "Chưa có tệp";
      default:
        return "Chưa có liên kết";
    }
  }, [tab]);

  const dataForTab = useMemo(() => {
    if (tab === "members") return members;
    if (tab === "pinned") return pinnedMessages;
    if (tab === "media") return mediaMessages;
    if (tab === "files") return fileMessages;
    return linkMessages;
  }, [tab, members, pinnedMessages, mediaMessages, fileMessages, linkMessages]);

  const senderNameById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => {
      const id = String(member?.user_id || "");
      if (!id) return;
      map.set(
        id,
        String(member?.nickname || member?.user?.name || member?.name || id),
      );
    });
    return map;
  }, [members]);

  const senderOptions = useMemo(() => {
    const ids = new Set<string>();
    [...mediaMessages, ...fileMessages, ...voiceMessages].forEach((item) => {
      const id = String(item?.sender_id || "");
      if (id) ids.add(id);
    });
    linkMessages.forEach((item) => {
      const id = String(item?.sender_id || "");
      if (id) ids.add(id);
    });

    return Array.from(ids).map((id) => ({
      id,
      name: senderNameById.get(id) || id,
    }));
  }, [
    fileMessages,
    linkMessages,
    mediaMessages,
    senderNameById,
    voiceMessages,
  ]);

  const filteredMedia = useMemo(() => {
    const base = sortByNewest(mediaMessages).filter((item) => {
      if (senderFilter && String(item.sender_id || "") !== senderFilter)
        return false;
      if (videoOnly && String(item.type || "").toLowerCase() !== "video")
        return false;
      return true;
    });

    return timeSortEnabled ? base : [...base].reverse();
  }, [mediaMessages, senderFilter, timeSortEnabled, videoOnly]);

  const filteredFiles = useMemo(() => {
    const base = sortByNewest(fileMessages).filter(
      (item) => !senderFilter || String(item.sender_id || "") === senderFilter,
    );

    return timeSortEnabled ? base : [...base].reverse();
  }, [fileMessages, senderFilter, timeSortEnabled]);

  const filteredLinks = useMemo(() => {
    const base = sortByNewest(linkMessages).filter(
      (item) => !senderFilter || String(item.sender_id || "") === senderFilter,
    );

    return timeSortEnabled ? base : [...base].reverse();
  }, [linkMessages, senderFilter, timeSortEnabled]);

  const filteredVoices = useMemo(() => {
    const base = sortByNewest(voiceMessages).filter(
      (item) => !senderFilter || String(item.sender_id || "") === senderFilter,
    );

    return timeSortEnabled ? base : [...base].reverse();
  }, [senderFilter, timeSortEnabled, voiceMessages]);

  return (
    <SafeAreaView
      className="flex-1 bg-surface-sunken"
      edges={["left", "right"]}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[THEME_COLORS.primary[600], THEME_COLORS.primary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingHorizontal: 2,
          paddingBottom: 2,
          paddingTop: 50,
        }}
        className="px-4 pb-3"
      >
        <View className="flex-row items-center gap-3 px-4 py-1">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10  items-center justify-center"
          >
            <Feather
              name="chevron-left"
              size={24}
              color={THEME_COLORS.neutral.white}
            />
          </Pressable>

          <View className="flex-1">
            <Text
              className="text-[18px] font-bold text-white"
              numberOfLines={1}
            >
              Tùy chọn
            </Text>
          </View>
        </View>
      </LinearGradient>

      {viewMode === "main" && (
        <>
          <FlatList
            data={[{ key: "main" }]}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={() => (
              <>
                <View className="items-center bg-white px-4 py-4">
                  <View className="h-20 w-20 overflow-hidden rounded-full bg-slate-200">
                    {avatar ? (
                      <Image
                        source={{ uri: avatar }}
                        className="h-full w-full"
                      />
                    ) : null}
                  </View>
                  <Text
                    className="mt-3 text-[32px] font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    {title}
                  </Text>

                  <View className="mt-4 w-full flex-row items-start justify-around">
                    <Pressable
                      onPress={() => openStorageTab("links")}
                      className="items-center"
                    >
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <Feather
                          name="search"
                          size={20}
                          color={THEME_COLORS.neutral.slate700}
                        />
                      </View>
                      <Text className="mt-2 text-center text-[12px] text-slate-600">
                        Tìm{`\n`}tin nhắn
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "Thông báo",
                          "Trang cá nhân sẽ được tích hợp ở bản kế tiếp.",
                        );
                      }}
                      className="items-center"
                    >
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <Feather
                          name="user"
                          size={20}
                          color={THEME_COLORS.neutral.slate700}
                        />
                      </View>
                      <Text className="mt-2 text-center text-[12px] text-slate-600">
                        Trang{`\n`}cá nhân
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => openStorageTab("media")}
                      className="items-center"
                    >
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <Feather
                          name="image"
                          size={20}
                          color={THEME_COLORS.neutral.slate700}
                        />
                      </View>
                      <Text className="mt-2 text-center text-[12px] text-slate-600">
                        Đổi{`\n`}hình nền
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        const current =
                          participant?.settings?.notification_status || "on";
                        void handleChangeNotificationStatus(
                          current === "off" ? "on" : "off",
                        );
                      }}
                      className="items-center"
                    >
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <Feather
                          name="bell-off"
                          size={20}
                          color={THEME_COLORS.neutral.slate700}
                        />
                      </View>
                      <Text className="mt-2 text-center text-[12px] text-slate-600">
                        Tắt{`\n`}thông báo
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View className="mt-2 bg-white border-y border-slate-200">
                  <Pressable
                    onPress={() => setNicknameModalVisible(true)}
                    className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                  >
                    <View className="flex-row items-center">
                      <Feather
                        name="edit-2"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Đổi tên gợi nhớ
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={THEME_COLORS.neutral.slate400}
                    />
                  </Pressable>

                  <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100">
                    <View className="flex-row items-center">
                      <Feather
                        name="star"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Đánh dấu bạn thân
                      </Text>
                    </View>
                    <Switch
                      value={isBestFriend}
                      onValueChange={setIsBestFriend}
                    />
                  </View>

                  <Pressable
                    onPress={() => openStorageTab("pinned")}
                    className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                  >
                    <View className="flex-row items-center">
                      <Feather
                        name="clock"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Nhật ký chung
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={THEME_COLORS.neutral.slate400}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => openStorageTab("media")}
                    className="px-4 py-4 border-b border-slate-100"
                  >
                    <View className="mb-3 flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Feather
                          name="image"
                          size={20}
                          color={THEME_COLORS.neutral.slate400}
                        />
                        <Text className="ml-4 text-[17px] text-slate-800">
                          Ảnh, file, link
                        </Text>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={18}
                        color={THEME_COLORS.neutral.slate400}
                      />
                    </View>

                    <FlatList
                      data={mediaMessages.slice(0, 4)}
                      horizontal
                      keyExtractor={(item, index) =>
                        String(item.msg_id || item._id || index)
                      }
                      ListFooterComponent={
                        <View className="ml-2 h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
                          <Feather
                            name="arrow-right"
                            size={16}
                            color={THEME_COLORS.primary[600]}
                          />
                        </View>
                      }
                      renderItem={({ item }) => {
                        const content = getFirstContent(item);
                        const resolved = resolveMediaUrl(content);
                        if (!resolved) return null;
                        return (
                          <View className="mr-2 h-14 w-14 overflow-hidden rounded-lg bg-slate-200">
                            <Image
                              source={{ uri: resolved }}
                              className="h-full w-full"
                            />
                          </View>
                        );
                      }}
                    />
                  </Pressable>

                  {!isGroup && (
                    <>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Thông báo",
                            `Tạo nhóm với ${title} sẽ được bật trong bản kế tiếp.`,
                          );
                        }}
                        className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                      >
                        <View className="flex-row items-center">
                          <Feather
                            name="users"
                            size={20}
                            color={THEME_COLORS.neutral.slate400}
                          />
                          <Text className="ml-4 text-[17px] text-slate-800">
                            Tạo nhóm với {title}
                          </Text>
                        </View>
                        <Feather
                          name="chevron-right"
                          size={18}
                          color={THEME_COLORS.neutral.slate400}
                        />
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Thông báo",
                            `Thêm ${title} vào nhóm sẽ được bật trong bản kế tiếp.`,
                          );
                        }}
                        className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                      >
                        <View className="flex-row items-center">
                          <Feather
                            name="user-plus"
                            size={20}
                            color={THEME_COLORS.neutral.slate400}
                          />
                          <Text className="ml-4 text-[17px] text-slate-800">
                            Thêm {title} vào nhóm
                          </Text>
                        </View>
                        <Feather
                          name="chevron-right"
                          size={18}
                          color={THEME_COLORS.neutral.slate400}
                        />
                      </Pressable>
                    </>
                  )}

                  {isGroup && (
                    <Pressable
                      onPress={() => openStorageTab("members")}
                      className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                    >
                      <View className="flex-row items-center">
                        <Feather
                          name="users"
                          size={20}
                          color={THEME_COLORS.neutral.slate400}
                        />
                        <Text className="ml-4 text-[17px] text-slate-800">
                          Xem thành viên nhóm ({members.length})
                        </Text>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={18}
                        color={THEME_COLORS.neutral.slate400}
                      />
                    </Pressable>
                  )}
                </View>

                <View className="mt-2 bg-white border-y border-slate-200">
                  <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100">
                    <View className="flex-row items-center">
                      <Feather
                        name="bookmark"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Ghim trò chuyện
                      </Text>
                    </View>
                    <Switch
                      value={Boolean(participant?.settings?.is_pinned)}
                      onValueChange={() => void handleTogglePinConversation()}
                    />
                  </View>

                  <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100">
                    <View className="flex-row items-center">
                      <Feather
                        name="eye-off"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Ẩn trò chuyện
                      </Text>
                    </View>
                    <Switch
                      value={isHiddenConversation}
                      onValueChange={setIsHiddenConversation}
                    />
                  </View>

                  <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100">
                    <View className="flex-row items-center">
                      <Feather
                        name="phone-call"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Báo cuộc gọi đến
                      </Text>
                    </View>
                    <Switch
                      value={
                        (participant?.settings?.notification_status || "on") !==
                        "off"
                      }
                      onValueChange={(next) =>
                        void handleChangeNotificationStatus(next ? "on" : "off")
                      }
                    />
                  </View>

                  <Pressable
                    onPress={() => openStorageTab("links")}
                    className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                  >
                    <View className="flex-row items-center">
                      <Feather
                        name="settings"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Cài đặt cá nhân
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={THEME_COLORS.neutral.slate400}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        "Tin nhắn tự xóa",
                        "Tùy chọn tin nhắn tự xóa sẽ được bổ sung trong bản tiếp theo.",
                      )
                    }
                    className="px-4 py-4 border-b border-slate-100"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Feather
                          name="clock"
                          size={20}
                          color={THEME_COLORS.neutral.slate400}
                        />
                        <View className="ml-4">
                          <Text className="text-[17px] text-slate-800">
                            Tin nhắn tự xóa
                          </Text>
                          <Text className="text-[13px] text-slate-500">
                            Không tự xóa
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </View>

                <View className="mt-2 bg-white border-y border-slate-200">
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        "Báo xấu",
                        "Chức năng báo xấu sẽ được tích hợp trong bản tới.",
                      )
                    }
                    className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                  >
                    <View className="flex-row items-center">
                      <Feather
                        name="alert-triangle"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Báo xấu
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        "Quản lý chặn",
                        "Chức năng quản lý chặn sẽ được tích hợp trong bản tới.",
                      )
                    }
                    className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                  >
                    <View className="flex-row items-center">
                      <Feather
                        name="slash"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Quản lý chặn
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={THEME_COLORS.neutral.slate400}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => openStorageTab("files")}
                    className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                  >
                    <View className="flex-row items-center">
                      <Feather
                        name="pie-chart"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Dung lượng trò chuyện
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={handleDeleteConversation}
                    className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                  >
                    <View className="flex-row items-center">
                      <Feather
                        name="trash"
                        size={20}
                        color={THEME_COLORS.neutral.slate400}
                      />
                      <Text className="ml-4 text-[17px] text-slate-800">
                        Xóa lịch sử trò chuyện
                      </Text>
                    </View>
                  </Pressable>

                  {isGroup && (
                    <>
                      {isAdmin && (
                        <Pressable
                          onPress={() => setMemberModalVisible(true)}
                          className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                        >
                          <View className="flex-row items-center">
                            <Feather
                              name="user-plus"
                              size={20}
                              color={THEME_COLORS.primary[600]}
                            />
                            <Text className="ml-4 text-[17px] text-slate-800">
                              Thêm thành viên
                            </Text>
                          </View>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={handleLeaveGroup}
                        className="flex-row items-center justify-between px-4 py-4"
                      >
                        <View className="flex-row items-center">
                          <Feather
                            name="log-out"
                            size={20}
                            color={THEME_COLORS.error.border}
                          />
                          <Text className="ml-4 text-[17px] text-red-600">
                            Rời nhóm
                          </Text>
                        </View>
                      </Pressable>
                    </>
                  )}
                </View>

                <View className="mt-2 bg-white px-4 py-3 border-y border-slate-200">
                  <Text className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Phân loại
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Pressable
                      onPress={() => handleSelectCategory(null)}
                      className={`rounded-full px-3 py-2 ${!participant?.settings?.category_id ? "bg-primary-600" : "bg-slate-100"}`}
                    >
                      <Text
                        className={`text-[12px] font-semibold ${!participant?.settings?.category_id ? "text-white" : "text-slate-700"}`}
                      >
                        Không phân loại
                      </Text>
                    </Pressable>

                    {categories.map((category) => {
                      const isSelected =
                        participant?.settings?.category_id === category._id;
                      return (
                        <Pressable
                          key={category._id}
                          onPress={() => handleSelectCategory(category._id)}
                          className={`rounded-full px-3 py-2 ${isSelected ? "bg-primary-600" : "bg-slate-100"}`}
                        >
                          <Text
                            className={`text-[12px] font-semibold ${isSelected ? "text-white" : "text-slate-700"}`}
                          >
                            {category.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          />
        </>
      )}

      {viewMode === "storage" && (
        <>
          <LinearGradient
            colors={[THEME_COLORS.primary[600], THEME_COLORS.primary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="px-4 pb-3"
          >
            <View className="mt-2 flex-row items-center justify-between">
              <Pressable
                onPress={() => setViewMode("main")}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
              >
                <Feather
                  name="chevron-left"
                  size={20}
                  color={THEME_COLORS.neutral.white}
                />
              </Pressable>
              <Text className="text-[30px] font-semibold text-white">
                Ảnh, file, link
              </Text>
              <View className="h-10 w-10" />
            </View>

            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => {
                  if (!senderFilter && senderOptions.length > 0) {
                    setSenderFilter(senderOptions[0].id);
                    return;
                  }
                  setSenderFilter("");
                }}
                className={`rounded-full border px-3 py-2 ${senderFilter ? "border-primary-300 bg-primary-400/40" : "border-white/40 bg-white/10"}`}
              >
                <Text className="text-[13px] text-white">Theo người gửi</Text>
              </Pressable>

              <Pressable
                onPress={() => setVideoOnly((prev) => !prev)}
                className={`rounded-full border px-3 py-2 ${videoOnly ? "border-primary-300 bg-primary-400/40" : "border-white/40 bg-white/10"}`}
              >
                <Text className="text-[13px] text-white">Video</Text>
              </Pressable>

              <Pressable
                onPress={() => setTimeSortEnabled((prev) => !prev)}
                className={`rounded-full border px-3 py-2 ${timeSortEnabled ? "border-primary-300 bg-primary-400/40" : "border-white/40 bg-white/10"}`}
              >
                <Text className="text-[13px] text-white">Theo thời gian</Text>
              </Pressable>
            </View>
          </LinearGradient>

          <View className="bg-white px-4 pt-3">
            <View className="flex-row border-b border-slate-200">
              {storageTabs.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setStorageTab(item.key)}
                  className="mr-6 pb-2"
                >
                  <Text
                    className={`text-[15px] font-semibold ${storageTab === item.key ? "text-slate-900" : "text-slate-500"}`}
                  >
                    {item.label}
                  </Text>
                  {storageTab === item.key && (
                    <View className="mt-1 h-[2px] rounded-full bg-primary-600" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}

      {viewMode === "storage" &&
        (loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={THEME_COLORS.primary[600]} />
          </View>
        ) : (
          <ScrollView
            className="flex-1 bg-[#f6f6f7]"
            contentContainerStyle={{ padding: 12, paddingBottom: 28 }}
          >
            {storageTab === "media" &&
              (() => {
                const grouped = new Map<string, ChatMessage[]>();
                filteredMedia.forEach((item) => {
                  const label = getDateGroupLabel(
                    item.createdAt || item.created_at,
                  );
                  const list = grouped.get(label) || [];
                  list.push(item);
                  grouped.set(label, list);
                });

                const sections = Array.from(grouped.entries());
                if (sections.length === 0) {
                  return (
                    <Text className="py-14 text-center text-[14px] text-slate-500">
                      Chưa có ảnh/video
                    </Text>
                  );
                }

                return sections.map(([label, items]) => (
                  <View key={label} className="mb-4">
                    <Text className="mb-2 text-[31px] font-semibold text-slate-700">
                      {label}
                    </Text>
                    <View className="flex-row flex-wrap">
                      {items.map((message, index) => {
                        const mediaUri = resolveMediaUrl(
                          getFirstContent(message),
                        );
                        if (!mediaUri) return null;
                        return (
                          <View
                            key={`${message._id || message.msg_id || index}`}
                            className="mb-1 mr-1 h-28 w-[31.8%] overflow-hidden rounded-md bg-slate-200"
                          >
                            <Image
                              source={{ uri: mediaUri }}
                              className="h-full w-full"
                              resizeMode="cover"
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ));
              })()}

            {storageTab === "files" &&
              (() => {
                if (filteredFiles.length === 0) {
                  return (
                    <Text className="py-14 text-center text-[14px] text-slate-500">
                      Chưa có file
                    </Text>
                  );
                }

                return filteredFiles.map((message, index) => {
                  const content = Array.isArray(message.content)
                    ? message.content[0]
                    : message.content;
                  const fileName =
                    typeof content === "string"
                      ? "Tệp đính kèm"
                      : String((content as any)?.name || "Tệp đính kèm");
                  const size =
                    typeof content === "string"
                      ? 0
                      : Number((content as any)?.size || 0);
                  const sender =
                    senderNameById.get(String(message.sender_id || "")) ||
                    message.sender_name ||
                    message.sender_id ||
                    "Thành viên";

                  return (
                    <View
                      key={`${message._id || message.msg_id || index}`}
                      className="mb-2 flex-row items-center rounded-xl bg-white px-3 py-3 border border-slate-200"
                    >
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-md bg-primary-100">
                        <Feather
                          name="paperclip"
                          size={16}
                          color={THEME_COLORS.primary[600]}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-[16px] text-slate-900"
                          numberOfLines={1}
                        >
                          {fileName}
                        </Text>
                        <Text className="text-[13px] text-slate-500">
                          {Math.max(1, Math.round(size / 1024))} KB - {sender}
                        </Text>
                      </View>
                      <Feather
                        name="more-horizontal"
                        size={16}
                        color={THEME_COLORS.neutral.slate500}
                      />
                    </View>
                  );
                });
              })()}

            {storageTab === "links" &&
              (() => {
                if (filteredLinks.length === 0) {
                  return (
                    <Text className="py-14 text-center text-[14px] text-slate-500">
                      Chưa có liên kết
                    </Text>
                  );
                }

                return filteredLinks.map((item, index) => {
                  const firstLink = Array.isArray(item.links)
                    ? String(item.links[0] || "")
                    : "";
                  const sender =
                    senderNameById.get(String(item.sender_id || "")) ||
                    item.sender_name ||
                    item.sender_id ||
                    "Thành viên";

                  return (
                    <View
                      key={`${item._id || item.msg_id || index}`}
                      className="mb-2 flex-row rounded-xl bg-white px-3 py-3 border border-slate-200"
                    >
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                        <Feather
                          name="link"
                          size={16}
                          color={THEME_COLORS.neutral.slate500}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-[14px] font-semibold uppercase text-primary-600"
                          numberOfLines={1}
                        >
                          {firstLink.replace(/^https?:\/\//i, "")}
                        </Text>
                        <Text
                          className="text-[16px] text-slate-900"
                          numberOfLines={2}
                        >
                          {firstLink}
                        </Text>
                        <Text className="text-[13px] text-slate-500">
                          {sender}
                        </Text>
                      </View>
                      <Feather
                        name="more-horizontal"
                        size={16}
                        color={THEME_COLORS.neutral.slate500}
                      />
                    </View>
                  );
                });
              })()}

            {storageTab === "audios" &&
              (() => {
                if (filteredVoices.length === 0) {
                  return (
                    <Text className="py-14 text-center text-[14px] text-slate-500">
                      Chưa có tin nhắn thoại
                    </Text>
                  );
                }

                return filteredVoices.map((message, index) => {
                  const content = Array.isArray(message.content)
                    ? message.content[0]
                    : message.content;
                  const sender =
                    senderNameById.get(String(message.sender_id || "")) ||
                    message.sender_name ||
                    message.sender_id ||
                    "Thành viên";
                  const size =
                    typeof content === "string"
                      ? 0
                      : Number((content as any)?.size || 0);

                  return (
                    <View
                      key={`${message._id || message.msg_id || index}`}
                      className="mb-2 flex-row items-center rounded-xl bg-white px-3 py-3 border border-slate-200"
                    >
                      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-primary-500">
                        <Feather
                          name="play"
                          size={18}
                          color={THEME_COLORS.neutral.white}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[27px] text-slate-900">
                          00:03
                        </Text>
                        <Text className="text-[13px] text-slate-500">
                          {Math.max(1, Math.round(size / 1024))} KB - {sender}
                        </Text>
                      </View>
                      <Feather
                        name="more-horizontal"
                        size={16}
                        color={THEME_COLORS.neutral.slate500}
                      />
                    </View>
                  );
                });
              })()}
          </ScrollView>
        ))}

      <Modal
        visible={memberModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMemberModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/35"
          onPress={() => setMemberModalVisible(false)}
        >
          <Pressable
            className="max-h-[70%] rounded-t-[24px] bg-white px-4 pb-5 pt-4"
            onPress={() => undefined}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-slate-900">
                Thêm thành viên
              </Text>
              <Pressable
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                onPress={() => setMemberModalVisible(false)}
              >
                <Feather
                  name="x"
                  size={16}
                  color={THEME_COLORS.neutral.slate700}
                />
              </Pressable>
            </View>

            <FlatList
              data={addableUsers}
              keyExtractor={(item) => item._id || item.user_id}
              ListEmptyComponent={
                <Text className="py-6 text-center text-[13px] text-slate-500">
                  Không còn user để thêm
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => void handleAddMember(item.user_id)}
                  className="mb-2 flex-row items-center rounded-2xl border border-slate-200 px-3 py-3"
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                    {item.avatar ? (
                      <Image
                        source={{ uri: item.avatar }}
                        className="h-full w-full rounded-full"
                      />
                    ) : (
                      <Feather
                        name="user"
                        size={16}
                        color={THEME_COLORS.neutral.slate500}
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-slate-900">
                      {item.name || item.user_id}
                    </Text>
                    <Text className="text-[12px] text-slate-500">
                      {item.user_id}
                    </Text>
                  </View>
                  <Feather
                    name="plus-circle"
                    size={18}
                    color={THEME_COLORS.primary[600]}
                  />
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={nicknameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNicknameModalVisible(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/30 px-5"
          onPress={() => setNicknameModalVisible(false)}
        >
          <Pressable
            className="w-full rounded-2xl bg-white p-4"
            onPress={() => undefined}
          >
            <Text className="text-[16px] font-bold text-slate-900">
              Đổi biệt danh
            </Text>
            <TextInput
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder="Nhập biệt danh"
              className="mt-3 rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                onPress={() => setNicknameModalVisible(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5"
              >
                <Text className="text-[13px] font-semibold text-slate-700">
                  Hủy
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void submitNickname()}
                className="rounded-xl bg-primary-600 px-4 py-2.5"
              >
                <Text className="text-[13px] font-semibold text-white">
                  Lưu
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
