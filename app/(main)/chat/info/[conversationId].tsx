import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  InteractionManager,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
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
import { colors, fonts, fontSizes, THEME_COLORS } from "@/constants/theme";
import { CHAT_API_CONFIG } from "@/configuration/api";
import { ChatApi } from "@/services/api";
import type { ChatMessage } from "@/types/entities/chat";
import {
  getConversationAvatar,
  getConversationTitle,
  getOptimizedImageUrl,
  resolveMediaUrl,
} from "@/utils/chat";
import { getBackendDateTime, parseBackendDate } from "@/utils/time";
import { ensureImageLibraryPermission } from "@/utils/appPermissions";
import { useConversationInfo, useNicknameEditor } from "@/hooks/chat";
import { SenderAvatar } from "@/components/chat";
import { CreateGroupModal } from "@/components/chat/modals/CreateGroupModal";
import { ChatImagePreviewModal } from "@/components/chat/ChatImagePreviewModal";
import { AddMemberModal } from "@/components/chat/modals/AddMemberModal";
import { GroupInviteLinkModal } from "@/components/chat/modals/GroupInviteLinkModal";
import { ChatFileMessage } from "@/components/chat/message-types/ChatFileMessage";
import { ChatAudioMessage } from "@/components/chat/message-types/ChatAudioMessage";

type InfoTab = "members" | "pinned" | "media" | "files" | "links";
type StorageTab = "media" | "videos" | "files" | "links" | "audios";
type ViewMode = "main" | "storage";
type StorageFilterMenu = "sender" | "time" | null;
type TimePreset = "all" | "7d" | "30d" | "90d";

const getFullUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("data:")) return url;
  return `${CHAT_API_CONFIG.BASE_URL}/messages/files/${url}`;
};

const storageTabs: { key: StorageTab; label: string }[] = [
  { key: "media", label: "Ảnh" },
  { key: "videos", label: "Video" },
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

const extractFileName = (value: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const byPath = raw.split("/").pop() || raw;
  return decodeURIComponent(
    (byPath.split("?")[0] || byPath).replace(/^[a-f0-9]+_/i, ""),
  );
};

const getFileTypeIcon = (fileName: string): string => {
  const ext =
    String(fileName || "")
      .split(".")
      .pop()
      ?.toLowerCase() || "";
  if (/^(jpg|jpeg|png|gif|webp)$/.test(ext)) return "image";
  if (/^(pdf)$/.test(ext)) return "file-text";
  if (/^(doc|docx|txt)$/.test(ext)) return "file-text";
  if (/^(xls|xlsx|csv)$/.test(ext)) return "bar-chart-2";
  if (/^(ppt|pptx)$/.test(ext)) return "layers";
  if (/^(zip|rar|7z|tar|gz)$/.test(ext)) return "archive";
  if (/^(mp3|m4a|wav|flac|aac)$/.test(ext)) return "music";
  if (/^(mp4|avi|mov|mkv|flv)$/.test(ext)) return "video";
  return "paperclip";
};

const getFileTypeColor = (fileName: string) => {
  const ext =
    String(fileName || "")
      .split(".")
      .pop()
      ?.toLowerCase() || "";
  if (/^(jpg|jpeg|png|gif|webp)$/.test(ext)) return "#ea580c";
  if (/^(pdf)$/.test(ext)) return "#dc2626";
  if (/^(doc|docx|txt)$/.test(ext)) return "#2563eb";
  if (/^(xls|xlsx|csv)$/.test(ext)) return "#16a34a";
  if (/^(ppt|pptx)$/.test(ext)) return "#9333ea";
  if (/^(zip|rar|7z|tar|gz)$/.test(ext)) return "#eab308";
  if (/^(mp3|m4a|wav|flac|aac)$/.test(ext)) return "#7c3aed";
  if (/^(mp4|avi|mov|mkv|flv)$/.test(ext)) return "#0f766e";
  return THEME_COLORS.neutral.slate600;
};

const getDateGroupLabel = (value?: string | null) => {
  const date = parseBackendDate(value);
  if (!date) return "Không rõ ngày";

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
    const leftTime = getBackendDateTime(left.createdAt || left.created_at || 0);
    const rightTime = getBackendDateTime(right.createdAt || right.created_at || 0);
    return rightTime - leftTime;
  });
};

const filterByPreset = <T extends { createdAt?: string; created_at?: string }>(
  items: T[],
  preset: TimePreset,
) => {
  if (preset === "all") return items;

  const now = Date.now();
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const minTime = now - days * 24 * 60 * 60 * 1000;

  return items.filter((item) => {
    const raw = item.createdAt || item.created_at;
    const time = getBackendDateTime(raw);
    if (!time) return false;
    return time >= minTime;
  });
};

const isVideoMessage = (message: ChatMessage) => {
  const type = String(message?.type || "").toLowerCase();
  if (type === "video") return true;

  const source = getFirstContent(message).toLowerCase();
  return /\.(mp4|mov|avi|mkv|webm)(\?|$)/.test(source);
};

const isImageMessage = (message: ChatMessage) => {
  const type = String(message?.type || "").toLowerCase();
  if (type === "image") return true;
  if (type === "video") return false;

  const source = getFirstContent(message).toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|bmp|heic)(\?|$)/.test(source);
};

