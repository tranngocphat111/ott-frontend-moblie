import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as Sharing from "expo-sharing";
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/Authcontext";
import { usePresence } from "@/contexts/PresenceContext";
import { THEME_COLORS } from "@/constants/theme";
import { ChatApi, chatSocket } from "@/services/api";
import { mobileGroupCallSession } from "@/services/call/mobileGroupCallSession";
import type {
  ChatConversation,
  ChatConversationWithParticipant,
  ChatMessage,
  ChatMessageContent,
} from "@/types/entities/chat";
import {
  ChatImagePreviewModal,
  ChatComposer,
  ChatMediaPanel,
  ChatMessagesList,
  ChatPinnedMessagesBar,
  ChatScreenHeader,
  ChatVoicePanel,
  MessageReactionsModal,
} from "@/components/chat";
import { AISummaryModal } from "@/components/chat/modals/AISummaryModal";
import { Sparkles, X } from "lucide-react-native";
import { ChatExtraPanel } from "@/components/chat/ChatExtraPanel";
import { FriendRequestBar } from "@/components/chat";
import { CreatePollModal } from "@/components/chat/modals/CreatePollModal";
import { ChatMessageActionsModal } from "@/components/chat/modals/ChatMessageActionsModal";
import { ForwardMessageModal } from "@/components/chat/modals/ForwardMessageModal";
import { ReplacePinnedModal } from "@/components/chat/modals/ReplacePinnedModal";
import { STTRecordingModal } from "@/components/chat/modals/STTRecordingModal";
import {
  getAvatarFallbackLabel,
  getConversationAvatar,
  getConversationTitle,
  getMessageBodyText,
  getMessageSenderAvatar,
  resolveMediaUrl,
} from "@/utils/chat";
import {
  ensureCameraPermission,
  ensureImageLibraryPermission,
  ensureMediaLibraryPermission,
  ensureMicrophonePermission,
} from "@/utils/appPermissions";
import { useSystemBackground } from "@/utils/useSystemBackground";
import {
  useChatPanels,
  useConversationMessages,
  useMessageSocket,
  useMessageScroll,
  useMessageHighlight,
} from "@/hooks/chat";

const getMessageKey = (message: ChatMessage) =>
  message.msg_id || message._id || message.local_temp_id || "";
const normalizeMessageId = (value?: string | null) => String(value || "").trim();
const normalizeRelationshipPayload = (payload: any) => ({
  ...payload,
  _id: payload?._id || payload?.id || payload?.relationship_id || payload?.relationshipId,
  requester_id: payload?.requester_id || payload?.requesterId,
  receiver_id: payload?.receiver_id || payload?.receiverId,
  requesterId: payload?.requesterId || payload?.requester_id,
  receiverId: payload?.receiverId || payload?.receiver_id,
  status: payload?.status ? String(payload.status).toUpperCase() : payload?.status,
});
const URL_PATTERN =
  /((https?:\/\/|www\.)[^\s]+|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:\/[^\s]*)?)/i;

const normalizeLink = (rawValue: string): string | null => {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const isStandaloneLink = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const fullMatch = trimmed.match(URL_PATTERN);
  if (!fullMatch || fullMatch[0] !== trimmed) return false;

  const candidate = trimmed.replace(/[),.!?:;]+$/g, "");
  return !!normalizeLink(candidate);
};
const isSameMessageById = (left: ChatMessage, right: ChatMessage) => {
  const leftMsgId = normalizeMessageId(left?.msg_id);
  const leftDbId = normalizeMessageId(left?._id);
  const rightMsgId = normalizeMessageId(right?.msg_id);
  const rightDbId = normalizeMessageId(right?._id);

  return (
    (leftMsgId && (leftMsgId === rightMsgId || leftMsgId === rightDbId)) ||
    (leftDbId && (leftDbId === rightDbId || leftDbId === rightMsgId))
  );
};

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_SIZE = 100 * 1024 * 1024;
const CHAT_BROWN_DARK = '#b78457';
const CHAT_BROWN = '#d2a177';
const CHAT_BROWN_SOFT = '#f5e8dc';
const CHAT_PANEL_HEIGHT = 260;
const MAX_PINNED_MESSAGES = 3;
const MAX_GROUP_CALL_PARTICIPANTS = 8;
const MAX_GROUP_CALL_INVITEES = 7;

type GroupCallMemberOption = {
  id: string;
  name: string;
  avatarUrl: string;
};

const getGroupCallMemberId = (member: any) =>
  String(member?.user_id || member?.user?.user_id || member?._id || '').trim();

const getGroupCallMemberName = (member: any, fallback: string) =>
  String(
    member?.nickname ||
      member?.display_name ||
      member?.name ||
      member?.user?.name ||
      member?.user?.fullName ||
      fallback,
  ).trim();

const getGroupCallMemberAvatar = (member: any) =>
  resolveMediaUrl(
    String(member?.avatar || member?.user?.avatar || member?.user?.avatarUrl || '').trim(),
  );

const GroupCallMemberAvatar = ({
  name,
  avatarUrl,
  size = 42,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
}) => {
  const [broken, setBroken] = useState(false);
  const fallback = getAvatarFallbackLabel(name || 'U');
  const showImage = !!avatarUrl && !broken;

  useEffect(() => {
    setBroken(false);
  }, [avatarUrl]);

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-[#ead8c7]"
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
          className="h-full w-full"
          resizeMode="cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <Text className="font-bold text-[#694d31]">{fallback}</Text>
      )}
    </View>
  );
};