export default function ChatInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    conversationId,
    title: paramTitle,
    avatar: paramAvatar,
  } = useLocalSearchParams<{
    conversationId: string;
    title?: string;
    avatar?: string;
  }>();
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
    isDissolved,
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
  const title = conversation
    ? getConversationTitle(conversation, userIdForChat)
    : String(paramTitle || "Tin nhắn");
  const avatar = conversation
    ? getConversationAvatar(conversation, userIdForChat)
    : String(paramAvatar || "");
  const isGroup = conversation?.type === "group";
  const isMyDocuments = Boolean(
    conversation?.is_self_conversation ||
    String(conversation?.name || "")
      .trim()
      .toLowerCase() === "my documents",
  );

  // For 1-1 chats: identify the other user
  const otherMember = useMemo(
    () =>
      !isGroup
        ? members.find(
          (m) => String(m.user_id || "") !== String(userIdForChat || ""),
        )
        : undefined,
    [isGroup, members, userIdForChat],
  );

  const [relationship, setRelationship] = useState<any>(null);

  const fetchRelationship = useCallback(async () => {
    if (!otherMember?.user_id || !userIdForChat) return;
    try {
      const rel = await ChatApi.fetchRelationshipStatus(userIdForChat, otherMember.user_id);
      
      // Transform raw status to mapped status
      if (rel && rel.status === 'BLOCKED') {
        const mappedStatus = String(rel.requester_id) === String(userIdForChat) ? 'BLOCKED_BY_ME' : 'BLOCKED_BY_OTHER';
        setRelationship({ ...rel, status: mappedStatus });
      } else {
        setRelationship(rel);
      }
    } catch (error) {
      console.error("Failed to fetch relationship status:", error);
    }
  }, [otherMember?.user_id, userIdForChat]);

  useEffect(() => {
    if (otherMember) {
      void fetchRelationship();
    }
  }, [otherMember, fetchRelationship]);

  const handleUnfriend = useCallback(() => {
    if (!userIdForChat || !otherMember?.user_id) return;
    Alert.alert("Hủy kết bạn", `Bạn chắc chắn muốn hủy kết bạn với ${title}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Hủy kết bạn",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await ChatApi.unfriend(userIdForChat, otherMember.user_id);
            if (success) {
              Alert.alert("Thành công", "Đã hủy kết bạn.");
              // Optionally redirect or refresh
              router.replace("/(main)/(tabs)/home");
            } else {
              Alert.alert("Lỗi", "Không thể hủy kết bạn");
            }
          } catch {
            Alert.alert("Lỗi", "Không thể hủy kết bạn");
          }
        },
      },
    ]);
  }, [userIdForChat, otherMember?.user_id, title, router]);

  const handleBlockUser = useCallback(() => {
    if (!userIdForChat || !otherMember?.user_id) return;
    Alert.alert("Chặn người dùng", `Bạn chắc chắn muốn chặn ${title}? Hai người sẽ không thể nhắn tin cho nhau.`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Chặn",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await ChatApi.blockUser(userIdForChat, otherMember.user_id);
            if (success) {
              Alert.alert("Thành công", "Đã chặn người dùng.");
              await fetchRelationship();
            } else {
              Alert.alert("Lỗi", "Không thể chặn người dùng");
            }
          } catch {
            Alert.alert("Lỗi", "Không thể chặn người dùng");
          }
        },
      },
    ]);
  }, [userIdForChat, otherMember?.user_id, title, fetchRelationship]);

  const handleUnblockUser = useCallback(() => {
    if (!userIdForChat || !otherMember?.user_id) return;
    try {
      Alert.alert("Bỏ chặn", `Bạn muốn bỏ chặn ${title}?`, [
        { text: "Hủy", style: "cancel" },
        {
          text: "Bỏ chặn",
          onPress: async () => {
            const success = await ChatApi.unblockUser(userIdForChat, otherMember.user_id);
            if (success) {
              Alert.alert("Thành công", "Đã bỏ chặn người dùng.");
              await fetchRelationship();
            } else {
              Alert.alert("Lỗi", "Không thể bỏ chặn");
            }
          },
        },
      ]);
    } catch {
      Alert.alert("Lỗi", "Không thể bỏ chặn");
    }
  }, [userIdForChat, otherMember?.user_id, title, fetchRelationship]);

  const myMember = useMemo(
    () =>
      members.find(
        (member) =>
          String(member.user_id || "") === String(userIdForChat || ""),
      ),
    [members, userIdForChat],
  );
  const isAdmin = String(myMember?.roles || "") === "admin";
  const isOwner = String(conversation?.created_by || "") === String(userIdForChat || "");
  const canManageGroupProfile = isGroup && (isAdmin || isOwner);
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

  // Member options moved to dedicated members screen modal (no default Alert options here).

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

    if (isOwner) {
      Alert.alert(
        "Lưu ý",
        "Trưởng nhóm không thể rời nhóm. Vui lòng nhường chức trưởng nhóm cho thành viên khác trước khi rời.",
        [{ text: "Đóng", style: "cancel" }]
      );
      return;
    }

    Alert.alert("Rời nhóm", "Bạn chắc chắn muốn rời nhóm này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: async () => {
          try {
            await ChatApi.leaveGroup(conversationId, userIdForChat);
            // Redirect to home/chat list after leaving
            router.replace("/(main)/(tabs)/home");
          } catch {
            Alert.alert("Lỗi", "Không thể rời nhóm");
          }
        },
      },
    ]);
  }, [conversationId, userIdForChat, isGroup, isOwner, router]);

  const [tab, setTab] = useState<InfoTab>("media");
  const [viewMode, setViewMode] = useState<ViewMode>("main");
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [isBestFriend, setIsBestFriend] = useState(false);
  const [isHiddenConversation, setIsHiddenConversation] = useState(false);
  const [storageTab, setStorageTab] = useState<StorageTab>("media");
  const [senderFilter, setSenderFilter] = useState<string>("");
  const [timeSortEnabled, setTimeSortEnabled] = useState(true);
  const [openFilterMenu, setOpenFilterMenu] = useState<StorageFilterMenu>(null);
  const [timePreset, setTimePreset] = useState<TimePreset>("all");
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [updatingGroupAvatar, setUpdatingGroupAvatar] = useState(false);
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [inviteLinkModalVisible, setInviteLinkModalVisible] = useState(false);
  const [nicknameManagementVisible, setNicknameManagementVisible] = useState(false);
  const [nicknameSearchText, setNicknameSearchText] = useState("");
  const [editingNicknameUserId, setEditingNicknameUserId] = useState<string | null>(null);
  const [editingNicknameText, setEditingNicknameText] = useState("");
  const [savingNicknameUserId, setSavingNicknameUserId] = useState<string | null>(null);
  const [nicknameManagementError, setNicknameManagementError] = useState<string | null>(null);

  const nicknameMembers = useMemo(() => {
    const currentId = String(userIdForChat || "");
    const query = nicknameSearchText.trim().toLowerCase();

    return members
      .filter((member) => !!String(member?.user_id || "").trim())
      .sort((left, right) => {
        const leftIsCurrent = String(left.user_id || "") === currentId;
        const rightIsCurrent = String(right.user_id || "") === currentId;
        if (leftIsCurrent !== rightIsCurrent) return leftIsCurrent ? -1 : 1;

        const leftName =
          String(left.nickname || left.user?.name || left.name || left.user_id || "")
            .trim();
        const rightName =
          String(right.nickname || right.user?.name || right.name || right.user_id || "")
            .trim();
        return leftName.localeCompare(rightName, "vi");
      })
      .filter((member) => {
        if (!query) return true;

        const realName = String(member.user?.name || member.name || member.user_id || "").toLowerCase();
        const nickname = String(member.nickname || "").toLowerCase();
        const selfLabel = String(member.user_id || "") === currentId ? "bạn ban you" : "";
        return realName.includes(query) || nickname.includes(query) || selfLabel.includes(query);
      });
  }, [members, nicknameSearchText, userIdForChat]);

  const openNicknameManagement = useCallback(() => {
    setNicknameManagementError(null);
    setNicknameSearchText("");
    setEditingNicknameUserId(null);
    setEditingNicknameText("");
    setNicknameManagementVisible(true);
  }, []);

  const closeNicknameManagement = useCallback(() => {
    if (savingNicknameUserId) return;
    setNicknameManagementVisible(false);
    setNicknameManagementError(null);
    setEditingNicknameUserId(null);
    setEditingNicknameText("");
  }, [savingNicknameUserId]);

  const startNicknameEdit = useCallback((member: any) => {
    setNicknameManagementError(null);
    setEditingNicknameUserId(String(member?.user_id || ""));
    setEditingNicknameText(String(member?.nickname || ""));
  }, []);

  const saveNicknameFromManagement = useCallback(async () => {
    if (!conversationId || !userIdForChat || !editingNicknameUserId) return;

    setSavingNicknameUserId(editingNicknameUserId);
    setNicknameManagementError(null);
    try {
      await ChatApi.updateMemberNickname(
        conversationId,
        editingNicknameUserId,
        userIdForChat,
        editingNicknameText.trim(),
      );
      setEditingNicknameUserId(null);
      setEditingNicknameText("");
      await loadInfo();
    } catch {
      setNicknameManagementError("Không thể cập nhật biệt danh");
    } finally {
      setSavingNicknameUserId(null);
    }
  }, [
    conversationId,
    editingNicknameText,
    editingNicknameUserId,
    loadInfo,
    userIdForChat,
  ]);

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

  const handleOpenRenameGroup = useCallback(() => {
    if (!canManageGroupProfile) {
      Alert.alert("Thông báo", "Bạn không có quyền đổi tên nhóm.");
      return;
    }

    setGroupNameInput(String(conversation?.name || "").trim());
    setNameModalVisible(true);
  }, [canManageGroupProfile, conversation?.name]);

  const handleSubmitRenameGroup = useCallback(async () => {
    if (!conversationId || !userIdForChat || !canManageGroupProfile) return;

    const nextName = String(groupNameInput || "").trim();
    if (!nextName) {
      Alert.alert("Thông báo", "Tên nhóm không được để trống.");
      return;
    }

    try {
      await ChatApi.updateConversation(conversationId, {
        name: nextName,
        requesterId: userIdForChat,
      });
      setNameModalVisible(false);
      await loadInfo();
    } catch {
      Alert.alert("Lỗi", "Không thể đổi tên nhóm");
    }
  }, [canManageGroupProfile, conversationId, groupNameInput, loadInfo, userIdForChat]);

  const handlePickGroupAvatar = useCallback(async () => {
    if (!conversationId || !userIdForChat || !canManageGroupProfile) {
      Alert.alert("Thông báo", "Bạn không có quyền đổi ảnh nhóm.");
      return;
    }

    try {
      const hasPermission = await ensureImageLibraryPermission();
      if (!hasPermission) {
        Alert.alert("Thông báo", "Bạn cần cấp quyền truy cập thư viện ảnh.");
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.9,
      });

      if (picked.canceled || !picked.assets?.length) return;

      setUpdatingGroupAvatar(true);
      const selectedAsset = picked.assets[0];
      const optimized = await ImageManipulator.manipulateAsync(
        selectedAsset.uri,
        [],
        { compress: 0.25, format: ImageManipulator.SaveFormat.JPEG },
      );

      const fileName = `group_avatar_${Date.now()}.jpg`;
      const mimeType = "image/jpeg";
      const { uploadUrl, key } = await ChatApi.getMessagePresignedUrl(fileName, mimeType);

      if (!uploadUrl || !key) {
        throw new Error("Không lấy được upload url");
      }

      await ChatApi.uploadFileToS3(uploadUrl, optimized.uri, mimeType, undefined, fileName);
      await ChatApi.updateConversation(conversationId, {
        avatar: key,
        requesterId: userIdForChat,
      });
      await loadInfo();
    } catch {
      Alert.alert("Lỗi", "Không thể đổi ảnh nhóm");
    } finally {
      setUpdatingGroupAvatar(false);
    }
  }, [canManageGroupProfile, conversationId, loadInfo, userIdForChat]);

  const handleDissolveGroup = useCallback(() => {
    if (!conversationId || !userIdForChat) return;
    if (!isOwner) {
      Alert.alert("Thông báo", "Chỉ trưởng nhóm mới có thể giải tán nhóm.");
      return;
    }

    Alert.alert("Giải tán nhóm", "Nhóm sẽ bị xóa với tất cả thành viên. Tiếp tục?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Giải tán",
        style: "destructive",
        onPress: async () => {
          try {
            await ChatApi.dissolveGroup(conversationId, userIdForChat);
            if (router.dismissAll) router.dismissAll();
            router.replace("/(main)/(tabs)/home");
          } catch {
            Alert.alert("Lỗi", "Không thể giải tán nhóm");
          }
        },
      },
    ]);
  }, [conversationId, isOwner, router, userIdForChat]);

  // Setup focus
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        void loadInfo();
      });

      return () => task.cancel();
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
    const map = new Map<string, { name: string; avatarUrl: string }>();
    members.forEach((member) => {
      const id = String(member?.user_id || "");
      if (!id) return;
      const avatarRaw = String(
        member?.avatar || member?.user?.avatar || "",
      ).trim();
      const avatarUrl =
        getOptimizedImageUrl(avatarRaw, "avatar") ||
        resolveMediaUrl(avatarRaw) ||
        "";
      map.set(id, {
        name: String(
          member?.nickname || member?.user?.name || member?.name || id,
        ),
        avatarUrl,
      });
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
      name: senderNameById.get(id)?.name || id,
      avatarUrl: senderNameById.get(id)?.avatarUrl || "",
    }));
  }, [
    fileMessages,
    linkMessages,
    mediaMessages,
    senderNameById,
    voiceMessages,
  ]);

  const filteredMedia = useMemo(() => {
    const base = filterByPreset(sortByNewest(mediaMessages), timePreset).filter(
      (item) => {
        if (senderFilter && String(item.sender_id || "") !== senderFilter)
          return false;
        return isImageMessage(item);
      },
    );

    return timeSortEnabled ? base : [...base].reverse();
  }, [mediaMessages, senderFilter, timePreset, timeSortEnabled]);

  const filteredVideos = useMemo(() => {
    const base = filterByPreset(sortByNewest(mediaMessages), timePreset).filter(
      (item) => {
        if (senderFilter && String(item.sender_id || "") !== senderFilter) {
          return false;
        }
        return isVideoMessage(item);
      },
    );

    return timeSortEnabled ? base : [...base].reverse();
  }, [mediaMessages, senderFilter, timePreset, timeSortEnabled]);

  const filteredFiles = useMemo(() => {
    const base = filterByPreset(sortByNewest(fileMessages), timePreset).filter(
      (item) => !senderFilter || String(item.sender_id || "") === senderFilter,
    );

    return timeSortEnabled ? base : [...base].reverse();
  }, [fileMessages, senderFilter, timePreset, timeSortEnabled]);

  const filteredLinks = useMemo(() => {
    const base = filterByPreset(sortByNewest(linkMessages), timePreset).filter(
      (item) => !senderFilter || String(item.sender_id || "") === senderFilter,
    );

    return timeSortEnabled ? base : [...base].reverse();
  }, [linkMessages, senderFilter, timePreset, timeSortEnabled]);

  const filteredVoices = useMemo(() => {
    const base = filterByPreset(sortByNewest(voiceMessages), timePreset).filter(
      (item) => !senderFilter || String(item.sender_id || "") === senderFilter,
    );

    return timeSortEnabled ? base : [...base].reverse();
  }, [senderFilter, timePreset, timeSortEnabled, voiceMessages]);

  const myDocumentsStorageUsedMb = useMemo(() => {
    const totalBytes = [
      ...mediaMessages,
      ...fileMessages,
      ...voiceMessages,
    ].reduce((sum, item) => sum + Number(item?.size || 0), 0);
    return Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
  }, [fileMessages, mediaMessages, voiceMessages]);

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
        <View className="flex-row items-center gap-3 px-4 py-1 justify-between">
          <Pressable
            onPress={() => {
              if (viewMode === "storage") {
                setViewMode("main");
                setOpenFilterMenu(null);
                return;
              }
              router.back();
            }}
            className="h-10 w-10  items-center justify-center"
          >
            <Feather
              name="chevron-left"
              size={24}
              color={THEME_COLORS.neutral.white}
            />
          </Pressable>

          <View className="flex-1 items-center">
            <Text
              className="text-[18px] font-bold text-white"
              numberOfLines={1}
            >
              {viewMode === "main" ? "Tùy chọn" : "Ảnh, file, link"}
            </Text>
          </View>
          <View className="h-10 w-10" />
        </View>
      </LinearGradient>

      {viewMode === "storage" && (
        <View className="flex-row gap-2  bg-white px-3 py-3">
          <Pressable
            onPress={() =>
              setOpenFilterMenu((prev) => (prev === "sender" ? null : "sender"))
            }
            className="flex-row items-center rounded-full border border-[#ccc]  px-3 py-2"
          >
            <Feather name="user" size={14} color={THEME_COLORS.neutral.black} />
            <Text className="ml-1.5 text-[13px] text-black">
              {senderFilter
                ? senderOptions.find((item) => item.id === senderFilter)
                  ?.name || "Người gửi"
                : "Theo người gửi"}
            </Text>
            <Feather
              name="chevron-down"
              size={14}
              color={THEME_COLORS.neutral.black}
            />
          </Pressable>

          <Pressable
            onPress={() =>
              setOpenFilterMenu((prev) => (prev === "time" ? null : "time"))
            }
            className="flex-row items-center rounded-full border border-[#ccc] bg-white/10 px-3 py-2"
          >
            <Feather
              name="clock"
              size={14}
              color={THEME_COLORS.neutral.black}
            />
            <Text className="ml-1.5 text-[13px] text-black">
              {timePreset === "all"
                ? "Theo thời gian"
                : timePreset === "7d"
                  ? "7 ngày"
                  : timePreset === "30d"
                    ? "30 ngày"
                    : "3 tháng"}
            </Text>
            <Feather
              name="chevron-down"
              size={14}
              color={THEME_COLORS.neutral.black}
            />
          </Pressable>
        </View>
      )}
      {viewMode === "main" && (
        <>
          <FlatList
            data={[{ key: "main" }]}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={() => (
              <>
                <View className="items-center bg-white px-4 py-4">
                  <View className="relative h-20 w-20">
                    <View className="h-20 w-20 overflow-hidden rounded-full bg-slate-200 items-center justify-center">
                      {avatar === 'SPECIAL_AVATAR_SELF' || 
                       title?.toLowerCase().includes('my documents') ||
                       title?.toLowerCase().includes('truyền file') ||
                       title?.toLowerCase().includes('cloud của tôi') ? (
                        <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
                          <Text className="text-[32px]">📁</Text>
                        </View>
                      ) : avatar ? (
                        <Image
                          source={{ uri: getFullUrl(avatar) }}
                          className="h-full w-full"
                        />
                      ) : (
                        <Feather
                          name="folder"
                          size={30}
                          color={THEME_COLORS.primary[600]}
                        />
                      )}
                    </View>

                    {isGroup && canManageGroupProfile && !isDissolved && (
                      <Pressable
                        onPress={() => void handlePickGroupAvatar()}
                        className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white"
                      >
                        {updatingGroupAvatar ? (
                          <ActivityIndicator size="small" color={THEME_COLORS.primary[600]} />
                        ) : (
                          <Feather
                            name="camera"
                            size={16}
                            color={THEME_COLORS.neutral.slate700}
                          />
                        )}
                      </Pressable>
                    )}
                  </View>

                  <View className="mt-3 flex-row justify-center items-center w-full px-10">
                    <View className="relative">
                      <Text
                        style={{
                          fontSize: fontSizes.xl,
                          fontFamily: fonts.display,
                          color: colors.primary[900],
                        }}
                        className="font-semibold text-center"
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      {isGroup && canManageGroupProfile && !isDissolved && (
                        <Pressable
                          onPress={handleOpenRenameGroup}
                          className="absolute p-1"
                          style={{
                            left: '100%',
                            marginLeft: 4,
                            top: '50%',
                            transform: [{ translateY: -12 }],
                          }}
                        >
                          <Feather
                            name="edit-2"
                            size={16}
                            color={THEME_COLORS.neutral.slate500}
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {isDissolved && (
                    <View className="mt-8 w-full border-t border-slate-100 pt-4">
                      <Pressable
                        onPress={handleDeleteConversation}
                        className="flex-row items-center justify-center rounded-xl bg-red-50 px-4 py-4"
                      >
                        <Feather name="trash-2" size={20} color={THEME_COLORS.error.border} />
                        <Text className="ml-3 text-[17px] font-semibold text-red-600">Xóa cuộc trò chuyện</Text>
                      </Pressable>
                    </View>
                  )}

                  {!isDissolved && (
                    isMyDocuments ? (
                      <View className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[16px] font-semibold text-slate-800">
                            Dung lượng
                          </Text>
                          <Text className="text-[14px] text-slate-600">
                            {myDocumentsStorageUsedMb} MB / 500 MB
                          </Text>
                        </View>
                        <View className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <View
                            className="h-full rounded-full bg-primary-600"
                            style={{
                              width: `${Math.min(100, (myDocumentsStorageUsedMb / 500) * 100)}%`,
                            }}
                          />
                        </View>
                        <View className="mt-3 flex-row justify-between">
                          <Pressable className="rounded-full bg-primary-100 px-3 py-2">
                            <Text className="text-[12px] font-semibold text-primary-700">
                              Thêm dung lượng
                            </Text>
                          </Pressable>
                          <Pressable className="rounded-full bg-slate-200 px-3 py-2">
                            <Text className="text-[12px] font-semibold text-slate-700">
                              Xem và dọn dẹp
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
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
                            if (isGroup) {
                              setMemberModalVisible(true);
                              return;
                            }

                            Alert.alert(
                              "Thông báo",
                              "Trang cá nhân sẽ được tích hợp ở bản kế tiếp.",
                            );
                          }}
                          className="items-center"
                        >
                          <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <Feather
                              name={isGroup ? "user-plus" : "user"}
                              size={20}
                              color={THEME_COLORS.neutral.slate700}
                            />
                          </View>
                          <Text className="mt-2 text-center text-[12px] text-slate-600">
                            {isGroup
                              ? `Thêm${`\n`}thành viên`
                              : `Trang${`\n`}cá nhân`}
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
                              name={participant?.settings?.notification_status === "off" ? "bell-off" : "bell"}
                              size={20}
                              color={THEME_COLORS.neutral.slate700}
                            />
                          </View>
                          <Text className="mt-2 text-center text-[12px] text-slate-600">
                            {participant?.settings?.notification_status === "off" ? "Bật" : "Tắt"}{`\n`}thông báo
                          </Text>
                        </Pressable>
                      </View>
                    )
                  )}
                </View>

                {!isDissolved && !isMyDocuments && (
                  <>
                    <View className="mt-2 bg-white border-y border-slate-200">
                      {/* Đổi biệt danh - for both group and 1-1 */}
                      {!isGroup && otherMember && (
                        <Pressable
                          onPress={() => {
                            openNicknameEditor(
                              otherMember.user_id,
                              otherMember.nickname || '',
                            );
                          }}
                          className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                        >
                          <View className="flex-row items-center">
                            <Feather
                              name="edit-2"
                              size={20}
                              color={THEME_COLORS.neutral.slate400}
                            />
                            <Text className="ml-4 text-[17px] text-slate-800">
                              Đổi biệt danh
                            </Text>
                          </View>
                          <Feather
                            name="chevron-right"
                            size={18}
                            color={THEME_COLORS.neutral.slate400}
                          />
                        </Pressable>
                      )}





                      {isGroup && (
                        <>
                          <Pressable
                            onPress={openNicknameManagement}
                            className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                          >
                            <View className="flex-row items-center">
                              <Feather
                                name="edit-2"
                                size={20}
                                color={THEME_COLORS.neutral.slate400}
                              />
                              <Text className="ml-4 text-[17px] text-slate-800">
                                Biệt danh
                              </Text>
                            </View>
                            <Feather
                              name="chevron-right"
                              size={18}
                              color={THEME_COLORS.neutral.slate400}
                            />
                          </Pressable>

                          <Pressable
                            onPress={() => router.push(`/(main)/chat/bulletin/${conversationId}`)}
                            className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                          >
                            <View className="flex-row items-center">
                              <Feather
                                name="layout"
                                size={20}
                                color={THEME_COLORS.neutral.slate400}
                              />
                              <Text className="ml-4 text-[17px] text-slate-800">
                                Bảng tin nhóm
                              </Text>
                            </View>
                            <Feather
                              name="chevron-right"
                              size={18}
                              color={THEME_COLORS.neutral.slate400}
                            />
                          </Pressable>

                          <Pressable
                            onPress={() => setInviteLinkModalVisible(true)}
                            className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                          >
                            <View className="flex-row items-center">
                              <Feather
                                name="link"
                                size={20}
                                color={THEME_COLORS.neutral.slate400}
                              />
                              <Text className="ml-4 text-[17px] text-slate-800">
                                Link tham gia nhóm
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

                        {!isMyDocuments && (
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
                        )}
                      </Pressable>

                      {!isGroup && otherMember && (
                        <>
                          <Pressable
                            onPress={() => setCreateGroupModalVisible(true)}
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
                          onPress={() => {
                            if (!conversationId) return;
                            router.push({
                              pathname: "/chat/info/members/[conversationId]",
                              params: { conversationId },
                            });
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
                          trackColor={{
                            false: THEME_COLORS.neutral.slate300, // Màu xám nhạt khi tắt
                            true: colors.primary[400], // Màu nâu đặc trưng khi bật
                          }}
                          // Màu của nút tròn (Thumb)
                          thumbColor={
                            (participant?.settings?.notification_status ||
                              "on") !== "off"
                              ? colors.primary[50] // Màu kem nhạt khi bật
                              : THEME_COLORS.neutral.white // Màu trắng khi tắt
                          }
                          // Nền cho iOS để khớp với trạng thái OFF
                          ios_backgroundColor={THEME_COLORS.neutral.slate300}
                          value={Boolean(participant?.settings?.is_pinned)}
                          onValueChange={() =>
                            void handleTogglePinConversation()
                          }
                        />
                      </View>





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

                      {isGroup ? (
                        <Pressable
                          onPress={() => {
                            if (!conversationId) return;
                            router.push({
                              pathname: "/chat/info/members/[conversationId]",
                              params: { conversationId, viewBlocked: 'true' },
                            });
                          }}
                          className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                        >
                          <View className="flex-row items-center">
                            <Feather
                              name="slash"
                              size={20}
                              color={THEME_COLORS.neutral.slate400}
                            />
                            <Text className="ml-4 text-[17px] text-slate-800">
                              Danh sách chặn trong nhóm
                            </Text>
                          </View>
                          <Feather
                            name="chevron-right"
                            size={18}
                            color={THEME_COLORS.neutral.slate400}
                          />
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => {
                            if (relationship?.status === 'BLOCKED_BY_ME') {
                              handleUnblockUser();
                            } else {
                              handleBlockUser();
                            }
                          }}
                          className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                        >
                          <View className="flex-row items-center">
                            <Feather
                              name="slash"
                              size={20}
                              color={relationship?.status === 'BLOCKED_BY_ME' ? THEME_COLORS.primary[600] : THEME_COLORS.neutral.slate400}
                            />
                            <Text className={`ml-4 text-[17px] ${relationship?.status === 'BLOCKED_BY_ME' ? 'text-primary-600' : 'text-slate-800'}`}>
                              {relationship?.status === 'BLOCKED_BY_ME' ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}
                            </Text>
                          </View>
                        </Pressable>
                      )}
                      
                      {!isGroup && relationship?.status === 'ACCEPTED' && (
                        <Pressable
                          onPress={handleUnfriend}
                          className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                        >
                          <View className="flex-row items-center">
                            <Feather
                              name="user-x"
                              size={20}
                              color={THEME_COLORS.error.border}
                            />
                            <Text className="ml-4 text-[17px] text-red-600">
                              Hủy kết bạn
                            </Text>
                          </View>
                        </Pressable>
                      )}



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
                          {isOwner && (
                            <Pressable
                              onPress={handleDissolveGroup}
                              className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100"
                            >
                              <View className="flex-row items-center">
                                <Feather
                                  name="slash"
                                  size={20}
                                  color={THEME_COLORS.error.border}
                                />
                                <Text className="ml-4 text-[17px] text-red-600">
                                  Giải tán nhóm
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
                  </>
                )}
              </>
            )}
          />
        </>
      )}

      {viewMode === "storage" && (
        <>
          {openFilterMenu === "sender" && (
            <View className="absolute left-4 right-4 top-[140px] z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <Pressable
                onPress={() => {
                  setSenderFilter("");
                  setOpenFilterMenu(null);
                }}
                className="flex-row items-center rounded-xl px-3 py-2"
              >
                <SenderAvatar name="Tất cả" />
                <Text className="text-[14px] text-slate-700">Tất cả</Text>
              </Pressable>
              {senderOptions.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSenderFilter(item.id);
                    setOpenFilterMenu(null);
                  }}
                  className="flex-row items-center rounded-xl px-3 py-2"
                >
                  <SenderAvatar name={item.name} avatarUrl={item.avatarUrl} />
                  <Text className="text-[14px] text-slate-700">
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {openFilterMenu === "time" && (
            <View className="absolute left-4 right-4 top-[140px] z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <Pressable
                onPress={() => {
                  setTimePreset("all");
                  setOpenFilterMenu(null);
                }}
                className="rounded-xl px-3 py-2"
              >
                <Text className="text-[14px] text-slate-700">
                  Tất cả thời gian
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTimePreset("7d");
                  setOpenFilterMenu(null);
                }}
                className="rounded-xl px-3 py-2"
              >
                <Text className="text-[14px] text-slate-700">7 ngày trước</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTimePreset("30d");
                  setOpenFilterMenu(null);
                }}
                className="rounded-xl px-3 py-2"
              >
                <Text className="text-[14px] text-slate-700">
                  30 ngày trước
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTimePreset("90d");
                  setOpenFilterMenu(null);
                }}
                className="rounded-xl px-3 py-2"
              >
                <Text className="text-[14px] text-slate-700">
                  3 tháng trước
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTimeSortEnabled((prev) => !prev);
                  setOpenFilterMenu(null);
                }}
                className="rounded-xl px-3 py-2"
              >
                <Text className="text-[14px] text-slate-700">
                  {timeSortEnabled ? "Đang: Mới nhất" : "Đang: Cũ nhất"}
                </Text>
              </Pressable>
            </View>
          )}

          <View className="bg-white px-4 pt-3 border-b border-slate-200">
            <View className="flex-row  ">
              {storageTabs.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setStorageTab(item.key);
                    setOpenFilterMenu(null);
                  }}
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
                    <Text className="mb-2 text-[18px] font-semibold text-slate-700">
                      {label}
                    </Text>
                    <View className="flex-row flex-wrap">
                      {items.map((message, index) => {
                        const mediaUri = resolveMediaUrl(
                          getFirstContent(message),
                        );
                        if (!mediaUri) return null;
                        return (
                          <Pressable
                            key={`${message._id || message.msg_id || index}`}
                            className="mb-1 mr-1 h-28 w-[31.8%] overflow-hidden rounded-md bg-slate-200"
                            onPress={() => setSelectedImage(mediaUri)}
                          >
                            <Image
                              source={{ uri: mediaUri }}
                              className="h-full w-full"
                              resizeMode="cover"
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ));
              })()}

            {storageTab === "videos" &&
              (() => {
                const grouped = new Map<string, ChatMessage[]>();
                filteredVideos.forEach((item) => {
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
                      Chưa có video
                    </Text>
                  );
                }

                return sections.map(([label, items]) => (
                  <View key={label} className="mb-4">
                    <Text className="mb-2 text-[18px] font-semibold text-slate-700">
                      {label}
                    </Text>
                    <View className="flex-row flex-wrap">
                      {items.map((message, index) => {
                        const mediaUri = resolveMediaUrl(
                          getFirstContent(message),
                        );
                        if (!mediaUri) return null;
                        return (
                          <Pressable
                            key={`${message._id || message.msg_id || index}`}
                            className="mb-1 mr-1 h-28 w-[31.8%] overflow-hidden rounded-md bg-slate-200"
                            onPress={() => setSelectedImage(mediaUri)}
                          >
                            <Image
                              source={{ uri: mediaUri }}
                              className="h-full w-full"
                              resizeMode="cover"
                            />
                            <View className="absolute inset-x-0 bottom-0 bg-black/35 px-2 py-1">
                              <Feather
                                name="video"
                                size={12}
                                color={THEME_COLORS.neutral.white}
                              />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ));
              })()}

            {storageTab === "files" &&
              (() => {
                const grouped = new Map<string, ChatMessage[]>();
                filteredFiles.forEach((item) => {
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
                      Chưa có file
                    </Text>
                  );
                }

                return sections.map(([label, items]) => (
                  <View key={label} className="mb-4">
                    <Text className="mb-2 text-[18px] font-semibold text-slate-700">
                      {label}
                    </Text>
                    {items.map((message, index) => {
                      const content = Array.isArray(message.content)
                        ? message.content[0]
                        : message.content;
                      const rawPath =
                        typeof content === "string"
                          ? content
                          : String(
                            (content as any)?.url ||
                            (content as any)?.text ||
                            "",
                          );
                      const fileName =
                        typeof content === "string"
                          ? extractFileName(rawPath) || "Tệp đính kèm"
                          : String(
                            (content as any)?.name ||
                            extractFileName(rawPath) ||
                            "Tệp đính kèm",
                          );
                      const size =
                        typeof content === "string"
                          ? Number(message.size || 0)
                          : Number((content as any)?.size || message.size || 0);
                      const fileTypeIcon = getFileTypeIcon(fileName);
                      const fileTypeColor = getFileTypeColor(fileName);
                      const sender =
                        senderNameById.get(String(message.sender_id || ""))
                          ?.name ||
                        message.sender_name ||
                        message.sender_id ||
                        "Thành viên";

                      return (
                        <View key={`${message._id || message.msg_id || index}`} className={`mb-1 py-3 px-1 ${index < items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                          <Text className="mb-1.5 ml-1 text-[13px] font-semibold text-slate-600">{sender}</Text>
                          <ChatFileMessage message={message} isMine={false} fullWidth />
                        </View>
                      );
                    })}
                  </View>
                ));
              })()}

            {storageTab === "links" &&
              (() => {
                const grouped = new Map<
                  string,
                  Array<{ key: string; url: string; sender: string }>
                >();
                filteredLinks.forEach((item, itemIndex) => {
                  const sender =
                    senderNameById.get(String(item.sender_id || ""))?.name ||
                    item.sender_name ||
                    item.sender_id ||
                    "Thành viên";
                  const label = getDateGroupLabel(
                    item.createdAt || item.created_at,
                  );
                  const links = Array.isArray(item.links) ? item.links : [];
                  const list = grouped.get(label) || [];

                  links
                    .filter((link) => !!String(link || "").trim())
                    .forEach((link, linkIndex) => {
                      list.push({
                        key: `${item._id || item.msg_id || itemIndex}-${linkIndex}`,
                        url: String(link),
                        sender,
                      });
                    });

                  grouped.set(label, list);
                });

                const sections = Array.from(grouped.entries()).filter(
                  ([, items]) => items.length > 0,
                );
                if (sections.length === 0) {
                  return (
                    <Text className="py-14 text-center text-[14px] text-slate-500">
                      Chưa có liên kết
                    </Text>
                  );
                }

                return sections.map(([label, items]) => (
                  <View key={label} className="mb-4">
                    <Text className="mb-2 text-[18px] font-semibold text-slate-700">
                      {label}
                    </Text>
                    {items.map((linkItem, linkIndex) => {
                      const title = linkItem.url.replace(/^https?:\/\//i, "");
                      return (
                        <Pressable
                          key={linkItem.key}
                          onPress={() => {
                            const hasProtocol = /^https?:\/\//i.test(
                              linkItem.url,
                            );
                            const target = hasProtocol
                              ? linkItem.url
                              : `https://${linkItem.url}`;
                            void Linking.openURL(target);
                          }}
                          className={`flex-row items-center bg-white px-3 py-4 ${linkIndex < items.length - 1 ? 'border-b border-slate-100' : ''
                            }`}
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
                              {title}
                            </Text>
                            <Text
                              className="text-[16px] text-slate-900"
                              numberOfLines={2}
                            >
                              {linkItem.url}
                            </Text>
                            <Text className="text-[13px] text-slate-500">
                              {linkItem.sender}
                            </Text>
                          </View>
                          <Feather
                            name="more-horizontal"
                            size={16}
                            color={THEME_COLORS.neutral.slate500}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ));
              })()}

            {storageTab === "audios" &&
              (() => {
                const grouped = new Map<string, ChatMessage[]>();
                filteredVoices.forEach((item) => {
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
                      Chưa có tin nhắn thoại
                    </Text>
                  );
                }

                return sections.map(([label, items]) => (
                  <View key={label} className="mb-4">
                    <Text className="mb-2 text-[18px] font-semibold text-slate-700">
                      {label}
                    </Text>
                    {items.map((message, index) => {
                      const content = Array.isArray(message.content)
                        ? message.content[0]
                        : message.content;
                      const sender =
                        senderNameById.get(String(message.sender_id || ""))
                          ?.name ||
                        message.sender_name ||
                        message.sender_id ||
                        "Thành viên";
                      const size =
                        typeof content === "string"
                          ? 0
                          : Number((content as any)?.size || 0);

                      return (
                        <View key={`${message._id || message.msg_id || index}`} className={`w-full py-3 px-1 ${index < items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                          <Text className="mb-1.5 ml-1 text-[13px] font-semibold text-slate-600">{sender}</Text>
                          <ChatAudioMessage message={message} isMine={false} fullWidth />
                        </View>
                      );
                    })}
                  </View>
                ));
              })()}
          </ScrollView>
        ))}

      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/30 px-5"
          onPress={() => setNameModalVisible(false)}
        >
          <Pressable className="w-full rounded-2xl bg-white p-4" onPress={() => undefined}>
            <Text className="text-[16px] font-bold text-slate-900">Đổi tên nhóm</Text>
            <TextInput
              value={groupNameInput}
              onChangeText={setGroupNameInput}
              placeholder="Nhập tên nhóm mới"
              className="mt-3 rounded-xl border border-slate-200 px-3 py-2.5 text-[14px] text-slate-900"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Pressable
                onPress={() => setNameModalVisible(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5"
              >
                <Text className="text-[13px] font-semibold text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSubmitRenameGroup()}
                className="rounded-xl bg-primary-600 px-4 py-2.5"
              >
                <Text className="text-[13px] font-semibold text-white">Lưu</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AddMemberModal
        visible={memberModalVisible}
        conversationId={conversationId}
        currentMembers={members}
        users={allUsers as any}
        onClose={() => setMemberModalVisible(false)}
        onMembersAdded={async () => {
          await loadInfo();
          setMemberModalVisible(false);
        }}
      />

      <Modal
        visible={nicknameManagementVisible}
        transparent
        animationType="slide"
        onRequestClose={closeNicknameManagement}
      >
        <View className="flex-1 bg-black/35">
          <Pressable className="flex-1" onPress={closeNicknameManagement} />
          <View
            className="max-h-[88%] rounded-t-[28px] bg-white px-4 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom + 14, 22) }}
          >
            <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-slate-200" />
            <View className="mb-4 flex-row items-start justify-between">
              <View className="min-w-0 flex-1 pr-3">
                <Text className="text-[20px] font-bold text-slate-950">
                  Biệt danh
                </Text>
                <Text className="mt-0.5 text-[13px] text-slate-500">
                  {members.length} thành viên có thể đặt biệt danh
                </Text>
              </View>
              <Pressable
                onPress={closeNicknameManagement}
                disabled={!!savingNicknameUserId}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <Feather name="x" size={20} color={THEME_COLORS.neutral.slate600} />
              </Pressable>
            </View>

            <View className="mb-3 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-3">
              <Feather name="search" size={16} color={THEME_COLORS.neutral.slate500} />
              <TextInput
                value={nicknameSearchText}
                onChangeText={setNicknameSearchText}
                placeholder="Tìm thành viên hoặc biệt danh"
                placeholderTextColor={THEME_COLORS.neutral.slate400}
                className="ml-2 flex-1 py-3 text-[14px] text-slate-900"
              />
              {!!nicknameSearchText && (
                <Pressable onPress={() => setNicknameSearchText("")}>
                  <Feather name="x" size={16} color={THEME_COLORS.neutral.slate400} />
                </Pressable>
              )}
            </View>

            {!!nicknameManagementError && (
              <Text className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                {nicknameManagementError}
              </Text>
            )}

            <FlatList
              data={nicknameMembers}
              keyExtractor={(member, index) => String(member?.user_id || member?._id || index)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text className="py-12 text-center text-[14px] text-slate-500">
                  Không tìm thấy thành viên phù hợp
                </Text>
              }
              renderItem={({ item }) => {
                const memberId = String(item?.user_id || "");
                const realName = String(item?.user?.name || item?.name || memberId).trim();
                const nickname = String(item?.nickname || "").trim();
                const displayName = nickname || realName;
                const isMe = memberId === String(userIdForChat || "");
                const isEditing = editingNicknameUserId === memberId;
                const isSaving = savingNicknameUserId === memberId;
                const unchanged = editingNicknameText.trim() === nickname;

                if (isEditing) {
                  return (
                    <View className="mb-2 rounded-2xl border border-slate-200 bg-white p-3">
                      <View className="flex-row items-center">
                        <SenderAvatar name={displayName} avatarUrl={String(item?.avatar || item?.user?.avatar || "")} />
                        <View className="ml-3 min-w-0 flex-1">
                          <View className="flex-row items-center">
                            <Text className="max-w-[78%] text-[15px] font-bold text-slate-950" numberOfLines={1}>
                              {realName}
                            </Text>
                            {isMe && (
                              <Text className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                Bạn
                              </Text>
                            )}
                          </View>
                          <Text className="mt-0.5 text-[12px] text-slate-500" numberOfLines={1}>
                            {nickname ? `Hiện tại: ${nickname}` : "Chưa có biệt danh"}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <TextInput
                          value={editingNicknameText}
                          onChangeText={(value) => setEditingNicknameText(value.slice(0, 50))}
                          placeholder={`Biệt danh cho ${isMe ? "bạn" : realName}`}
                          placeholderTextColor={THEME_COLORS.neutral.slate400}
                          editable={!isSaving}
                          className="text-[14px] font-semibold text-slate-950"
                        />
                        <View className="mt-1 flex-row justify-between">
                          <Text className="text-[11px] text-slate-400">
                            Để trống rồi lưu để xóa biệt danh
                          </Text>
                          <Text className="text-[11px] text-slate-400">
                            {editingNicknameText.length}/50
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 flex-row justify-end gap-2">
                        <Pressable
                          onPress={() => {
                            setEditingNicknameUserId(null);
                            setEditingNicknameText("");
                            setNicknameManagementError(null);
                          }}
                          disabled={isSaving}
                          className="rounded-xl bg-slate-100 px-4 py-2.5"
                        >
                          <Text className="text-[13px] font-semibold text-slate-700">Hủy</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void saveNicknameFromManagement()}
                          disabled={isSaving || unchanged}
                          className={`min-w-20 items-center rounded-xl px-4 py-2.5 ${
                            isSaving || unchanged ? "bg-slate-200" : "bg-primary-600"
                          }`}
                        >
                          {isSaving ? (
                            <ActivityIndicator size="small" color={THEME_COLORS.neutral.slate500} />
                          ) : (
                            <Text className={`text-[13px] font-semibold ${
                              unchanged ? "text-slate-500" : "text-white"
                            }`}>
                              Lưu
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                }

                return (
                  <View className="mb-2 flex-row items-center rounded-2xl border border-slate-100 bg-white px-3 py-3">
                    <SenderAvatar name={displayName} avatarUrl={String(item?.avatar || item?.user?.avatar || "")} />
                    <View className="ml-3 min-w-0 flex-1">
                      <View className="flex-row items-center">
                        <Text className="max-w-[76%] text-[15px] font-bold text-slate-950" numberOfLines={1}>
                          {displayName}
                        </Text>
                        {isMe && (
                          <Text className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            Bạn
                          </Text>
                        )}
                        {!!nickname && (
                          <Text className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                            Biệt danh
                          </Text>
                        )}
                      </View>
                      <Text className="mt-0.5 text-[12px] text-slate-500" numberOfLines={1}>
                        {nickname ? `Tên thật: ${realName}` : "Chưa có biệt danh"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => startNicknameEdit(item)}
                      disabled={!!savingNicknameUserId}
                      className="h-10 w-10 items-center justify-center rounded-full bg-slate-50"
                    >
                      <Feather name="edit-2" size={17} color={THEME_COLORS.primary[600]} />
                    </Pressable>
                  </View>
                );
              }}
            />
          </View>
        </View>
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

      {!isGroup && otherMember && (
        <CreateGroupModal
          visible={createGroupModalVisible}
          users={allUsers.filter((u) => u.user_id !== userIdForChat)}
          preSelectedIds={[otherMember.user_id]}
          onClose={() => setCreateGroupModalVisible(false)}
          onCreate={async (name, memberIds, avatarUri) => {
            if (!userIdForChat) return;
            try {
              // Ensure the other user is included
              const finalMemberIds = Array.from(
                new Set([...memberIds, otherMember.user_id]),
              );
              await ChatApi.createConversation({
                creatorId: userIdForChat,
                type: 'group',
                name,
                memberIds: finalMemberIds,
                avatar: avatarUri || '',
              });
              setCreateGroupModalVisible(false);
              router.back();
            } catch (error) {
              console.error('Failed to create group:', error);
              Alert.alert('Lỗi', 'Không thể tạo nhóm. Vui lòng thử lại.');
            }
          }}
        />
      )}

      {selectedImage && (
        <ChatImagePreviewModal
          selectedImage={selectedImage}
          messages={mediaMessages}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {isGroup && (
        <GroupInviteLinkModal
          visible={inviteLinkModalVisible}
          onClose={() => setInviteLinkModalVisible(false)}
          conversationId={conversationId}
          conversationName={conversation?.name || ''}
          currentUserId={userIdForChat || ''}
        />
      )}
    </SafeAreaView>
  );
}