const formatLastSeenLabel = (value?: Date | null) => {
  if (!value) return "Không hoạt động";
  const diffMs = Date.now() - value.getTime();
  if (diffMs < 60 * 1000) return "Vừa mới hoạt động";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Hoạt động ${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hoạt động ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hoạt động ${days} ngày trước`;
  return "Không hoạt động";
};

type ChatPanelMediaAsset = {
  id: string;
  mediaType: MediaLibrary.MediaTypeValue;
  filename?: string;
  uri: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  rar: "application/x-rar-compressed",
};

const sanitizeFileName = (fileName: string) =>
  String(fileName || "file")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 180) || "file";

const getMessageAttachmentValue = (message: ChatMessage) => {
  const firstContent = Array.isArray(message.content) ? message.content[0] : message.content;

  if (typeof firstContent === "string") {
    return firstContent;
  }

  if (!firstContent || typeof firstContent !== "object") {
    return "";
  }

  return String(firstContent.url || firstContent.text || firstContent.name || "");
};

const getMessageAttachmentName = (message: ChatMessage) => {
  const content = Array.isArray(message.content) ? message.content[0] : message.content;

  if (content && typeof content === "object" && content.name) {
    return sanitizeFileName(String(content.name));
  }

  const rawValue = getMessageAttachmentValue(message);
  const urlLike = rawValue.includes("/") ? rawValue.split("/").pop() || rawValue : rawValue;
  const name = decodeURIComponent(urlLike.split("?")[0] || urlLike || "");

  if (name) {
    return sanitizeFileName(name);
  }

  if (message.type === "audio") return `voice_${Date.now()}.m4a`;
  if (message.type === "video") return `video_${Date.now()}.mp4`;
  if (message.type === "image") return `image_${Date.now()}.jpg`;

  return `file_${Date.now()}`;
};

const getMessageAttachmentMimeType = (message: ChatMessage, fileName: string) => {
  const ext = String(fileName || "")
    .split(".")
    .pop()
    ?.toLowerCase();

  if (ext && MIME_BY_EXTENSION[ext]) {
    return MIME_BY_EXTENSION[ext];
  }

  if (message.type === "image") return "image/jpeg";
  if (message.type === "video") return "video/mp4";
  if (message.type === "audio") return "audio/mpeg";

  return "application/octet-stream";
};

const getMessageAttachments = (message: ChatMessage) => {
  if (message.type === "image" && Array.isArray(message.content)) {
    return message.content
      .map((item, index) => {
        if (!item) return null;
        if (typeof item === "string") {
          const url = resolveMediaUrl(item);
          return {
            url,
            fileName: `image_${index + 1}.jpg`,
            mimeType: "image/jpeg",
          };
        }

        const url = resolveMediaUrl(String(item.url || item.text || item.name || ""));
        const fileName = sanitizeFileName(String(item.name || `image_${index + 1}.jpg`));
        return {
          url,
          fileName,
          mimeType: getMessageAttachmentMimeType(message, fileName),
        };
      })
      .filter((item): item is { url: string; fileName: string; mimeType: string } => !!item?.url);
  }

  const rawValue = getMessageAttachmentValue(message);
  if (!rawValue) return [];

  const fileName = getMessageAttachmentName(message);
  return [
    {
      url: resolveMediaUrl(rawValue),
      fileName,
      mimeType: getMessageAttachmentMimeType(message, fileName),
    },
  ];
};

const ensureDirectory = async (directoryUri: string) => {
  const directory = new FileSystem.Directory(directoryUri);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
};

const getMimeType = (fileName?: string | null, fallback?: string | null) => {
  if (fallback) return fallback;
  const ext = String(fileName || "")
    .split(".")
    .pop()
    ?.toLowerCase();

  if (!ext) return "application/octet-stream";
  return MIME_BY_EXTENSION[ext] || "application/octet-stream";
};

const getFileExtension = (fileName?: string | null) => {
  return String(fileName || "")
    .split(".")
    .pop()
    ?.toLowerCase() || "";
};

const replaceFileExtension = (fileName: string, newExt: string) => {
  const sanitized = sanitizeFileName(fileName);
  const dotIndex = sanitized.lastIndexOf(".");
  const base = dotIndex > 0 ? sanitized.slice(0, dotIndex) : sanitized;
  return `${base}.${newExt}`;
};

const isHeicLike = (fileName?: string | null, mimeType?: string | null) => {
  const ext = getFileExtension(fileName);
  const mime = String(mimeType || "").toLowerCase();
  return ext === "heic" || ext === "heif" || mime.includes("heic") || mime.includes("heif");
};

const buildOptimisticImageMessage = (params: {
  localId: string;
  conversationId: string;
  senderId: string;
  assets: Array<{ uri: string; fileName?: string | null; fileSize?: number | null; width?: number; height?: number }>;
  replyToMsgId?: string | null;
}) => {
  const now = new Date().toISOString();

  return {
    _id: params.localId,
    local_temp_id: params.localId,
    local_status: 'uploading' as const,
    local_upload_progress: 0,
    content: params.assets.map((asset, index) => ({
      type: 'image' as const,
      url: asset.uri,
      name: sanitizeFileName(asset.fileName || `image_${Date.now()}_${index}.jpg`),
      size: Number(asset.fileSize || 0),
      width: asset.width,
      height: asset.height,
    })),
    type: 'image' as const,
    created_at: now,
    createdAt: now,
    sender_id: params.senderId,
    conversation_id: params.conversationId,
    reply_to_msg_id: params.replyToMsgId || null,
    reactions: [],
  } as ChatMessage;
};

const patchMessageById = (
  source: ChatMessage[],
  incoming: ChatMessage,
  options?: { remove?: boolean },
  normalizeMessages?: (messages: ChatMessage[]) => ChatMessage[],
) => {
  const incomingMsgId = normalizeMessageId(incoming?.msg_id);
  const incomingDbId = normalizeMessageId(incoming?._id);
  const incomingLocalId = normalizeMessageId(incoming?.local_temp_id);
  const hasIncomingId = Boolean(incomingMsgId || incomingDbId || incomingLocalId);
  if (!hasIncomingId) return source;

  const next = [...source];
  const idx = next.findIndex((item) => {
    const itemMsgId = normalizeMessageId(item?.msg_id);
    const itemDbId = normalizeMessageId(item?._id);
    const itemLocalId = normalizeMessageId(item?.local_temp_id);

    return (
      (incomingMsgId && itemMsgId === incomingMsgId) ||
      (incomingDbId && itemDbId === incomingDbId) ||
      (incomingMsgId && itemDbId === incomingMsgId) ||
      (incomingDbId && itemMsgId === incomingDbId) ||
      (incomingLocalId && itemLocalId === incomingLocalId)
    );
  });

  if (options?.remove) {
    if (idx >= 0) next.splice(idx, 1);
    return normalizeMessages ? normalizeMessages(next) : next;
  }

  if (idx >= 0) {
    next[idx] = {
      ...next[idx],
      ...incoming,
    };
  } else {
    next.push(incoming);
  }

  return normalizeMessages ? normalizeMessages(next) : next;
};

const mergeMessagesByKey = (
  current: ChatMessage[],
  incoming: ChatMessage[],
  normalizeMessages: (messages: ChatMessage[]) => ChatMessage[],
) => {
  if (!incoming.length) return current;

  const map = new Map<string, ChatMessage>();

  current.forEach((item) => {
    const id = getMessageKey(item);
    if (!id) return;
    map.set(id, item);
  });

  incoming.forEach((item) => {
    const id = getMessageKey(item);
    if (!id) return;
    const existing = map.get(id);
    map.set(id, existing ? { ...existing, ...item } : item);
  });

  return normalizeMessages(Array.from(map.values()));
};

const TYPING_INDICATOR_LEFT = 12;

import { CHAT_API_CONFIG } from "@/configuration/api";

const getFullUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("data:")) return url;
  return `${CHAT_API_CONFIG.BASE_URL}/messages/files/${url}`;
};

const getInitials = (value: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "?";

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0].slice(0, 1).toUpperCase();
  }

  return `${tokens[0].slice(0, 1)}${tokens[tokens.length - 1].slice(0, 1)}`.toUpperCase();
};

const SenderAvatar: React.FC<{ name: string; avatarUrl?: string }> = ({
  name,
  avatarUrl,
}) => {
  const [hasError, setHasError] = useState(false);
  const showImage = !!avatarUrl && avatarUrl !== 'SPECIAL_AVATAR_SELF' && !hasError;

  return (
    <View className="mr-2 mt-1 h-8 w-8 overflow-hidden rounded-full bg-[#f0e2d5]">
      {avatarUrl === 'SPECIAL_AVATAR_SELF' ||
        name?.toLowerCase().includes('my documents') ||
        name?.toLowerCase().includes('truyền file') ||
        name?.toLowerCase().includes('cloud của tôi') ? (
        <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
          <Text className="text-[16px]">📁</Text>
        </View>
      ) : showImage ? (
        <Image
          source={{ uri: getFullUrl(avatarUrl) }}
          className="h-full w-full"
          onError={() => setHasError(true)}
        />
      ) : (
        <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
          <Text className="text-[12px] font-bold text-[#8b5e34]">
            {getInitials(name)}
          </Text>
        </View>
      )}
    </View>
  );
};

const ChatTypingIndicator = ({
  typingUserNames,
  senderName,
  senderAvatarUrl,
  isGroup,
}: {
  typingUserNames: string[];
  senderName: string;
  senderAvatarUrl?: string;
  isGroup: boolean;
}) => {
  const visible = typingUserNames.length > 0;

  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    if (!visible) {
      dot1.setValue(0.2);
      dot2.setValue(0.2);
      dot3.setValue(0.2);
      return;
    }

    const bump = (value: Animated.Value) =>
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 220,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.2,
          duration: 220,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]);

    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([Animated.delay(0), bump(dot1)]),
        Animated.sequence([Animated.delay(120), bump(dot2)]),
        Animated.sequence([Animated.delay(240), bump(dot3)]),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      dot1.setValue(0.2);
      dot2.setValue(0.2);
      dot3.setValue(0.2);
    };
  }, [dot1, dot2, dot3, visible]);

  if (!visible) return null;

  const label = senderName ? `${senderName} đang nhập` : "Đang nhập";

  const dotStyle = (value: Animated.Value) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0.2, 1],
          outputRange: [0, -3],
        }),
      },
    ],
  });

  const dotBase = {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94a3b8",
  } as const;

  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={label}
      className="px-3"
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <SenderAvatar name={senderName} avatarUrl={senderAvatarUrl} />

        <View>
          {isGroup && !!senderName && (
            <Text className="mb-1 text-[12px] font-semibold text-slate-700">
              {senderName}
            </Text>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: "#ffffff",
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#e2e8f0",
            }}
          >
            <Animated.View style={[dotBase, { marginRight: 6 }, dotStyle(dot1)]} />
            <Animated.View style={[dotBase, { marginRight: 6 }, dotStyle(dot2)]} />
            <Animated.View style={[dotBase, dotStyle(dot3)]} />
          </View>
        </View>
      </View>
    </View>
  );
};

export default function ChatDetailScreen() {
  useSystemBackground("#ffffff");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const chatViewportHeightRef = useRef(0);
  const [androidKeyboardInset, setAndroidKeyboardInset] = useState(0);
  const {
    conversationId,
    previewUrl,
    highlightedMessageId: searchHighlightedMessageId,
    title: paramTitle,
    avatar: paramAvatar
  } =
    useLocalSearchParams<{
      conversationId: string;
      previewUrl?: string;
      highlightedMessageId?: string;
      title?: string;
      avatar?: string;
    }>();
  const { user, chatUserId } = useAuth();
  const { isUserOnline, getLastSeen, watchUsers } = usePresence();

  const userIdForChat = chatUserId || user?.id;
  const {
    conversation,
    participant,
    messages,
    pinnedMessages,
    loading,
    isDissolved,
    setMessages,
    setPinnedMessages,
    setConversation,
    loadConversation,
    normalizeMessages,
    normalizePinnedMessages,
    PAGE_SIZE,
  } = useConversationMessages(conversationId, userIdForChat);
  const isMyDocuments = Boolean(
    conversation?.is_self_conversation ||
    String(conversation?.name || '').trim().toLowerCase() === 'my documents',
  );
  const latestCursorMessage = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (!message?.msg_id) continue;
      const type = String(message.type || '').toLowerCase();
      if (type.startsWith('system_') || type.startsWith('call_')) continue;
      return message;
    }
    return null;
  }, [messages]);
  const latestCursorMsgId = String(latestCursorMessage?.msg_id || '').trim();

  const ensureConversation = useCallback(async () => {
    if (!conversationId || !userIdForChat) return null;

    if (!String(conversationId).startsWith('VIRTUAL_CONV_')) {
      return String(conversationId);
    }

    // Extract recipientId from virtual ID
    const recipientId = String(conversationId).replace('VIRTUAL_CONV_', '');

    try {
      const response = await ChatApi.createConversation({
        creatorId: userIdForChat,
        type: 'private',
        memberIds: [recipientId],
      });

      const realId = String(response?._id || response?.conversation?._id || '');
      if (realId) {
        // Update URL and state if needed, but for the current send operation, just return the realId
        // We'll let the socket or a manual refresh update the UI later, 
        // but to keep the user in the same "room", we should replace the route.
        router.setParams({ conversationId: realId } as any);
        return realId;
      }
      return null;
    } catch (error) {
      console.error('Failed to ensure conversation:', error);
      return null;
    }
  }, [conversationId, userIdForChat, router]);
  const {
    listRef,
    loadingOlder,
    initialScrollReady,
    showScrollToBottom,
    onScroll,
    handleContentSizeChange,
    setPendingScrollToBottom,
    setHasMoreNewer,
    scrollToBottom,
  } = useMessageScroll({
    conversationId,
    userIdForChat,
    messages,
    setMessages,
    normalizeMessages,
    PAGE_SIZE,
  });
  const resolveMissingMessageForHighlight = useCallback(async (messageId: string) => {
    if (!conversationId || !userIdForChat || !messageId) return false;

    try {
      const payload = await ChatApi.getMessageContext(conversationId, messageId, 30, 30, userIdForChat);
      const contextMessages = Array.isArray(payload?.messages) ? payload.messages : [];
      if (!contextMessages.length) return false;

      setMessages((current) => mergeMessagesByKey(current, contextMessages, normalizeMessages));
      setHasMoreNewer(Boolean(payload?.hasMoreAfter));
      return true;
    } catch (error) {
      console.error('Failed to load message context for jump:', error);
      return false;
    }
  }, [conversationId, normalizeMessages, setHasMoreNewer, setMessages, userIdForChat]);

  const {
    highlightedMessageId,
    highlightMessage,
    cleanup: cleanupHighlight,
  } = useMessageHighlight({
    messages,
    getMessageKey,
    listRef,
    onResolveMissingMessage: resolveMissingMessageForHighlight,
  });

  // Local component state
  const [messageText, setMessageText] = useState("");
  const [myDocumentsFilter, setMyDocumentsFilter] = useState<'all' | 'image' | 'file' | 'link' | 'text'>('all');
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<Record<string, number>>({});
  const typingActiveRef = useRef(false);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(
    null,
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (previewUrl) {
      setSelectedImage(previewUrl);
    }
  }, [previewUrl]);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [isSendingAttachment, setIsSendingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    label: string;
    percent: number;
  } | null>(null);
  const [mediaAssets, setMediaAssets] = useState<ChatPanelMediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [androidMediaOptionsVisible, setAndroidMediaOptionsVisible] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [pendingVoiceUri, setPendingVoiceUri] = useState<string | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<ChatMessage | null>(null);
  const [reactionDetailsMessage, setReactionDetailsMessage] = useState<ChatMessage | null>(null);
  const [replacePinModalVisible, setReplacePinModalVisible] = useState(false);
  const [pendingPinMessage, setPendingPinMessage] = useState<ChatMessage | null>(null);
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [forwardConversations, setForwardConversations] = useState<ChatConversationWithParticipant[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [relationship, setRelationship] = useState<any>(null);
  const [groupCallModalVisible, setGroupCallModalVisible] = useState(false);
  const [groupCallMembers, setGroupCallMembers] = useState<GroupCallMemberOption[]>([]);
  const [selectedGroupCallIds, setSelectedGroupCallIds] = useState<string[]>([]);
  const [groupCallSearch, setGroupCallSearch] = useState('');
  const [groupCallLoading, setGroupCallLoading] = useState(false);
  const [groupCallLimitHint, setGroupCallLimitHint] = useState(false);
  const [pendingGroupCallConversationId, setPendingGroupCallConversationId] = useState('');

  // AI States
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isSmartReplyLoading, setIsSmartReplyLoading] = useState(false);
  const [isSmartReplyOpen, setIsSmartReplyOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isSTTLoading, setIsSTTLoading] = useState(false);
  const [isRecordingSTT, setIsRecordingSTT] = useState(false);
  const sttRecordingRef = useRef<Audio.Recording | null>(null);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const lastSmartReplyMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    lastSmartReplyMessageIdRef.current = null;
    setSmartReplies([]);
    setIsSmartReplyOpen(false);
    setTranslatedMessages({});
  }, [conversationId]);

  const fetchRelationship = useCallback(async () => {
    if (!conversationId || !userIdForChat || conversation?.type === 'group') return;
    const otherParticipant = conversation?.participants?.find(p => String(p.user_id || p._id) !== String(userIdForChat));
    if (!otherParticipant) return;

    const rel = await ChatApi.fetchRelationshipStatus(String(userIdForChat), String(otherParticipant.user_id || otherParticipant._id));

    // Transform raw status to mapped status
    if (rel && rel.status === 'BLOCKED') {
      const mappedStatus = String(rel.requester_id) === String(userIdForChat) ? 'BLOCKED_BY_ME' : 'BLOCKED_BY_OTHER';
      setRelationship({ ...rel, status: mappedStatus });
    } else {
      setRelationship(rel);
    }
  }, [conversationId, userIdForChat, conversation?.type, conversation?.participants]);

  useEffect(() => {
    fetchRelationship();
  }, [fetchRelationship]);

  useEffect(() => {
    if (!chatSocket || !userIdForChat) return;

    const handleRelationshipUpdate = (data: any) => {
      const normalizedData = normalizeRelationshipPayload(data);
      // Check if the update is relevant to the current conversation
      const otherParticipant = conversation?.participants?.find(p => String(p.user_id || p._id) !== String(userIdForChat));
      if (!otherParticipant) return;

      const otherId = String(otherParticipant.user_id || otherParticipant._id);
      if (String(normalizedData.requester_id) === otherId || String(normalizedData.receiver_id) === otherId) {
        void fetchRelationship();
      }
    };

    chatSocket.on('cap_nhat_quan_he', handleRelationshipUpdate);
    return () => {
      chatSocket.off('cap_nhat_quan_he', handleRelationshipUpdate);
    };
  }, [chatSocket, userIdForChat, conversation?.participants, fetchRelationship]);

  // AI: Fetch Smart Replies
  useEffect(() => {
    if (!conversationId || !userIdForChat || loading) return;

    const latestConversationMessage = conversation?.last_message;
    const latestMessage = latestConversationMessage || messages[0];
    const latestMessageId = String((latestMessage as any)?.msg_id || (latestMessage as any)?._id || '').trim();
    const latestMessageType = String((latestMessage as any)?.type || '');
    const smartReplySourceKey = latestMessageId ? `${conversationId}:${latestMessageId}` : '';

    if (
      latestMessage &&
      latestMessageId &&
      smartReplySourceKey !== lastSmartReplyMessageIdRef.current &&
      String((latestMessage as any).sender_id) !== String(userIdForChat) &&
      ['text', 'link'].includes(latestMessageType)
    ) {
      lastSmartReplyMessageIdRef.current = smartReplySourceKey;
      setSmartReplies([]);

      const fetchSuggestions = async () => {
        setIsSmartReplyLoading(true);
        try {
          const aiConvId = String(conversationId).startsWith('VIRTUAL_CONV_')
            ? String(conversationId).replace('VIRTUAL_CONV_', '')
            : conversationId;

          const suggestions = await ChatApi.getSmartReplies(aiConvId, userIdForChat);
          setSmartReplies((suggestions || []).slice(0, 3));
        } catch (error) {
          console.error("Error fetching smart replies:", error);
        } finally {
          setIsSmartReplyLoading(false);
        }
      };
      fetchSuggestions();
    } else {
      setSmartReplies([]);
      setIsSmartReplyOpen(false);
      if (smartReplySourceKey) {
        lastSmartReplyMessageIdRef.current = smartReplySourceKey;
      }
    }
  }, [
    conversation?.last_message?.msg_id,
    conversation?.last_message?.sender_id,
    conversation?.last_message?.type,
    conversationId,
    messages[0]?._id,
    messages[0]?.msg_id,
    messages[0]?.sender_id,
    messages[0]?.type,
    userIdForChat,
    loading,
  ]);

  const isHoldRecordingRef = useRef(false);
  const initialScrollConversationRef = useRef<string | null>(null);
  const initialMediaReadyRef = useRef<Set<string>>(new Set());
  const initialMediaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialMediaReady, setInitialMediaReady] = useState(false);
  const {
    voicePanelVisible,
    imagePanelVisible,
    extraPanelVisible,
    selectedMediaIds,
    hasSelectedMedia,
    setVoicePanelVisible,
    clearSelectedMedia,
    closeAllPanels,
    toggleVoicePanel,
    toggleImagePanel,
    toggleExtraPanel,
    closeImagePanel,
    toggleSelectMedia,
  } = useChatPanels();

  // Conversation metadata
  const title = conversation ? getConversationTitle(conversation, userIdForChat) : (paramTitle || "Tin nhắn");
  const avatar = conversation ? getConversationAvatar(conversation, userIdForChat) : (paramAvatar || "");
  const isGroup = conversation?.type === "group";
  const otherUserId = conversation?.type === "private"
    ? String(
        conversation.participants?.find(
          (participant) => String(participant.user_id || participant._id || "") !== String(userIdForChat || ""),
        )?.user_id || "",
      )
    : "";
  const groupMemberIds = conversation?.type === "group"
    ? (conversation.participants || [])
        .map((participant) => String(participant.user_id || participant._id || ""))
        .filter((id) => id && id !== String(userIdForChat || ""))
    : [];
  const groupMemberIdsKey = groupMemberIds.join(",");
  const relationshipStatus = String(relationship?.status || "").toUpperCase();
  const canShowPrivatePresence = conversation?.type === "private" && relationshipStatus === "ACCEPTED";
  const isOtherOnline = canShowPrivatePresence && otherUserId ? isUserOnline(otherUserId) : false;
  const activeCallConversation = conversation as any;
  const hasActiveCall = !!activeCallConversation?.is_calling;

  useEffect(() => {
    if (canShowPrivatePresence && otherUserId) {
      watchUsers([otherUserId]);
      return;
    }

    const ids = groupMemberIdsKey ? groupMemberIdsKey.split(",").filter(Boolean) : [];
    if (ids.length > 0) {
      watchUsers(ids);
    }
  }, [canShowPrivatePresence, groupMemberIdsKey, otherUserId, watchUsers]);

  const typingUserIdList = Object.keys(typingUserIds).filter(
    (id) => id && String(id) !== String(userIdForChat || ""),
  );

  const typingUserNames = typingUserIdList
    .map((id) => {
      const participant = conversation?.participants?.find(
        (item) => String(item.user_id || item._id || "") === String(id),
      );
      return String(
        participant?.nickname || participant?.display_name || participant?.name || "",
      ).trim();
    })
    .filter(Boolean);

  const typingIndicatorSenderId = typingUserIdList[0];

  const typingIndicatorSenderName =
    typingUserNames.length === 1
      ? typingUserNames[0]
      : typingUserNames.length > 1
        ? "Nhiều người"
        : "";

  const typingIndicatorSenderParticipant = conversation?.participants?.find(
    (item) =>
      typingIndicatorSenderId &&
      String(item.user_id || item._id || "") === String(typingIndicatorSenderId),
  );

  const typingIndicatorSenderAvatarRaw = getMessageSenderAvatar(
    conversation,
    typingIndicatorSenderId ? String(typingIndicatorSenderId) : null,
    userIdForChat ? String(userIdForChat) : null,
    typingIndicatorSenderParticipant?.avatar || null,
  );

  const typingIndicatorSenderAvatarUrl = typingIndicatorSenderAvatarRaw || undefined;
  const hasTypingUsers = typingUserIdList.length > 0;
  const hadTypingUsersRef = useRef(false);

  const headerSubtitle = conversation?.is_self_conversation
    ? "Cloud của bạn"
    : conversation?.type === "private"
      ? canShowPrivatePresence
        ? isOtherOnline
          ? "Đang hoạt động"
          : formatLastSeenLabel(getLastSeen(otherUserId))
        : ""
      : `${conversation?.participants?.length || 0} thành viên`;

  const stopTyping = useCallback(() => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    if (!typingActiveRef.current) return;
    if (!conversationId || !userIdForChat) return;

    chatSocket.stopTyping(String(conversationId), String(userIdForChat));
    typingActiveRef.current = false;
  }, [conversationId, userIdForChat]);

  const startTyping = useCallback(() => {
    if (!conversationId || !userIdForChat) return;

    if (!typingActiveRef.current) {
      chatSocket.startTyping(String(conversationId), String(userIdForChat));
      typingActiveRef.current = true;
    }

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [conversationId, stopTyping, userIdForChat]);

  const handleTextChange = useCallback(
    (value: string) => {
      setMessageText(value);

      if (value.length > 0) {
        startTyping();
      } else {
        stopTyping();
      }
    },
    [startTyping, stopTyping],
  );

  useEffect(() => {
    setTypingUserIds({});
  }, [conversationId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUserIds((prev) => {
        const ids = Object.keys(prev);
        if (ids.length === 0) return prev;

        let changed = false;
        const next: Record<string, number> = {};
        ids.forEach((id) => {
          const last = prev[id];
          if (last && now - last < 4500) {
            next[id] = last;
          } else {
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  useEffect(() => {
    if (!conversationId || loading) {
      hadTypingUsersRef.current = hasTypingUsers;
      return;
    }

    const justStartedTyping = hasTypingUsers && !hadTypingUsersRef.current;
    hadTypingUsersRef.current = hasTypingUsers;

    if (!hasTypingUsers) {
      return;
    }

    // Keep typing indicator visible at the bottom when it appears.
    if (justStartedTyping || !showScrollToBottom) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [conversationId, hasTypingUsers, loading, scrollToBottom, showScrollToBottom]);

  const loadGroupCallMembers = useCallback(async (targetConversationId: string) => {
    setGroupCallLoading(true);
    setGroupCallSearch('');
    setGroupCallLimitHint(false);

    try {
      const members = await ChatApi.getConversationMembers(targetConversationId);
      const uniqueMembers = new Map<string, GroupCallMemberOption>();

      (members || []).forEach((member: any) => {
        const id = getGroupCallMemberId(member);
        const status = String(member?.status || 'joined').toLowerCase();
        if (!id || id === String(userIdForChat || '') || status === 'invited') return;

        uniqueMembers.set(id, {
          id,
          name: getGroupCallMemberName(member, `User ${id.slice(-4)}`),
          avatarUrl: getGroupCallMemberAvatar(member),
        });
      });

      const nextMembers = Array.from(uniqueMembers.values());
      setGroupCallMembers(nextMembers);
      setSelectedGroupCallIds(nextMembers.slice(0, MAX_GROUP_CALL_INVITEES).map((member) => member.id));
    } catch (error) {
      console.warn('Không thể tải thành viên để gọi nhóm:', error);
      setGroupCallMembers([]);
      setSelectedGroupCallIds([]);
      Alert.alert('Không thể gọi nhóm', 'Không tải được danh sách thành viên nhóm.');
    } finally {
      setGroupCallLoading(false);
    }
  }, [userIdForChat]);

  const filteredGroupCallMembers = useMemo(() => {
    const keyword = groupCallSearch.trim().toLowerCase();
    if (!keyword) return groupCallMembers;
    return groupCallMembers.filter((member) => member.name.toLowerCase().includes(keyword));
  }, [groupCallMembers, groupCallSearch]);

  const selectedGroupCallMembers = useMemo(
    () => groupCallMembers.filter((member) => selectedGroupCallIds.includes(member.id)),
    [groupCallMembers, selectedGroupCallIds],
  );

  const closeGroupCallModal = useCallback(() => {
    setGroupCallModalVisible(false);
    setGroupCallSearch('');
    setGroupCallLimitHint(false);
  }, []);

  const toggleGroupCallMember = useCallback((memberId: string) => {
    setSelectedGroupCallIds((current) => {
      if (current.includes(memberId)) {
        setGroupCallLimitHint(false);
        return current.filter((id) => id !== memberId);
      }

      if (current.length >= MAX_GROUP_CALL_INVITEES) {
        setGroupCallLimitHint(true);
        return current;
      }

      setGroupCallLimitHint(false);
      return [...current, memberId];
    });
  }, []);

  const selectMaxGroupCallMembers = useCallback(() => {
    setSelectedGroupCallIds(
      filteredGroupCallMembers
        .slice(0, MAX_GROUP_CALL_INVITEES)
        .map((member) => member.id),
    );
    setGroupCallLimitHint(filteredGroupCallMembers.length > MAX_GROUP_CALL_INVITEES);
  }, [filteredGroupCallMembers]);

  const handleStartSelectedGroupCall = useCallback(() => {
    const targetConversationId = pendingGroupCallConversationId || conversationId;
    if (!targetConversationId || !userIdForChat || selectedGroupCallIds.length === 0) return;

    closeGroupCallModal();
    void mobileGroupCallSession.startGroupCall({
      conversationId: targetConversationId,
      userId: String(userIdForChat),
      title: title || 'Cuộc gọi nhóm',
      avatar: avatar || '',
      invitedUserIds: selectedGroupCallIds,
    });
  }, [
    avatar,
    closeGroupCallModal,
    conversationId,
    pendingGroupCallConversationId,
    selectedGroupCallIds,
    title,
    userIdForChat,
  ]);

  const openMobileCall = useCallback(async (type: 'voice' | 'video') => {
    if (!conversationId || !userIdForChat) return;
    if (isChatLocked || isMyDocuments || conversation?.is_self_conversation) return;

    const targetConversationId = await ensureConversation();
    if (!targetConversationId) {
      Alert.alert('Không thể gọi', 'Không tìm thấy cuộc trò chuyện để bắt đầu gọi.');
      return;
    }

    const isGroupCall = conversation?.type === 'group';
    const callMode = isGroupCall ? 'video' : type;
    const callConversation = conversation as any;

    if (isGroupCall) {
      if (callConversation?.is_calling) {
        const activeParticipantCount = Number(
          callConversation?.active_call_participant_count ||
            callConversation?.call_participant_count ||
            0,
        );
        if (activeParticipantCount >= MAX_GROUP_CALL_PARTICIPANTS) {
          Alert.alert(
            'Cuộc gọi đã đủ người',
            `Cuộc gọi nhóm tối đa ${MAX_GROUP_CALL_PARTICIPANTS} người tham gia.`,
          );
          return;
        }

        void mobileGroupCallSession.joinGroupCall({
          conversationId: targetConversationId,
          userId: String(userIdForChat),
          callId: callConversation.active_call_id || '',
          title: title || 'Cuộc gọi nhóm',
          avatar: avatar || '',
        });
        return;
      }

      setPendingGroupCallConversationId(targetConversationId);
      setGroupCallModalVisible(true);
      void loadGroupCallMembers(targetConversationId);
      return;
    }

    router.push({
      pathname: '/(main)/call',
      params: {
        conversationId: targetConversationId,
        type: callMode,
        action: 'start',
        name: title || 'Cuộc gọi',
        avatar: avatar || '',
        isGroup: 'false',
        invitedUserIds: '',
      },
    } as any);
  }, [
    conversation?.is_self_conversation,
    conversation?.type,
    conversation,
    conversationId,
    ensureConversation,
    loadGroupCallMembers,
    isChatLocked,
    isMyDocuments,
    router,
    title,
    avatar,
    userIdForChat,
  ]);

  const handleCallMessagePress = useCallback((message: ChatMessage) => {
    const firstContent = Array.isArray(message.content) ? message.content[0] : message.content;
    const raw = typeof firstContent === 'string'
      ? firstContent
      : firstContent && typeof firstContent === 'object'
        ? firstContent.text || firstContent.url || firstContent.name || ''
        : '';

    const isVideoCall = /video/i.test(String(raw || ''));
    void openMobileCall(isVideoCall ? 'video' : 'voice');
  }, [openMobileCall]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(main)/(tabs)/home" as any);
  }, [router]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
    requestAnimationFrame(() => Keyboard.dismiss());
    setTimeout(() => Keyboard.dismiss(), 40);
  }, []);

  const handleComposerInputFocus = useCallback(() => {
    closeAllPanels({ clearMediaSelection: true });
  }, [closeAllPanels]);

  const handleComposerInputPressIn = useCallback(() => {
    closeAllPanels({ clearMediaSelection: true });
  }, [closeAllPanels]);

  const toggleImagePanelFromComposer = useCallback(() => {
    toggleImagePanel();
  }, [toggleImagePanel]);

  const openAndroidMediaOptions = useCallback(() => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    dismissKeyboard();
    closeAllPanels({ clearMediaSelection: true });
    setAndroidMediaOptionsVisible(true);
  }, [closeAllPanels, conversationId, dismissKeyboard, isSendingAttachment, userIdForChat]);

  const closeAndroidMediaOptions = useCallback(() => {
    setAndroidMediaOptionsVisible(false);
  }, []);

  const toggleVoicePanelFromComposer = useCallback(() => {
    toggleVoicePanel();
  }, [toggleVoicePanel]);

  const toggleExtraPanelFromComposer = useCallback(() => {
    toggleExtraPanel();
  }, [toggleExtraPanel]);

  useEffect(() => {
    const keyboardShowSubscription = Keyboard.addListener('keyboardDidShow', () => {
      closeAllPanels({ clearMediaSelection: true });
    });

    return () => {
      keyboardShowSubscription.remove();
    };
  }, [closeAllPanels]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const keyboardShowSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const keyboardHeight = Math.max(0, Number(event.endCoordinates?.height || 0));
      const keyboardTop = Number(event.endCoordinates?.screenY || 0);
      const viewportHeight = chatViewportHeightRef.current;
      const coveredHeight =
        viewportHeight > 0 && keyboardTop > 0
          ? Math.max(0, viewportHeight - keyboardTop)
          : keyboardHeight;

      setAndroidKeyboardInset(Math.max(coveredHeight, 0));
      setPendingScrollToBottom();
    });
    const keyboardHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardInset(0);
    });

    return () => {
      keyboardShowSubscription.remove();
      keyboardHideSubscription.remove();
    };
  }, [setPendingScrollToBottom]);

  const openMessageMenu = useCallback((message: ChatMessage) => {
    dismissKeyboard();
    const latestMessage = messages.find((item) => isSameMessageById(item, message)) || message;
    const isPinnedNow = pinnedMessages.some((item) => isSameMessageById(item, message));
    setActiveMessageMenu({
      ...latestMessage,
      is_pinned: isPinnedNow,
    });
  }, [dismissKeyboard, messages, pinnedMessages]);

  const closeMessageMenu = useCallback(() => {
    setActiveMessageMenu(null);
  }, []);

  const openForwardModal = useCallback(async (message: ChatMessage) => {
    if (!userIdForChat) {
      Alert.alert('Lỗi', 'Không xác định được người dùng hiện tại');
      return;
    }

    setForwardingMessage(message);
    setForwardModalVisible(true);

    if (forwardConversations.length > 0) {
      return;
    }

    setForwardLoading(true);
    try {
      const list = await ChatApi.getUserConversations(userIdForChat);
      setForwardConversations(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to load forward conversations:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách hội thoại để chuyển tiếp.');
    } finally {
      setForwardLoading(false);
    }
  }, [forwardConversations.length, userIdForChat]);

  const closeForwardModal = useCallback(() => {
    if (isForwarding) return;
    setForwardModalVisible(false);
    setForwardingMessage(null);
  }, [isForwarding]);

  const handleConfirmForward = useCallback(async (targetConversationIds: string[]) => {
    if (!conversationId || !userIdForChat || !forwardingMessage) return;

    const originalMsgId = normalizeMessageId(forwardingMessage.msg_id || forwardingMessage._id);
    if (!originalMsgId) {
      Alert.alert('Lỗi', 'Không thể xác định tin nhắn cần chuyển tiếp');
      return;
    }

    setIsForwarding(true);
    try {
      const response = await ChatApi.forwardMessage(
        originalMsgId,
        conversationId,
        targetConversationIds,
        userIdForChat,
      );

      const successfulResults = Array.isArray(response?.results)
        ? response.results.filter((item) => item?.success !== false)
        : [];

      if (Array.isArray(response?.results) && successfulResults.length < targetConversationIds.length) {
        Alert.alert('Thông báo', `Đã chuyển tiếp ${successfulResults.length}/${targetConversationIds.length} hội thoại`);
      }

      if (targetConversationIds.includes(String(conversationId))) {
        await loadConversation();
        setPendingScrollToBottom();
      }

      setForwardModalVisible(false);
      setForwardingMessage(null);
    } catch (error) {
      console.error('Failed to forward message:', error);
      const message = error instanceof Error ? error.message : 'Không thể chuyển tiếp tin nhắn';
      Alert.alert('Lỗi', message);
    } finally {
      setIsForwarding(false);
    }
  }, [conversationId, forwardingMessage, loadConversation, setPendingScrollToBottom, userIdForChat]);

  const handleConfirmReplacePinned = useCallback(async (messageToUnpin: ChatMessage) => {
    if (!conversationId || !userIdForChat || !pendingPinMessage?.msg_id || !messageToUnpin?.msg_id) {
      return;
    }

    try {
      const unpinned = await ChatApi.pinMessage(conversationId, messageToUnpin.msg_id, userIdForChat, false);
      const pinned = await ChatApi.pinMessage(conversationId, pendingPinMessage.msg_id, userIdForChat, true);

      setMessages((current) => patchMessageById(current, unpinned, undefined, normalizeMessages));
      setPinnedMessages((current) => patchMessageById(current, unpinned, { remove: true }, normalizePinnedMessages));

      setMessages((current) => patchMessageById(current, pinned, undefined, normalizeMessages));
      setPinnedMessages((current) => patchMessageById(current, pinned, undefined, normalizePinnedMessages));

      setReplacePinModalVisible(false);
      setPendingPinMessage(null);
    } catch (error) {
      console.error('Failed to replace pinned message:', error);
      const message = error instanceof Error ? error.message : 'Không thể cập nhật ghim';
      Alert.alert('Lỗi', message);
    }
  }, [conversationId, normalizeMessages, pendingPinMessage, userIdForChat]);

  const shareMessage = useCallback(async (message: ChatMessage) => {
    const attachments = getMessageAttachments(message);
    const text = getMessageBodyText(message);

    if (attachments.length === 0) {
      await Share.share({ message: text || ' ' });
      return;
    }

    const firstAttachment = attachments[0];
    const directory = await ensureDirectory(new FileSystem.Directory(FileSystem.Paths.cache, 'chat-share').uri);
    const localFile = new FileSystem.File(directory, `${Date.now()}_${sanitizeFileName(firstAttachment.fileName)}`);
    const downloaded = await FileSystem.File.downloadFileAsync(firstAttachment.url, localFile, { idempotent: true });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: firstAttachment.mimeType,
        dialogTitle: 'Chuyển tiếp',
      });
      return;
    }

    await Share.share({ url: downloaded.uri, message: text || ' ' });
  }, []);

  const saveMessageToDocuments = useCallback(async (message: ChatMessage) => {
    const attachments = getMessageAttachments(message);
    if (attachments.length === 0) {
      Alert.alert('Lưu vào My Documents', 'Tin nhắn này không có tệp đính kèm để lưu.');
      return;
    }

    const directory = await ensureDirectory(new FileSystem.Directory(FileSystem.Paths.document, 'MyDocuments').uri);

    for (const attachment of attachments) {
      const localFile = new FileSystem.File(directory, `${Date.now()}_${sanitizeFileName(attachment.fileName)}`);
      await FileSystem.File.downloadFileAsync(attachment.url, localFile, { idempotent: true });
    }

    Alert.alert('Lưu vào My Documents', 'Đã lưu tệp vào thư mục tài liệu của ứng dụng.');
  }, []);

  const saveMessageFile = useCallback(async (message: ChatMessage) => {
    const attachments = getMessageAttachments(message);
    if (attachments.length === 0) {
      Alert.alert('Lưu file', 'Tin nhắn này không có tệp đính kèm để lưu.');
      return;
    }

    const preferredAttachment = attachments[0];
    const tempDirectory = await ensureDirectory(new FileSystem.Directory(FileSystem.Paths.cache, 'chat-save').uri);

    const tempFile = new FileSystem.File(tempDirectory, `${Date.now()}_${sanitizeFileName(preferredAttachment.fileName)}`);
    const downloaded = await FileSystem.File.downloadFileAsync(preferredAttachment.url, tempFile, { idempotent: true });

    if (message.type === 'image' || message.type === 'video') {
      try {
        if (await ensureMediaLibraryPermission()) {
          await MediaLibrary.createAssetAsync(downloaded.uri);
          Alert.alert('Lưu file', 'Đã lưu tệp vào thư viện thiết bị.');
          return;
        }
      } catch (error) {
        console.warn('Failed to save to media library:', error);
      }
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: preferredAttachment.mimeType,
        dialogTitle: 'Lưu file',
      });
      return;
    }

    Alert.alert('Lưu file', `Đã tải về: ${downloaded.uri}`);
  }, []);

  useEffect(() => {
    initialScrollConversationRef.current = null;
    initialMediaReadyRef.current = new Set();
    setInitialMediaReady(false);

    if (initialMediaTimeoutRef.current) {
      clearTimeout(initialMediaTimeoutRef.current);
      initialMediaTimeoutRef.current = null;
    }
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (initialMediaTimeoutRef.current) {
        clearTimeout(initialMediaTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!conversationId || loading || messages.length === 0) {
      return;
    }

    if (initialMediaReady) {
      return;
    }

    const pendingMediaIds = messages
      .slice(0, 16)
      .filter((message) => !message.is_deleted && !message.is_revoked)
      .filter((message) => message.type === 'image' || message.type === 'video')
      .map((message) => getMessageKey(message))
      .filter(Boolean);

    if (pendingMediaIds.length === 0) {
      setInitialMediaReady(true);
      return;
    }

    initialMediaReadyRef.current = new Set(pendingMediaIds);

    if (initialMediaTimeoutRef.current) {
      clearTimeout(initialMediaTimeoutRef.current);
    }

    initialMediaTimeoutRef.current = setTimeout(() => {
      setInitialMediaReady(true);
      initialMediaTimeoutRef.current = null;
    }, 1200);
  }, [conversationId, getMessageKey, initialMediaReady, loading, messages]);

  const handleInitialMediaReady = useCallback((messageId: string) => {
    if (!messageId || initialMediaReady) {
      return;
    }

    if (initialMediaReadyRef.current.size === 0) {
      return;
    }

    initialMediaReadyRef.current.delete(String(messageId));

    if (initialMediaReadyRef.current.size === 0) {
      if (initialMediaTimeoutRef.current) {
        clearTimeout(initialMediaTimeoutRef.current);
        initialMediaTimeoutRef.current = null;
      }
      setInitialMediaReady(true);
    }
  }, [initialMediaReady]);

  useEffect(() => {
    if (!conversationId || loading || messages.length === 0) {
      return;
    }

    if (initialScrollConversationRef.current === conversationId) {
      return;
    }

    if (!initialScrollReady || !initialMediaReady) {
      return;
    }

    initialScrollConversationRef.current = conversationId;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  }, [conversationId, initialMediaReady, initialScrollReady, loading, messages.length, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (recording) {
        void recording.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [recording]);


  const loadRecentMedia = useCallback(async (silent = false) => {
    setMediaLoading(true);
    try {
      const hasMediaPermission = await ensureMediaLibraryPermission();
      if (!hasMediaPermission) {
        if (!silent) {
          Alert.alert("Quyền truy cập", "Bạn cần cấp quyền thư viện để hiển thị ảnh/video gần đây.");
        }
        setMediaAssets([]);
        return;
      }

      const payload = await MediaLibrary.getAssetsAsync({
        first: 90,
        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });

      const resolvedAssets = await Promise.all(
        (payload.assets || []).map(async (asset) => {
          try {
            const detail = await MediaLibrary.getAssetInfoAsync(asset.id);
            const uri = detail.localUri || asset.uri;
            let thumbnailUri: string | undefined;

            if (asset.mediaType === "video") {
              try {
                // Ensure we have a renderable URI for VideoThumbnails
                const thumbSource = detail.localUri || asset.uri;
                if (thumbSource) {
                  // Try to generate thumbnail with a very small offset for speed
                  VideoThumbnails.getThumbnailAsync(thumbSource, {
                    time: 50,
                    quality: 0.4,
                  }).then(res => {
                    setMediaAssets(prev => prev.map(a => a.id === asset.id ? { ...a, thumbnailUri: res.uri } : a));
                  }).catch(() => {
                    // Fallback: use uri directly if thumbnail fails
                  });
                }
              } catch (e) {
                console.warn("Could not generate video thumbnail for asset:", asset.id, e);
              }
            }

            return {
              id: asset.id,
              mediaType: asset.mediaType,
              filename: asset.filename,
              uri,
              thumbnailUri,
              width: asset.width,
              height: asset.height,
            };
          } catch {
            return {
              id: asset.id,
              mediaType: asset.mediaType,
              filename: asset.filename,
              uri: asset.uri,
            };
          }
        }),
      );

      setMediaAssets(resolvedAssets.filter((item) => !!item.uri));
    } catch (error) {
      const message = String((error as any)?.message || error || "");
      if (/permission/i.test(message)) {
        if (!silent) {
          Alert.alert("Quyền truy cập", "Bạn cần cấp quyền thư viện để hiển thị ảnh/video gần đây.");
        }
        console.warn("Media library permission is not available for recent media.");
      } else {
        console.error("Failed to load media library:", error);
      }
      setMediaAssets([]);
    } finally {
      setMediaLoading(false);
    }
  }, []);

  const uploadAndSendSingleFile = useCallback(
    async (params: {
      uri: string;
      fileName: string;
      mimeType?: string | null;
      fileSize?: number | null;
      explicitType?: "file" | "audio" | "video";
      progressLabel?: string;
    }) => {
      if (!conversationId || !userIdForChat) return;

      const targetId = await ensureConversation();
      if (!targetId) {
        Alert.alert("Lỗi", "Không thể tạo cuộc hội thoại.");
        return;
      }

      const mimeType = getMimeType(params.fileName, params.mimeType);
      let fileSize = Number(params.fileSize || 0);

      if (!fileSize) {
        try {
          const info = await FileSystem.getInfoAsync(params.uri);
          fileSize = Number((info as any)?.size || 0);
        } catch {
          // Ignore size resolution failures; we'll fall back to unknown size.
        }
      }

      const isVideoLike = params.explicitType === 'video' || String(mimeType || '').startsWith('video/');
      const sizeLimit = isVideoLike ? MAX_VIDEO_UPLOAD_SIZE : MAX_UPLOAD_SIZE;
      if (fileSize && fileSize > sizeLimit) {
        const limitMb = Math.round(sizeLimit / 1024 / 1024);
        Alert.alert('Lưu ý', `Tệp vượt quá ${limitMb}MB nên không thể gửi.`);
        return;
      }

      const { uploadUrl, key, fileCategory } = await ChatApi.getMessagePresignedUrl(
        params.fileName,
        mimeType,
      );

      if (!uploadUrl || !key) {
        throw new Error("Không lấy được thông tin upload.");
      }

      setUploadProgress({
        label: params.progressLabel || 'Đang tải tệp...',
        percent: 0,
      });
      await ChatApi.uploadFileToS3(
        uploadUrl,
        params.uri,
        mimeType,
        (percent) => {
          setUploadProgress((current) => ({
            label: current?.label || params.progressLabel || 'Đang tải tệp...',
            percent,
          }));
        },
        params.fileName,
      );
      const createdMessage = await ChatApi.sendMessage({
        conversationId: targetId,
        senderId: userIdForChat,
        content: key,
        type: params.explicitType || fileCategory || "file",
        size: fileSize,
        fileName: params.fileName,
        replyToMsgId: replyToMessage?.msg_id,
      });
      setMessages((current) =>
        patchMessageById(current, createdMessage, undefined, normalizeMessages),
      );
      setReplyToMessage(null);
      setPendingScrollToBottom();
      setUploadProgress(null);
    },
    [conversationId, ensureConversation, normalizeMessages, replyToMessage?.msg_id, setMessages, setPendingScrollToBottom, userIdForChat],
  );

  const uploadAndSendImages = useCallback(
    async (
      assets: Array<{
        uri: string;
        fileName?: string | null;
        mimeType?: string | null;
        fileSize?: number | null;
        width?: number;
        height?: number;
      }>,
    ) => {
      if (!conversationId || !userIdForChat || assets.length === 0) return;

      const targetId = await ensureConversation();
      if (!targetId) {
        Alert.alert("Lỗi", "Không thể tạo cuộc hội thoại.");
        return;
      }

      const hydratedAssets = await Promise.all(
        assets.map(async (asset) => {
          if (asset.fileSize != null) return asset;

          try {
            const info = await FileSystem.getInfoAsync(asset.uri);
            const resolvedSize = Number((info as any)?.size || 0);
            return {
              ...asset,
              fileSize: resolvedSize || null,
            };
          } catch {
            return asset;
          }
        }),
      );

      const validAssets = hydratedAssets.filter(
        (asset) => Number(asset.fileSize || 0) <= MAX_UPLOAD_SIZE || !asset.fileSize,
      );
      if (validAssets.length !== hydratedAssets.length) {
        Alert.alert("Lưu ý", "Một số ảnh lớn hơn 50MB nên đã được bỏ qua.");
      }
      if (validAssets.length === 0) return;

      const localTempId = `local-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticMessage = buildOptimisticImageMessage({
        localId: localTempId,
        conversationId: targetId,
        senderId: userIdForChat,
        assets: validAssets,
        replyToMsgId: replyToMessage?.msg_id,
      });

      setMessages((current) => normalizeMessages([...current, optimisticMessage]));
      setPendingScrollToBottom();

      const keys: string[] = [];
      try {
        for (let index = 0; index < validAssets.length; index += 1) {
          const asset = validAssets[index];
          const baseFileName = asset.fileName || `image_${Date.now()}_${index}.jpg`;

          let uploadUri = asset.uri;
          let fileName = sanitizeFileName(baseFileName);
          let mimeType = getMimeType(fileName, asset.mimeType || "image/jpeg");

          try {
            // Normalize all outgoing images to low-quality JPEG to reduce transfer and render cost.
            const converted = await ImageManipulator.manipulateAsync(
              asset.uri,
              [],
              {
                compress: 0.2,
                format: ImageManipulator.SaveFormat.JPEG,
              },
            );
            uploadUri = converted.uri;
            fileName = replaceFileExtension(fileName, "jpg");
            mimeType = "image/jpeg";
          } catch (error) {
            console.warn('Failed to pre-compress image before upload, fallback to original:', error);

            if (isHeicLike(fileName, mimeType)) {
              fileName = replaceFileExtension(fileName, "jpg");
              mimeType = "image/jpeg";
            } else if (mimeType === "image/jpeg" && !["jpg", "jpeg"].includes(getFileExtension(fileName))) {
              fileName = replaceFileExtension(fileName, "jpg");
            }
          }

          const { uploadUrl, key } = await ChatApi.getMessagePresignedUrl(fileName, mimeType);
          if (!uploadUrl || !key) {
            throw new Error("Không lấy được thông tin upload ảnh.");
          }

          await ChatApi.uploadFileToS3(
            uploadUrl,
            uploadUri,
            mimeType,
            (percent) => {
              const overall = Math.round(((index + percent / 100) / validAssets.length) * 100);
              setUploadProgress({
                label: `Đang tải ảnh ${index + 1}/${validAssets.length}`,
                percent: overall,
              });
              setMessages((current) =>
                current.map((item) =>
                  (item._id === localTempId || item.local_temp_id === localTempId)
                    ? {
                      ...item,
                      local_upload_progress: overall,
                    }
                    : item,
                ),
              );
            },
            fileName,
          );
          keys.push(key);
        }

        const createdMessage = await ChatApi.sendMessage({
          conversationId: targetId,
          senderId: userIdForChat,
          content: keys,
          type: "image",
          replyToMsgId: replyToMessage?.msg_id,
        });

        setMessages((current) =>
          normalizeMessages(
            current.map((item) =>
              (item._id === localTempId || item.local_temp_id === localTempId)
                ? {
                  ...createdMessage,
                  local_temp_id: item.local_temp_id || localTempId,
                }
                : item,
            ),
          ),
        );
        setReplyToMessage(null);
        setPendingScrollToBottom();
        setUploadProgress(null);
      } catch (error) {
        setMessages((current) =>
          current.map((item) =>
            (item._id === localTempId || item.local_temp_id === localTempId)
              ? {
                ...item,
                local_status: 'error',
                local_error: 'Không thể gửi ảnh',
              }
              : item,
          ),
        );
        throw error;
      }
    },
    [conversationId, ensureConversation, normalizeMessages, replyToMessage?.msg_id, setPendingScrollToBottom, userIdForChat],
  );

  const pickImagesAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    setIsSendingAttachment(true);
    dismissKeyboard();

    if (Platform.OS === 'android') {
      await ensureImageLibraryPermission().catch(() => false);
    } else if (!(await ensureImageLibraryPermission())) {
      setIsSendingAttachment(false);
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền thư viện ảnh để gửi ảnh.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.9,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const imageAssets = result.assets.filter((asset) => String(asset.type || '').toLowerCase() !== 'video');
      const videoAssets = result.assets.filter((asset) => String(asset.type || '').toLowerCase() === 'video');

      if (imageAssets.length > 0) {
        await uploadAndSendImages(imageAssets);
      }

      for (const videoAsset of videoAssets) {
        await uploadAndSendSingleFile({
          uri: videoAsset.uri,
          fileName: videoAsset.fileName || `video_${Date.now()}.mp4`,
          mimeType: getMimeType(videoAsset.fileName, videoAsset.mimeType || 'video/mp4'),
          explicitType: 'video',
          fileSize: videoAsset.fileSize,
          progressLabel: 'Đang tải video...',
        });
      }
      closeImagePanel();
    } catch (error) {
      console.error("Failed to send images:", error);
      Alert.alert("Lỗi", "Không thể gửi ảnh. Vui lòng thử lại.");
    } finally {
      setUploadProgress(null);
      setIsSendingAttachment(false);
    }
  }, [closeImagePanel, conversationId, dismissKeyboard, isSendingAttachment, uploadAndSendImages, uploadAndSendSingleFile, userIdForChat]);

  const takePhotoAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    setIsSendingAttachment(true);
    dismissKeyboard();

    const hasCameraPermission = await ensureCameraPermission();
    if (!hasCameraPermission) {
      setIsSendingAttachment(false);
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền camera để chụp ảnh.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || result.assets.length === 0) {
      setIsSendingAttachment(false);
      return;
    }

    try {
      await uploadAndSendImages(
        result.assets.map((asset) => ({
          uri: asset.uri,
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
          mimeType: getMimeType(asset.fileName, 'image/jpeg'),
          width: asset.width,
          height: asset.height,
        })),
      );
      closeImagePanel();
    } catch (error) {
      console.error("Failed to send camera image:", error);
      Alert.alert("Lỗi", "Không thể gửi ảnh từ camera.");
    } finally {
      setUploadProgress(null);
      setIsSendingAttachment(false);
    }
  }, [closeImagePanel, conversationId, dismissKeyboard, isSendingAttachment, uploadAndSendImages, userIdForChat]);

  const recordVideoAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    setIsSendingAttachment(true);
    dismissKeyboard();

    const hasCameraPermission = await ensureCameraPermission();
    const hasMicrophonePermission = await ensureMicrophonePermission();
    if (!hasCameraPermission || !hasMicrophonePermission) {
      setIsSendingAttachment(false);
      Alert.alert(
        "Quyền truy cập",
        "Bạn cần cấp quyền camera và micro để quay video.",
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.85,
        videoMaxDuration: 180,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      await uploadAndSendSingleFile({
        uri: asset.uri,
        fileName: asset.fileName || `video_${Date.now()}.mp4`,
        mimeType: getMimeType(asset.fileName, asset.mimeType || "video/mp4"),
        explicitType: "video",
        fileSize: asset.fileSize,
        progressLabel: "Đang tải video...",
      });
      closeImagePanel();
    } catch (error) {
      console.error("Failed to send camera video:", error);
      Alert.alert("Lỗi", "Không thể gửi video từ camera.");
    } finally {
      setUploadProgress(null);
      setIsSendingAttachment(false);
    }
  }, [
    closeImagePanel,
    conversationId,
    dismissKeyboard,
    isSendingAttachment,
    uploadAndSendSingleFile,
    userIdForChat,
  ]);

  const runAndroidMediaAction = useCallback((action: () => void) => {
    setAndroidMediaOptionsVisible(false);
    setTimeout(action, 120);
  }, []);

  const pickFileAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    setIsSendingAttachment(true);
    dismissKeyboard();

    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) {
      setIsSendingAttachment(false);
      return;
    }

    const validAssets = result.assets.filter((asset) => {
      const fileName = String(asset.name || '');
      const mimeType = String(asset.mimeType || '');
      const ext = getFileExtension(fileName).toLowerCase();
      const isVideoLike = mimeType.startsWith('video/') || ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi'].includes(ext);
      const sizeLimit = isVideoLike ? MAX_VIDEO_UPLOAD_SIZE : MAX_UPLOAD_SIZE;

      return Number(asset.size || 0) <= sizeLimit || !asset.size;
    });

    if (validAssets.length !== result.assets.length) {
      const skipped = result.assets.length - validAssets.length;
      Alert.alert("Lưu ý", `${skipped} tệp vượt quá giới hạn (50MB file, 100MB video) đã được bỏ qua.`);
    }
    if (validAssets.length === 0) {
      setIsSendingAttachment(false);
      return;
    }

    try {
      for (let index = 0; index < validAssets.length; index += 1) {
        const asset = validAssets[index];
        const fileName = asset.name || `file_${Date.now()}_${index}`;
        const resolvedMimeType = getMimeType(fileName, asset.mimeType);
        const isVideoLike = String(resolvedMimeType || '').startsWith('video/');

        await uploadAndSendSingleFile({
          uri: asset.uri,
          fileName,
          mimeType: resolvedMimeType,
          fileSize: Number(asset.size || 0),
          explicitType: isVideoLike ? 'video' : undefined,
          progressLabel: `Đang tải tệp ${index + 1}/${validAssets.length}...`,
        });
      }
    } catch (error) {
      console.error("Failed to send file:", error);
      Alert.alert("Lỗi", "Không thể gửi tệp. Vui lòng thử lại.");
    } finally {
      setUploadProgress(null);
      setIsSendingAttachment(false);
    }
  }, [conversationId, dismissKeyboard, isSendingAttachment, uploadAndSendSingleFile, userIdForChat]);

  const startVoiceRecording = useCallback(async () => {
    if (isRecordingVoice) return;
    dismissKeyboard();

    const hasMicrophonePermission = await ensureMicrophonePermission();
    if (!hasMicrophonePermission) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền micro để ghi âm.");
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const nextRecording = new Audio.Recording();
      await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      nextRecording.setOnRecordingStatusUpdate((status) => {
        setRecordingDurationMs(status.durationMillis || 0);
      });
      nextRecording.setProgressUpdateInterval(180);
      await nextRecording.startAsync();

      setRecording(nextRecording);
      setIsRecordingVoice(true);
      setRecordingDurationMs(0);
      setPendingVoiceUri(null);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Lỗi", "Không thể bắt đầu ghi âm.");
    }
  }, [dismissKeyboard, isRecordingVoice]);

  const stopVoiceRecording = useCallback(async () => {
    if (!recording) return null;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setPendingVoiceUri(uri);
      return uri;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      return null;
    } finally {
      setRecording(null);
      setIsRecordingVoice(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
    }
  }, [recording]);

  const stopVoiceCapture = useCallback(async () => {
    const uri = await stopVoiceRecording();
    if (!uri) return;
  }, [stopVoiceRecording]);

  const cancelVoiceRecording = useCallback(async () => {
    isHoldRecordingRef.current = false;
    setPendingVoiceUri(null);
    setRecordingDurationMs(0);
    if (recording) {
      await recording.stopAndUnloadAsync().catch(() => undefined);
    }
    setRecording(null);
    setIsRecordingVoice(false);
    setVoicePanelVisible(false);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => undefined);
  }, [recording, setVoicePanelVisible]);

  const sendVoiceRecording = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    const uri = pendingVoiceUri || await stopVoiceRecording();
    if (!uri) return;

    setIsSendingAttachment(true);
    try {
      const filename = `voice_${Date.now()}.m4a`;
      await uploadAndSendSingleFile({
        uri,
        fileName: filename,
        mimeType: "audio/mp4",
        explicitType: "audio",
        progressLabel: 'Đang tải ghi âm...',
      });
      setVoicePanelVisible(false);
      setRecordingDurationMs(0);
      setPendingVoiceUri(null);
    } catch (error) {
      console.error("Failed to send voice:", error);
      Alert.alert("Lỗi", "Không thể gửi ghi âm.");
    } finally {
      setUploadProgress(null);
      setIsSendingAttachment(false);
    }
  }, [conversationId, isSendingAttachment, pendingVoiceUri, setVoicePanelVisible, stopVoiceRecording, uploadAndSendSingleFile, userIdForChat]);

  const sendSelectedPanelMedia = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment || selectedMediaIds.length === 0) return;

    const selectedAssets = mediaAssets.filter((asset) => selectedMediaIds.includes(asset.id));
    const imageAssets = selectedAssets.filter((asset) => asset.mediaType !== 'video');
    const videoAssets = selectedAssets.filter((asset) => asset.mediaType === 'video');

    setIsSendingAttachment(true);
    try {
      if (imageAssets.length > 0) {
        await uploadAndSendImages(
          imageAssets.map((asset) => ({
            uri: asset.uri,
            fileName: asset.filename || `image_${Date.now()}.jpg`,
            mimeType: getMimeType(asset.filename, 'image/jpeg'),
            width: asset.width,
            height: asset.height,
          })),
        );
      }

      for (const asset of videoAssets) {
        const fileName = asset.filename || `video_${Date.now()}.mp4`;
        await uploadAndSendSingleFile({
          uri: asset.uri,
          fileName,
          mimeType: getMimeType(fileName, 'video/mp4'),
          explicitType: 'video',
          progressLabel: 'Đang tải video...',
        });
      }

      clearSelectedMedia();
      closeImagePanel();
    } catch (error) {
      console.error('Failed to send selected media:', error);
      Alert.alert('Lỗi', 'Không thể gửi ảnh/video đã chọn.');
    } finally {
      setUploadProgress(null);
      setIsSendingAttachment(false);
    }
  }, [clearSelectedMedia, closeImagePanel, conversationId, isSendingAttachment, mediaAssets, selectedMediaIds, uploadAndSendImages, uploadAndSendSingleFile, userIdForChat]);

  const formatVoiceDuration = useCallback((durationMs: number) => {
    const total = Math.floor(durationMs / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, []);

  const displayMessages = useMemo(() => {
    if (!isMyDocuments || myDocumentsFilter === 'all') {
      return messages;
    }

    return messages.filter((message) => {
      const type = String(message.type || '').toLowerCase();
      if (myDocumentsFilter === 'image') {
        return type === 'image' || type === 'video';
      }
      if (myDocumentsFilter === 'text') {
        return type === 'text';
      }
      return type === myDocumentsFilter;
    });
  }, [isMyDocuments, messages, myDocumentsFilter]);

  useEffect(() => {
    const currentUserId = String(userIdForChat || "").trim();
    if (!currentUserId) {
      setIsChatLocked(false);
      return;
    }

    let locked = false;
    for (let index = messages.length - 1; index >= 0; index--) {
      const message = messages[index];
      const action = String(message?.system_meta?.action || "").toLowerCase();
      if (!action) continue;

      if (
        (action === "removed_from_group" || action === "member_removed" || action === "member_blocked") &&
        String(message?.system_meta?.removed_user_id || (message?.system_meta as any)?.user_id || "") === currentUserId
      ) {
        locked = true;
        break; // Stop at the newest membership action
      }

      if (
        (action === "member_added" || action === "member_join" || action === "system_add") &&
        (
          String((message?.system_meta as any)?.user_id || "") === currentUserId ||
          message?.system_meta?.added_user_ids?.some(id => String(id) === currentUserId)
        )
      ) {
        locked = false;
        break; // Stop at the newest membership action
      }

      if (action === "group_dissolved") {
        locked = true;
        continue;
      }

      if (action === "member_added") {
        const addedIds = Array.isArray(message?.system_meta?.added_user_ids)
          ? message.system_meta?.added_user_ids
          : [];
        if (addedIds.map((id) => String(id)).includes(currentUserId)) {
          locked = false;
        }
      }
    }

    if (relationship?.status === 'BLOCKED_BY_ME' || relationship?.status === 'BLOCKED_BY_OTHER') {
      setIsChatLocked(true);
      return;
    }

    const participantStatus = String(participant?.status || '').toLowerCase();
    const participantSettings = (participant as any)?.settings || {};
    const participantRemovedAt =
      participantSettings.removed_from_group_at || (participant as any)?.removed_from_group_at;
    const participantDissolvedAt =
      participantSettings.group_dissolved_at || (participant as any)?.group_dissolved_at;

    if (
      conversation?.type === 'group' &&
      participant &&
      participantStatus !== 'invited' &&
      !participantRemovedAt &&
      !participantDissolvedAt
    ) {
      setIsChatLocked(false);
      return;
    }

    setIsChatLocked(locked);
  }, [conversation?.type, messages, participant, relationship?.status, userIdForChat]);

  useEffect(() => {
    if (!isChatLocked) return;
    setMessageText("");
    setReplyToMessage(null);
    closeAllPanels();
  }, [closeAllPanels, isChatLocked]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setPendingScrollToBottom();
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, [setPendingScrollToBottom]);

  // Setup focus effect
  useFocusEffect(
    useCallback(() => {
      void loadConversation();
      void loadRecentMedia(true);

      // Handle highlighting from search results
      if (searchHighlightedMessageId) {
        // Small delay to ensure list is ready
        setTimeout(() => {
          highlightMessage(searchHighlightedMessageId);
        }, 300);
      }

      return cleanupHighlight;
    }, [loadConversation, cleanupHighlight, loadRecentMedia, searchHighlightedMessageId, highlightMessage]),
  );

  useEffect(() => {
    if (!imagePanelVisible) return;
    if (mediaLoading) return;
    if (mediaAssets.length > 0) return;

    void loadRecentMedia();
  }, [imagePanelVisible, loadRecentMedia, mediaAssets.length, mediaLoading]);

  // Socket event handlers
  const handleTypingStart = useCallback(
    (payload: { conversationId?: string; conversation_id?: string; userId?: string; user_id?: string }) => {
      const payloadConversationId = String(payload?.conversationId || payload?.conversation_id || "");
      if (payloadConversationId !== String(conversationId || "")) return;

      const payloadUserId = String(payload?.userId || payload?.user_id || "");
      if (!payloadUserId) return;
      if (String(payloadUserId) === String(userIdForChat || "")) return;

      setTypingUserIds((prev) => ({
        ...prev,
        [payloadUserId]: Date.now(),
      }));
    },
    [conversationId, userIdForChat],
  );

  const handleTypingStop = useCallback(
    (payload: { conversationId?: string; conversation_id?: string; userId?: string; user_id?: string }) => {
      const payloadConversationId = String(payload?.conversationId || payload?.conversation_id || "");
      if (payloadConversationId !== String(conversationId || "")) return;

      const payloadUserId = String(payload?.userId || payload?.user_id || "");
      if (!payloadUserId) return;

      setTypingUserIds((prev) => {
        if (!prev[payloadUserId]) return prev;
        const next = { ...prev };
        delete next[payloadUserId];
        return next;
      });
    },
    [conversationId],
  );

  const handleIncomingMessage = useCallback(
    (payload: ChatMessage) => {
      if (String(payload?.conversation_id || "") !== String(conversationId))
        return;
      setMessages((current) =>
        patchMessageById(current, payload, undefined, normalizeMessages),
      );

      const msgId = String(payload?.msg_id || payload?._id || "").trim();
      const senderId = String(payload?.sender_id || "").trim();
      if (msgId && userIdForChat && senderId !== String(userIdForChat)) {
        chatSocket.markMessagesDeliveredUpTo(String(conversationId), String(userIdForChat), msgId);
        chatSocket.markMessageSeenUpTo(String(conversationId), String(userIdForChat), msgId);
        void ChatApi.markAsRead(String(conversationId), String(userIdForChat), msgId)
          .catch(() => undefined);
      }

      setPendingScrollToBottom();
    },
    [conversationId, normalizeMessages, setPendingScrollToBottom, userIdForChat],
  );

  useEffect(() => {
    if (!conversationId || !userIdForChat || !latestCursorMsgId) return;

    chatSocket.markMessagesDeliveredUpTo(
      String(conversationId),
      String(userIdForChat),
      latestCursorMsgId,
    );
    chatSocket.markMessageSeenUpTo(
      String(conversationId),
      String(userIdForChat),
      latestCursorMsgId,
    );
  }, [conversationId, latestCursorMsgId, userIdForChat]);

  const handleReactionChanged = useCallback(
    (payload: ChatMessage) => {
      if (String(payload?.conversation_id || "") !== String(conversationId))
        return;
      setMessages((current) =>
        patchMessageById(current, payload, undefined, normalizeMessages),
      );
    },
    [conversationId, normalizeMessages],
  );

  const handleMessagePinned = useCallback(
    (payload: ChatMessage) => {
      if (String(payload?.conversation_id || "") !== String(conversationId))
        return;
      setMessages((current) =>
        patchMessageById(current, payload, undefined, normalizeMessages),
      );
      setPinnedMessages((current) => {
        return patchMessageById(
          current,
          payload,
          { remove: !payload.is_pinned },
          normalizePinnedMessages,
        );
      });
    },
    [conversationId, normalizeMessages, normalizePinnedMessages],
  );

  const handleMessageRevoked = useCallback(
    (payload: ChatMessage) => {
      const payloadConversationId = String(
        (payload as any)?.conversation_id || (payload as any)?.conversationId || "",
      );

      if (payloadConversationId !== String(conversationId))
        return;
      const revokedMsgId = normalizeMessageId(payload?.msg_id || payload?._id);
      const revokedContent = Array.isArray(payload?.content)
        ? payload.content
        : ["Tin nhắn đã được thu hồi"];

      setMessages((current) =>
        normalizeMessages(
          current.map((message) => {
            const messageId = normalizeMessageId(getMessageKey(message));
            const replyTargetId = normalizeMessageId(
              message.reply_to_msg_id || message.reply_to?.msg_id,
            );

            if (replyTargetId && replyTargetId === revokedMsgId) {
              return {
                ...message,
                reply_to: {
                  ...(message.reply_to || {
                    sender_id: '',
                    type: 'text' as const,
                    content: '',
                  }),
                  msg_id: revokedMsgId,
                  is_revoked: true,
                  is_deleted: false,
                  content: 'Tin nhắn đã được thu hồi',
                },
              };
            }

            if (!revokedMsgId || messageId !== revokedMsgId) {
              return message;
            }

            return {
              ...message,
              ...payload,
              content: revokedContent,
              is_revoked: true,
              reactions: [],
            };
          }),
        ),
      );

      setPinnedMessages((current) =>
        current.filter((message) => normalizeMessageId(getMessageKey(message)) !== revokedMsgId),
      );
    },
    [conversationId, normalizeMessages, setPinnedMessages],
  );

  const handleMessageDeleted = useCallback(
    (payload: ChatMessage) => {
      if (String(payload?.conversation_id || "") !== String(conversationId))
        return;
      setMessages((current) =>
        patchMessageById(current, payload, { remove: true }, normalizeMessages),
      );
      setPinnedMessages((current) =>
        patchMessageById(current, payload, { remove: true }, normalizePinnedMessages),
      );
    },
    [conversationId, normalizeMessages, normalizePinnedMessages],
  );

  const handleRemovedFromGroup = useCallback(
    (payload: { conversationId?: string; conversation_id?: string }) => {
      const payloadConvId = String(payload?.conversationId || payload?.conversation_id || "");
      console.log('--- Socket: bi_xoa_khoi_nhom ---', { payloadConvId, currentId: conversationId });

      if (payloadConvId === String(conversationId)) {
        setIsChatLocked(true);
        setMessageText("");
        setReplyToMessage(null);
        closeAllPanels();
        chatSocket.leaveConversation(String(conversationId));

        Alert.alert(
          "Thông báo",
          "Bạn đã không còn là thành viên của nhóm này.",
          [{ text: "OK", onPress: () => router.replace('/(main)/(tabs)/home') }]
        );
      }
    },
    [closeAllPanels, conversationId, router],
  );

  const handleBlockedFromGroup = useCallback(
    (payload: { conversationId?: string; conversation_id?: string; userId?: string; user_id?: string }) => {
      const payloadConvId = String(payload?.conversationId || payload?.conversation_id || "");
      const payloadUserId = String(payload?.userId || payload?.user_id || "");
      console.log('--- Socket: bi_chan_khoi_nhom ---', { payloadConvId, payloadUserId, currentId: conversationId, me: userIdForChat });

      // Since this is emitted to user room, if we receive it, it's for us.
      // We only redirect if we are currently looking at the affected group.
      if (payloadConvId === String(conversationId)) {
        setIsChatLocked(true);
        chatSocket.leaveConversation(String(conversationId));

        Alert.alert(
          "Thông báo",
          "Bạn đã bị chặn khỏi nhóm này.",
          [{ text: "OK", onPress: () => router.replace('/(main)/(tabs)/home') }]
        );
      }
    },
    [conversationId, router],
  );

  const handleGroupDissolved = useCallback(
    async (payload: {
      conversationId?: string;
      message?: string;
      dissolvedByName?: string;
      deleteForOwner?: boolean;
    }) => {
      if (String(payload?.conversationId || "") !== String(conversationId)) {
        return;
      }

      if (payload?.deleteForOwner) {
        chatSocket.leaveConversation(String(conversationId));
        try {
          if (userIdForChat) {
            await ChatApi.deleteConversationForMe(conversationId, userIdForChat);
          }
        } catch (err) {
          console.error("Error deleting conversation:", err);
        }
        setTimeout(() => {
          if (router.dismissAll) router.dismissAll();
          router.replace("/(main)/(tabs)/home");
        }, 300);
      } else {
        setIsChatLocked(true);
        chatSocket.leaveConversation(String(conversationId));
        Alert.alert(
          "Thông báo",
          "Nhóm này đã bị giải tán.",
          [{ text: "OK", onPress: () => router.replace('/(main)/(tabs)/home') }]
        );
      }
    },
    [conversationId, userIdForChat, router, loadConversation],
  );

  const handleConversationSynced = useCallback(
    (payload: any) => {
      const syncedConversationId = String(
        payload?._id || payload?.conversation?._id || payload?.conversationId || "",
      );
      if (syncedConversationId !== String(conversationId || "")) {
        return;
      }

      setIsChatLocked(false);
      void loadConversation();
    },
    [conversationId, loadConversation],
  );

  const handleMessageUpdated = useCallback(
    (payload: ChatMessage) => {
      const payloadConvId = String((payload as any).conversation_id || (payload as any).conversationId || "");
      if (payloadConvId !== String(conversationId)) return;

      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.msg_id || msg._id || "") === String(payload.msg_id || payload._id || "")
            ? { ...msg, ...payload }
            : msg
        )
      );
    },
    [conversationId, setMessages]
  );

  const handleGroupUpdated = useCallback(
    (payload: any) => {
      const payloadConvId = String(payload?._id || payload?.conversationId || "");
      if (payloadConvId !== String(conversationId)) return;
      void loadConversation();
    },
    [conversationId, loadConversation],
  );

  const handleGroupCallUpdated = useCallback(
    (payload: any) => {
      const payloadConvId = String(payload?.conversationId || "");
      if (payloadConvId !== String(conversationId || "")) return;

      setConversation((current: any) => {
        if (!current) return current;
        return {
          ...current,
          is_calling: !!payload?.isCalling,
          active_call_id: payload?.isCalling ? String(payload?.callId || "") : "",
          active_call_type: payload?.isCalling ? (payload?.callType || "video") : undefined,
          active_call_participant_count: Number(payload?.participantCount || 0),
        };
      });
    },
    [conversationId, setConversation],
  );

  const applyParticipantCursor = useCallback(
    (payload: any) => {
      const payloadConvId = String(
        payload?.conversationId || payload?.conversation_id || "",
      );
      if (payloadConvId !== String(conversationId || "")) return;

      const participant = payload?.participant || {};
      const userId = String(
        payload?.userId ||
        payload?.user_id ||
        participant?.user_id ||
        participant?._id ||
        "",
      ).trim();
      const msgId = String(
        payload?.msgId ||
        payload?.msg_id ||
        payload?.last_read_message_id ||
        payload?.last_delivered_message_id ||
        participant?.last_read_message_id ||
        participant?.last_delivered_message_id ||
        "",
      ).trim();
      if (!userId || !msgId) return;

      const isSeen =
        payload?.receiptType === "seen" ||
        payload?.status === "seen" ||
        Boolean(payload?.readAt || payload?.last_read_at || payload?.last_read_message_id);
      const now = new Date().toISOString();

      setConversation((current: any) => {
        if (!current) return current;
        const existingParticipants = Array.isArray(current.participants)
          ? current.participants
          : [];
        let didUpdate = false;

        const nextParticipants = existingParticipants.map((item: any) => {
          const itemUserId = String(item?.user_id || item?._id || "").trim();
          if (itemUserId !== userId) return item;
          didUpdate = true;

          return {
            ...item,
            ...participant,
            user_id: item.user_id || participant.user_id || userId,
            last_delivered_message_id:
              participant.last_delivered_message_id ||
              payload.last_delivered_message_id ||
              payload.msgId ||
              payload.msg_id ||
              msgId,
            last_delivered_at:
              participant.last_delivered_at ||
              payload.last_delivered_at ||
              payload.deliveredAt ||
              now,
            ...(isSeen
              ? {
                  last_read_message_id:
                    participant.last_read_message_id ||
                    payload.last_read_message_id ||
                    payload.msgId ||
                    payload.msg_id ||
                    msgId,
                  last_read_at:
                    participant.last_read_at ||
                    payload.last_read_at ||
                    payload.readAt ||
                    now,
                }
              : {}),
          };
        });

        if (!didUpdate) {
          nextParticipants.push({
            ...participant,
            user_id: userId,
            last_delivered_message_id:
              participant.last_delivered_message_id ||
              payload.last_delivered_message_id ||
              msgId,
            last_delivered_at:
              participant.last_delivered_at ||
              payload.last_delivered_at ||
              payload.deliveredAt ||
              now,
            ...(isSeen
              ? {
                  last_read_message_id:
                    participant.last_read_message_id ||
                    payload.last_read_message_id ||
                    msgId,
                  last_read_at:
                    participant.last_read_at ||
                    payload.last_read_at ||
                    payload.readAt ||
                    now,
                }
              : {}),
          });
        }

        return {
          ...current,
          participants: nextParticipants,
        };
      });
    },
    [conversationId, setConversation],
  );

  // Setup socket listeners
  useMessageSocket({
    conversationId,
    userIdForChat,
    onIncomingMessage: handleIncomingMessage,
    onReactionChanged: handleReactionChanged,
    onMessagePinned: handleMessagePinned,
    onMessageRevoked: handleMessageRevoked,
    onMessageDeleted: handleMessageDeleted,
    onMessageUpdated: handleMessageUpdated,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop,
    onRemovedFromGroup: handleRemovedFromGroup,
    onBlockedFromGroup: handleBlockedFromGroup,
    onGroupDissolved: handleGroupDissolved,
    onConversationSynced: handleConversationSynced,
    onGroupUpdated: handleGroupUpdated,
    onGroupCallUpdated: handleGroupCallUpdated,
    onParticipantCursorChanged: applyParticipantCursor,
    onConversationReadSynced: applyParticipantCursor,
  });

  useEffect(() => {
    const handleRelationshipUpdate = (payload: any) => {
      const normalizedPayload = normalizeRelationshipPayload(payload);
      // If this is a private chat, check if the update is relevant
      if (conversation?.type === 'private') {
        const otherParticipantId = conversation.participants?.find(p => String((p as any).user_id) !== String(userIdForChat))?.user_id;
        if (otherParticipantId &&
          (String(normalizedPayload.requester_id) === String(otherParticipantId) ||
            String(normalizedPayload.receiver_id) === String(otherParticipantId))) {
          console.log('[ChatScreen] Relationship status updated via socket:', normalizedPayload.status);
          setRelationship(normalizedPayload);
        }
      }
    };

    chatSocket.on('cap_nhat_quan_he', handleRelationshipUpdate);
    return () => {
      chatSocket.off('cap_nhat_quan_he', handleRelationshipUpdate);
    };
  }, [conversation, userIdForChat]);

  const handleDeleteConversationForMe = useCallback(() => {
    if (!conversationId || !userIdForChat) return;

    Alert.alert('Xóa cuộc trò chuyện', 'Bạn có chắc muốn xóa cuộc trò chuyện này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await ChatApi.deleteConversationForMe(conversationId, userIdForChat);
            router.back();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa cuộc trò chuyện');
          }
        },
      },
    ]);
  }, [conversationId, router, userIdForChat]);

  const handleCreatePoll = useCallback(async (data: { question: string; options: { id: string; name: string; voters: string[] }[]; multipleChoice: boolean }) => {
    if (!conversationId || !userIdForChat) return;

    const targetId = await ensureConversation();
    if (!targetId) {
      Alert.alert("Lỗi", "Không thể tạo cuộc hội thoại.");
      return;
    }

    try {
      const createdMessage = await ChatApi.sendMessage({
        conversationId: targetId,
        senderId: userIdForChat,
        content: "Khảo sát",
        type: "poll",
        pollQuestion: data.question,
        pollMultipleChoice: data.multipleChoice,
        pollOptions: data.options,
        replyToMsgId: replyToMessage?.msg_id,
      });
      setMessages((current) =>
        patchMessageById(current, createdMessage, undefined, normalizeMessages),
      );
      setReplyToMessage(null);
      setPendingScrollToBottom();
      setPollModalVisible(false);
    } catch (error) {
      console.error("Failed to create poll:", error);
      Alert.alert("Lỗi", "Không thể tạo khảo sát. Vui lòng thử lại.");
    }
  }, [conversationId, ensureConversation, normalizeMessages, replyToMessage?.msg_id, setMessages, setPendingScrollToBottom, userIdForChat]);



  // Send message
  const onSendMessage = useCallback(async () => {
    if (!conversationId || !userIdForChat || isChatLocked) return;

    const trimmed = messageText.trim();
    if (!trimmed) return;

    const targetId = await ensureConversation();
    if (!targetId) {
      Alert.alert("Lỗi", "Không thể tạo cuộc hội thoại.");
      return;
    }

    const isLink = isStandaloneLink(trimmed);
    const normalizedContent = isLink ? normalizeLink(trimmed) || trimmed : trimmed;

    stopTyping();

    try {
      const createdMessage = await ChatApi.sendMessage({
        conversationId: targetId,
        senderId: userIdForChat,
        content: normalizedContent,
        type: isLink ? "link" : "text",
        replyToMsgId: replyToMessage?.msg_id,
      });
      setMessages((current) =>
        patchMessageById(current, createdMessage, undefined, normalizeMessages),
      );

      setMessageText("");
      setReplyToMessage(null);
      setPendingScrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn.");
    }
  }, [
    conversationId,
    ensureConversation,
    isChatLocked,
    userIdForChat,
    messageText,
    normalizeMessages,
    replyToMessage?.msg_id,
    setMessages,
    setPendingScrollToBottom,
    stopTyping,
  ]);

  const handleSummarizeChat = useCallback(async () => {
    if (!conversationId) return;
    setIsSummarizing(true);
    setSummaryResult(null);
    setShowSummaryModal(true);
    try {
      const aiConvId = String(conversationId).startsWith('VIRTUAL_CONV_')
        ? String(conversationId).replace('VIRTUAL_CONV_', '')
        : conversationId;
      const result = await ChatApi.summarizeConversation(aiConvId, userIdForChat);
      setSummaryResult(result.summary);
    } catch (error) {
      console.error("Failed to summarize chat:", error);
      Alert.alert("Lỗi", "Không thể tóm tắt hội thoại lúc này.");
    } finally {
      setIsSummarizing(false);
    }
  }, [conversationId]);

  const handleStopSTT = useCallback(async () => {
    if (!sttRecordingRef.current) {
      setIsRecordingSTT(false);
      return;
    }

    try {
      setIsSTTLoading(true);
      await sttRecordingRef.current.stopAndUnloadAsync();
      const uri = sttRecordingRef.current.getURI();
      sttRecordingRef.current = null;
      setIsRecordingSTT(false);

      if (!uri) {
        setIsSTTLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        type: 'audio/m4a',
        name: 'stt_audio.m4a',
      } as any);

      const response = await ChatApi.transcribeAudio(formData);
      if (response.text && response.text.trim()) {
        setMessageText(prev => (prev ? `${prev} ${response.text}` : response.text));
      }
    } catch (err) {
      console.error("STT error:", err);
      Alert.alert("Lỗi", "Không thể xử lý giọng nói lúc này.");
    } finally {
      setIsSTTLoading(false);
    }
  }, []);

  const handleCancelSTT = useCallback(async () => {
    if (sttRecordingRef.current) {
      await sttRecordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      sttRecordingRef.current = null;
    }
    setIsRecordingSTT(false);
    setIsSTTLoading(false);
  }, []);

  const handleTranscribeVoice = useCallback(async () => {
    if (isSTTLoading || isRecordingSTT) return;

    const hasMicrophonePermission = await ensureMicrophonePermission();
    if (!hasMicrophonePermission) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền micro để sử dụng tính năng này.");
      return;
    }

    try {
      if (sttRecordingRef.current) {
        await sttRecordingRef.current.stopAndUnloadAsync().catch(() => undefined);
        sttRecordingRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      sttRecordingRef.current = recording;
      setIsRecordingSTT(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      Alert.alert("Lỗi", "Không thể khởi động micro.");
      setIsSTTLoading(false);
    }
  }, [isSTTLoading, isRecordingSTT]);

  const handleSelectSmartReply = useCallback((reply: string) => {
    setMessageText(reply);
    setIsSmartReplyOpen(false);
  }, []);

  const handleTranslateMessage = useCallback(async (msgId: string) => {
    if (translatingMessageId === msgId) return;

    const msg = messages.find(m => getMessageKey(m) === msgId);
    const text = msg ? getMessageBodyText(msg) : "";
    if (!text) return;

    setTranslatingMessageId(msgId);
    try {
      const response = await ChatApi.translateText(text, 'vi');
      setTranslatedMessages(prev => ({
        ...prev,
        [msgId]: response.translatedText
      }));
    } catch (error) {
      console.error("Failed to translate message:", error);
      Alert.alert("Lỗi", "Không thể dịch tin nhắn lúc này.");
    } finally {
      setTranslatingMessageId(null);
    }
  }, [translatingMessageId, messages]);
  return (
    <SafeAreaView
      className="flex-1 bg-surface-sunken"
      edges={["left", "right"]}
      onLayout={(event) => {
        chatViewportHeightRef.current = event.nativeEvent.layout.height;
      }}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ChatScreenHeader
          title={title}
          subtitle={headerSubtitle}
          isOnline={canShowPrivatePresence && isOtherOnline}
          accentStart={CHAT_BROWN_DARK}
          accentEnd={CHAT_BROWN}
          topInset={insets.top}
          onBack={() => {
            if (router.canGoBack()) {
              router.replace("/(main)/(tabs)/home");
            } else {
              router.replace("/(main)/(tabs)/home");
            }
          }}
          onPhone={isMyDocuments || isGroup ? undefined : () => void openMobileCall('voice')}
          onVideo={isMyDocuments ? undefined : () => void openMobileCall('video')}
          onSummarize={handleSummarizeChat}
          onMenu={() =>
            router.push({
              pathname: "/chat/info/[conversationId]",
              params: { conversationId },
            } as any)
          }
        />

        {conversation?.type === 'private' && !isMyDocuments && !conversation.is_self_conversation && (
          <FriendRequestBar
            relationship={relationship}
            conversation={conversation}
            currentUserId={String(userIdForChat || '')}
            onStatusChange={fetchRelationship}
          />
        )}

        {hasActiveCall && !isMyDocuments && !conversation?.is_self_conversation && (
          <View className="border-b border-[#d8b79a] bg-[#fff7ed] px-4 py-2.5">
            <Pressable
              onPress={() => void openMobileCall(activeCallConversation?.active_call_type || 'video')}
              className="flex-row items-center rounded-2xl border border-[#e2b98f] bg-white px-3 py-2.5"
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#16a34a]">
                <Feather name={activeCallConversation?.active_call_type === 'voice' ? 'phone' : 'video'} size={18} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-[#3b2718]">
                  Cuộc gọi đang diễn ra
                </Text>
                <Text className="mt-0.5 text-[12px] text-[#8b6642]">
                  Chạm để tham gia cùng cuộc trò chuyện này
                </Text>
              </View>
              <View className="rounded-full bg-[#16a34a] px-3 py-1.5">
                <Text className="text-[12px] font-bold text-white">Tham gia</Text>
              </View>
            </Pressable>
          </View>
        )}

        {isMyDocuments && (
          <View className="border-b border-[#ead8c7] bg-[#fff9f4] px-3 py-2">
            <View className="flex-row flex-wrap gap-1">
              {([
                { key: 'all', label: 'Tất cả' },
                { key: 'image', label: 'Ảnh/video' },
                { key: 'file', label: 'File' },
                { key: 'link', label: 'Link' },
                { key: 'text', label: 'Văn bản' },
              ] as const).map((item) => {
                const active = myDocumentsFilter === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setMyDocumentsFilter(item.key)}
                    className={`rounded-full px-4 py-2 ${active ? 'bg-[#b78457]' : 'bg-white'} border ${active ? 'border-[#b78457]' : 'border-[#ead8c7]'}`}
                  >
                    <Text className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-slate-600'}`}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <ChatPinnedMessagesBar
          pinnedMessages={pinnedMessages}
          showPinnedList={showPinnedList}
          onTogglePinnedList={() => setShowPinnedList((prev) => !prev)}
          overlayTopOffset={insets.top + 98}
          onHighlightMessage={(messageId: string) => highlightMessage(messageId)}
          onDeletePin={async (messageId: string) => {
            if (!conversationId || !userIdForChat) return;
            try {
              const updated = await ChatApi.pinMessage(conversationId, messageId, userIdForChat, false);
              setMessages((current) => patchMessageById(current, updated, undefined, normalizeMessages));
              setPinnedMessages((current) => patchMessageById(current, updated, { remove: true }, normalizePinnedMessages));
            } catch (error) {
              console.error('Failed to delete pin:', error);
              Alert.alert('Lỗi', 'Không thể xóa ghim');
            }
          }}
          onReorderPins={async (reorderedMessages: ChatMessage[]) => {
            if (!conversationId || !userIdForChat) return;
            try {
              const updates: ChatMessage[] = [];

              const orderedIds = reorderedMessages
                .map((item) => item.msg_id)
                .filter((id): id is string => !!id);

              // Re-pin in reverse order to refresh pinned_at without triggering pin-limit checks.
              for (const messageId of [...orderedIds].reverse()) {
                const updated = await ChatApi.pinMessage(conversationId, messageId, userIdForChat, true);
                updates.push(updated);
              }

              updates.forEach((payload) => {
                setMessages((current) => patchMessageById(current, payload, undefined, normalizeMessages));
                setPinnedMessages((current) =>
                  patchMessageById(current, payload, { remove: !payload.is_pinned }, normalizePinnedMessages),
                );
              });
            } catch (error) {
              console.error('Failed to reorder pins:', error);
              Alert.alert('Lỗi', 'Không thể cập nhật thứ tự ghim');
            }
          }}
        />

        <View className="flex-1">
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              closeAllPanels();
              Keyboard.dismiss();
            }}
          >
            <ChatMessagesList
              loading={loading}
              preparing={false}
              messages={displayMessages}
              conversation={conversation}
              listRef={listRef as any}
              onScroll={onScroll as any}
              onContentSizeChange={handleContentSizeChange}
              onScrollToIndexFailed={(info) => {
                requestAnimationFrame(() => {
                  listRef.current?.scrollToOffset({
                    offset: Math.max(info.averageItemLength * info.index, 0),
                    animated: true,
                  });
                });
              }}
              userIdForChat={userIdForChat}
              isGroup={isGroup}
              highlightedMessageId={highlightedMessageId}
              getMessageKey={getMessageKey}
              onMessageLongPress={(message) => openMessageMenu(message)}
              onReplyPress={(replyToMsgId) => highlightMessage(replyToMsgId)}
              onImagePreview={(imageUrl) => setSelectedImage(imageUrl)}
              onCallPress={handleCallMessagePress}
              onReactionPress={(message) => setReactionDetailsMessage(message)}
              onMediaReady={handleInitialMediaReady}
              accentColor={CHAT_BROWN}
              mineAccentColor={CHAT_BROWN_SOFT}
              footerComponent={
                <ChatTypingIndicator
                  typingUserNames={typingUserNames}
                  senderName={typingIndicatorSenderName}
                  senderAvatarUrl={typingIndicatorSenderAvatarUrl}
                  isGroup={isGroup}
                />
              }
              onDeleteConversation={handleDeleteConversationForMe}
              translatedMessages={translatedMessages}
              onTranslateMessage={handleTranslateMessage}
              translatingMessageId={translatingMessageId}
            />

            {showScrollToBottom && (
              <Pressable
                onPress={scrollToBottom}
                className="absolute bottom-4 h-11 w-11 items-center justify-center rounded-full border border-[#d8b79a] bg-[#b78457] shadow-lg"
                style={{ left: '50%', transform: [{ translateX: -22 }] }}
              >
                <Feather name="chevron-down" size={20} color="#ffffff" />
              </Pressable>
            )}
          </Pressable>
        </View>

        {uploadProgress && (
          <View className="mx-3 mb-2 rounded-xl border border-[#ead8c7] bg-[#fff9f4] px-3 py-2">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-[12px] font-medium text-slate-600">{uploadProgress.label}</Text>
              <Text className="text-[11px] font-semibold text-[#b78457]">{uploadProgress.percent}%</Text>
            </View>
            <View className="h-1.5 overflow-hidden rounded-full bg-[#efe3d7]">
              <View
                className="h-full rounded-full bg-[#c99267]"
                style={{ width: `${Math.max(0, Math.min(100, uploadProgress.percent))}%` }}
              />
            </View>
          </View>
        )}

        {!isChatLocked && !isDissolved ? (
          <View className="relative">
            {/* Smart Reply Trigger Button (On-demand) */}
            {!isSmartReplyOpen && (
              <Pressable
                onPress={async () => {
                  if (smartReplies.length === 0) {
                    setIsSmartReplyOpen(true); // Open first to show loading if needed
                    try {
                      const aiConvId = String(conversationId).startsWith('VIRTUAL_CONV_')
                        ? String(conversationId).replace('VIRTUAL_CONV_', '')
                        : conversationId;
                      if (aiConvId) {
                        const replies = await ChatApi.getSmartReplies(aiConvId, userIdForChat);
                        setSmartReplies(replies);
                      }
                    } catch (error) {
                      console.error("Failed to fetch smart replies:", error);
                      setIsSmartReplyOpen(false);
                    }
                  } else {
                    setIsSmartReplyOpen(true);
                  }
                }}
                className="absolute -top-12 right-4 flex-row items-center gap-2 rounded-full border border-primary-100 bg-white px-4 py-2 shadow-lg"
              >
                <Sparkles size={16} color={THEME_COLORS.primary[500]} />
                <Text className="text-[12px] font-bold text-primary-600">Gợi ý AI</Text>
              </Pressable>
            )}

            {/* Smart Reply Bar */}
            {isSmartReplyOpen && (
              <View className="bg-white/95 border-t border-primary-100/30 px-3 py-3">
                {smartReplies.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {smartReplies.map((reply, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => handleSelectSmartReply(reply)}
                        className="mr-2 flex-row items-center gap-2 rounded-2xl border border-primary-100 bg-primary-50/50 px-4 py-2 active:bg-primary-100"
                      >
                        <View className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                        <Text className="text-[13px] font-medium text-primary-800">{reply}</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setIsSmartReplyOpen(false)}
                      className="ml-2 rounded-full bg-slate-100 p-2"
                    >
                      <X size={14} color="#64748b" />
                    </Pressable>
                  </ScrollView>
                ) : (
                  <View className="flex-row items-center justify-between px-2">
                    <Text className="text-[12px] italic text-slate-500">Đang tìm gợi ý phù hợp...</Text>
                    <Pressable onPress={() => setIsSmartReplyOpen(false)}>
                      <X size={16} color="#64748b" />
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <ChatComposer
              value={messageText}
              onChangeText={handleTextChange}
              onInputFocus={handleComposerInputFocus}
              onInputPressIn={handleComposerInputPressIn}
              onSend={() => void onSendMessage()}
              onToggleImagePanel={
                Platform.OS === 'android'
                  ? openAndroidMediaOptions
                  : toggleImagePanelFromComposer
              }
              onToggleVoicePanel={toggleVoicePanelFromComposer}
              onToggleExtraPanel={toggleExtraPanelFromComposer}
              onPickFile={() => void pickFileAndSend()}
              imagePanelActive={imagePanelVisible}
              voicePanelActive={voicePanelVisible}
              extraPanelActive={extraPanelVisible}
              isGroup={isGroup}
              replyToMessage={replyToMessage}
              onCancelReply={() => setReplyToMessage(null)}
              disabled={!conversationId || !userIdForChat || isSendingAttachment}
              accentColor={CHAT_BROWN}
              selectedMediaIds={selectedMediaIds}
              onClearSelection={clearSelectedMedia}
              onSendSelected={() => void sendSelectedPanelMedia()}
              onSTT={handleTranscribeVoice}
              isSTTLoading={isSTTLoading}
              bottomInset={
                Platform.OS === 'android'
                  ? Math.max(androidKeyboardInset, insets.bottom, 8)
                  : Math.max(insets.bottom, 0)
              }
            />
          </View>
        ) : !isChatLocked && isDissolved ? (
          <View className="mx-3 mb-2 rounded-2xl border border-[#ead8c7] bg-[#fff9f4] px-4 py-3">
            <Text className="text-center text-[13px] font-medium text-slate-600">
              Nhóm này đã giải tán.
            </Text>
          </View>
        ) : isChatLocked ? (
          <View className="mx-3 mb-2 rounded-2xl border border-[#ead8c7] bg-[#fff9f4] px-4 py-3">
            <Text className="text-center text-[13px] font-medium text-slate-600">
              {(() => {
                if (relationship?.status === 'BLOCKED_BY_ME') return "Bạn đã chặn người dùng này.";
                if (relationship?.status === 'BLOCKED_BY_OTHER') return "Người dùng này đã chặn bạn.";
                return "Bạn không thể gửi tin nhắn trong cuộc trò chuyện này.";
              })()}
            </Text>
          </View>
        ) : null}

        {!isChatLocked && !isDissolved && imagePanelVisible && (
          <ChatMediaPanel
            visible={imagePanelVisible}
            height={CHAT_PANEL_HEIGHT}
            accentColor={CHAT_BROWN}
            selectedMediaIds={selectedMediaIds}
            mediaAssets={mediaAssets}
            mediaLoading={mediaLoading}
            onClose={closeImagePanel}
            onTakePhoto={() => void takePhotoAndSend()}
            onRecordVideo={() => void recordVideoAndSend()}
            onOpenLibrary={() => void pickImagesAndSend()}
            onToggleSelectMedia={toggleSelectMedia}
            onClearSelection={clearSelectedMedia}
            onSendSelected={() => void sendSelectedPanelMedia()}
          />
        )}


        {!isChatLocked && !isDissolved && voicePanelVisible && (
          <ChatVoicePanel
            height={CHAT_PANEL_HEIGHT}
            accentColor={CHAT_BROWN}
            recordingDurationMs={recordingDurationMs}
            isRecordingVoice={isRecordingVoice}
            isSendingAttachment={isSendingAttachment}
            onToggleRecord={async () => {
              if (isRecordingVoice) {
                await stopVoiceCapture();
                return;
              }
              await startVoiceRecording();
            }}
            onLongPressRecord={async () => {
              if (isRecordingVoice) return;
              isHoldRecordingRef.current = true;
              await startVoiceRecording();
            }}
            onReleaseRecord={async () => {
              if (!isHoldRecordingRef.current) return;
              isHoldRecordingRef.current = false;
              await stopVoiceCapture();
            }}
            onStopRecord={() => void stopVoiceCapture()}
            onCancelRecord={() => void cancelVoiceRecording()}
            onSendVoice={() => void sendVoiceRecording()}
            onClose={() => {
              void cancelVoiceRecording();
              if (isRecordingVoice) {
                void stopVoiceRecording();
              }
            }}
            formatVoiceDuration={formatVoiceDuration}
          />
        )}

        {!isChatLocked && !isDissolved && extraPanelVisible && (
          <ChatExtraPanel
            visible={extraPanelVisible}
            onClose={() => toggleExtraPanel()}
            onPickFile={() => void pickFileAndSend()}
            onOpenPoll={() => setPollModalVisible(true)}
            accentColor={CHAT_BROWN}
            height={CHAT_PANEL_HEIGHT}
          />
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={androidMediaOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAndroidMediaOptions}
      >
        <Pressable className="flex-1 justify-end bg-black/40" onPress={closeAndroidMediaOptions}>
          <Pressable
            className="rounded-t-[28px] bg-white px-5 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-200" />
            <Text className="text-lg font-bold text-slate-950">Gửi ảnh hoặc video</Text>

            <View className="mt-5">
              <Pressable
                disabled={isSendingAttachment}
                onPress={() => runAndroidMediaAction(() => void takePhotoAndSend())}
                className="mb-3 flex-row items-center rounded-2xl bg-[#fff7ed] px-4 py-4 active:bg-[#ffedd5]"
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#9a6a43]">
                  <Feather name="camera" size={21} color="#fff" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-bold text-slate-950">Chụp ảnh</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94a3b8" />
              </Pressable>

              <Pressable
                disabled={isSendingAttachment}
                onPress={() => runAndroidMediaAction(() => void recordVideoAndSend())}
                className="mb-3 flex-row items-center rounded-2xl bg-[#f8fafc] px-4 py-4 active:bg-slate-100"
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-800">
                  <Feather name="video" size={21} color="#fff" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-bold text-slate-950">Quay video</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94a3b8" />
              </Pressable>

              <Pressable
                disabled={isSendingAttachment}
                onPress={() => runAndroidMediaAction(() => void pickImagesAndSend())}
                className="flex-row items-center rounded-2xl bg-[#f8fafc] px-4 py-4 active:bg-slate-100"
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#e8d6c5]">
                  <Feather name="image" size={21} color="#9a6a43" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-bold text-slate-950">Thư viện</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94a3b8" />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={groupCallModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeGroupCallModal}
      >
        <View className="flex-1 justify-end bg-black/55">
          <View className="max-h-[88%] rounded-t-[28px] border border-[#ead8c7] bg-[#fffaf6] px-5 pb-6 pt-5">
            <View className="mb-4 flex-row items-start justify-between">
              <View className="min-w-0 flex-1 pr-3">
                <View className="mb-1 flex-row items-center">
                  <Feather name="users" size={14} color="#9a6a43" />
                  <Text className="ml-2 text-[11px] font-bold uppercase text-[#9a6a43]">
                    Tối đa {MAX_GROUP_CALL_INVITEES} người
                  </Text>
                </View>
                <Text className="text-xl font-bold text-[#231a10]">
                  Bắt đầu cuộc gọi nhóm
                </Text>
              </View>
              <Pressable
                onPress={closeGroupCallModal}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#efe7e0]"
              >
                <Feather name="x" size={20} color="#694d31" />
              </Pressable>
            </View>

            <View className="rounded-2xl border border-[#ead8c7] bg-white px-3 py-2">
              <View className="flex-row items-center">
                <Feather name="search" size={17} color="#a78b75" />
                <TextInput
                  value={groupCallSearch}
                  onChangeText={(value) => {
                    setGroupCallSearch(value);
                    setGroupCallLimitHint(false);
                  }}
                  placeholder="Tìm kiếm thành viên..."
                  placeholderTextColor="#a78b75"
                  className="ml-2 flex-1 py-2 text-[14px] font-medium text-[#231a10]"
                />
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-[#694d31]">
                Đã chọn{' '}
                <Text className="font-bold text-[#9a6a43]">
                  {selectedGroupCallIds.length}/{MAX_GROUP_CALL_INVITEES}
                </Text>
              </Text>
              <Pressable
                onPress={() => {
                  if (selectedGroupCallIds.length > 0) {
                    setSelectedGroupCallIds([]);
                    setGroupCallLimitHint(false);
                    return;
                  }
                  selectMaxGroupCallMembers();
                }}
              >
                <Text className="text-sm font-bold text-[#9a6a43]">
                  {selectedGroupCallIds.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tối đa'}
                </Text>
              </Pressable>
            </View>

            {selectedGroupCallMembers.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="pt-3 overflow-visible "
              >
                {selectedGroupCallMembers.map((member) => (
                  <Pressable
                    key={member.id}
                    onPress={() => toggleGroupCallMember(member.id)}
                    className="mr-3 items-center"
                  >
                    <View>
                      <GroupCallMemberAvatar
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                        size={38}
                      />
                      <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-[#9a6a43]">
                        <Feather name="x" size={11} color="#fff" />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {groupCallLimitHint && (
              <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <Text className="text-xs font-medium text-amber-800">
                  Chỉ có thể chọn tối đa {MAX_GROUP_CALL_INVITEES} thành viên cho một cuộc gọi.
                </Text>
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              className="mt-4"
              style={{ maxHeight: 360 }}
            >
              {groupCallLoading ? (
                <View className="items-center rounded-2xl border border-[#ead8c7] bg-white px-4 py-8">
                  <Text className="text-sm font-semibold text-[#694d31]">
                    Đang tải thành viên...
                  </Text>
                </View>
              ) : filteredGroupCallMembers.length === 0 ? (
                <View className="items-center rounded-2xl border border-[#ead8c7] bg-white px-4 py-8">
                  <Feather name="users" size={28} color="#b78457" />
                  <Text className="mt-3 text-center text-sm font-semibold text-[#694d31]">
                    Không tìm thấy thành viên nào để gọi.
                  </Text>
                </View>
              ) : (
                filteredGroupCallMembers.map((member) => {
                  const selected = selectedGroupCallIds.includes(member.id);
                  const disabledByLimit = !selected && selectedGroupCallIds.length >= MAX_GROUP_CALL_INVITEES;

                  return (
                    <Pressable
                      key={member.id}
                      onPress={() => toggleGroupCallMember(member.id)}
                      className={`mb-2 flex-row items-center rounded-2xl border px-3 py-3 ${
                        selected
                          ? 'border-[#b78457] bg-[#f5e8dc]'
                          : disabledByLimit
                            ? 'border-[#ead8c7] bg-white opacity-60'
                            : 'border-[#ead8c7] bg-white'
                      }`}
                    >
                      <GroupCallMemberAvatar
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                      />
                      <Text className="ml-3 flex-1 text-[14px] font-bold text-[#231a10]" numberOfLines={1}>
                        {member.name}
                      </Text>
                      <View
                        className={`h-7 w-7 items-center justify-center rounded-full ${
                          selected ? 'bg-[#b78457]' : 'border border-[#d8b79a] bg-white'
                        }`}
                      >
                        {selected && <Feather name="check" size={15} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <Pressable
              disabled={selectedGroupCallIds.length === 0 || groupCallLoading}
              onPress={handleStartSelectedGroupCall}
              className={`mt-4 h-12 flex-row items-center justify-center rounded-2xl ${
                selectedGroupCallIds.length === 0 || groupCallLoading
                  ? 'bg-[#d8c8b8]'
                  : 'bg-[#8b6642]'
              }`}
            >
              <Feather name="video" size={18} color="#fff" />
              <Text className="ml-2 text-sm font-bold text-white">
                Bắt đầu cuộc gọi
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ChatImagePreviewModal
        selectedImage={selectedImage}
        messages={messages}
        onClose={() => setSelectedImage(null)}
      />

      <AISummaryModal
        visible={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        summary={summaryResult}
        loading={isSummarizing}
      />

      <STTRecordingModal
        visible={isRecordingSTT}
        onStop={handleStopSTT}
        onCancel={handleCancelSTT}
        isTranscribing={isSTTLoading}
      />

      <ChatMessageActionsModal
        visible={!!activeMessageMenu}
        message={activeMessageMenu}
        isMine={String(activeMessageMenu?.sender_id || '') === String(userIdForChat || '')}
        isPinned={!!activeMessageMenu?.is_pinned}
        currentUserId={String(userIdForChat || '')}
        onClose={closeMessageMenu}
        onReply={() => {
          if (activeMessageMenu) {
            setReplyToMessage(activeMessageMenu);
          }
          closeMessageMenu();
        }}
        onForward={() => {
          const selectedMessage = activeMessageMenu;
          closeMessageMenu();

          if (!selectedMessage) return;

          // Open forward modal on next frame to avoid modal stacking freeze on iOS.
          requestAnimationFrame(() => {
            void openForwardModal(selectedMessage);
          });
        }}
        onSaveToDocuments={async () => {
          if (activeMessageMenu) {
            try {
              await saveMessageToDocuments(activeMessageMenu);
            } catch (error) {
              console.error('Failed to save message to documents:', error);
              Alert.alert('Lỗi', 'Không thể lưu vào My Documents');
            }
          }
          closeMessageMenu();
        }}
        onPinToggle={async () => {
          if (!activeMessageMenu?.msg_id || !conversationId || !userIdForChat) return;

          const tryingToPin = !activeMessageMenu.is_pinned;
          if (tryingToPin && pinnedMessages.length >= MAX_PINNED_MESSAGES) {
            setPendingPinMessage(activeMessageMenu);
            setReplacePinModalVisible(true);
            closeMessageMenu();
            return;
          }

          try {
            const updated = await ChatApi.pinMessage(
              conversationId,
              activeMessageMenu.msg_id,
              userIdForChat,
              !activeMessageMenu.is_pinned,
            );
            setMessages((current) => patchMessageById(current, updated, undefined, normalizeMessages));
            setPinnedMessages((current) =>
              patchMessageById(current, updated, { remove: !updated.is_pinned }, normalizePinnedMessages),
            );
            setActiveMessageMenu((current) =>
              current && getMessageKey(current) === getMessageKey(updated)
                ? { ...current, ...updated }
                : current,
            );
          } catch (error) {
            const errorMessage = String(
              (error as any)?.details?.error ||
              (error as any)?.details?.message ||
              (error as any)?.message ||
              '',
            );
            const isPinLimit =
              !activeMessageMenu.is_pinned &&
              /toi da 3|tối đa 3|gioi han 3|giới hạn 3/i.test(String(errorMessage));

            if (isPinLimit) {
              setPendingPinMessage(activeMessageMenu);
              setReplacePinModalVisible(true);
            } else {
              console.error('Failed to toggle pin:', error);
              Alert.alert('Lỗi', errorMessage || 'Không thể ghim/bỏ ghim tin nhắn');
            }
          } finally {
            closeMessageMenu();
          }
        }}
        onSaveFile={async () => {
          if (activeMessageMenu) {
            try {
              await saveMessageFile(activeMessageMenu);
            } catch (error) {
              console.error('Failed to save message file:', error);
              Alert.alert('Lỗi', 'Không thể lưu file');
            }
          }
          closeMessageMenu();
        }}
        onRevoke={async () => {
          if (!activeMessageMenu?.msg_id || !conversationId || !userIdForChat) return;
          try {
            const updated = await ChatApi.revokeMessage(conversationId, activeMessageMenu.msg_id, userIdForChat);
            setMessages((current) => patchMessageById(current, updated, undefined, normalizeMessages));
            setPinnedMessages((current) => patchMessageById(current, updated, { remove: true }, normalizePinnedMessages));
          } catch (error) {
            console.error('Failed to revoke message:', error);
            Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
          } finally {
            closeMessageMenu();
          }
        }}
        onDelete={async () => {
          if (!activeMessageMenu?.msg_id || !conversationId || !userIdForChat) return;
          try {
            const deleted = await ChatApi.deleteMessage(conversationId, activeMessageMenu.msg_id, userIdForChat);
            setMessages((current) => patchMessageById(current, deleted, { remove: true }, normalizeMessages));
            setPinnedMessages((current) => patchMessageById(current, deleted, { remove: true }, normalizePinnedMessages));
          } catch (error) {
            console.error('Failed to delete message:', error);
            Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
          } finally {
            closeMessageMenu();
          }
        }}
        onReact={async (emoji) => {
          if (!activeMessageMenu?.msg_id || !conversationId || !userIdForChat) return;
          try {
            const updated = await ChatApi.reactToMessage(conversationId, activeMessageMenu.msg_id, userIdForChat, emoji);
            setMessages((current) => patchMessageById(current, updated, undefined, normalizeMessages));
            setPinnedMessages((current) => patchMessageById(current, updated, undefined, normalizePinnedMessages));
            setActiveMessageMenu((current) =>
              current && getMessageKey(current) === getMessageKey(updated)
                ? { ...current, ...updated }
                : current,
            );
          } catch (error) {
            console.error('Failed to react to message:', error);
            Alert.alert('Lỗi', 'Không thể thả cảm xúc');
          }
        }}
      />

      <ReplacePinnedModal
        visible={replacePinModalVisible}
        pendingMessage={pendingPinMessage}
        pinnedMessages={pinnedMessages}
        conversation={conversation}
        onClose={() => {
          setReplacePinModalVisible(false);
          setPendingPinMessage(null);
        }}
        onConfirm={handleConfirmReplacePinned}
      />


      <MessageReactionsModal
        visible={!!reactionDetailsMessage}
        message={reactionDetailsMessage}
        conversation={conversation}
        onClose={() => setReactionDetailsMessage(null)}
      />

      <ForwardMessageModal
        visible={forwardModalVisible}
        message={forwardingMessage}
        conversations={forwardConversations}
        currentConversationId={conversationId}
        currentUserId={userIdForChat}
        isLoadingConversations={forwardLoading}
        isSubmitting={isForwarding}
        onClose={closeForwardModal}
        onConfirm={handleConfirmForward}
      />

      <CreatePollModal
        visible={pollModalVisible}
        onClose={() => setPollModalVisible(false)}
        onSubmit={handleCreatePoll}
      />
    </SafeAreaView>
  );
}
