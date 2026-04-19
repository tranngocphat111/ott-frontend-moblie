import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
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
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from "@/context/Authcontext";
import { THEME_COLORS } from "@/constants/theme";
import { ChatApi, chatSocket } from "@/services/api";
import type {
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
import { ChatMessageActionsModal } from "@/components/chat/modals/ChatMessageActionsModal";
import { ForwardMessageModal } from "@/components/chat/modals/ForwardMessageModal";
import { ReplacePinnedModal } from "@/components/chat/modals/ReplacePinnedModal";
import {
  getConversationAvatar,
  getConversationTitle,
  getMessageBodyText,
  getMessageSenderAvatar,
  resolveMediaUrl,
} from "@/utils/chat";
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
const WEB_CALL_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173';

type ChatPanelMediaAsset = {
  id: string;
  mediaType: MediaLibrary.MediaTypeValue;
  filename?: string;
  uri: string;
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
  assets: Array<{ uri: string; fileName?: string | null; fileSize?: number | null }>;
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
  const showImage = !!avatarUrl && !hasError;

  return (
    <View className="mr-2 mt-1 h-8 w-8 overflow-hidden rounded-full bg-[#f0e2d5]">
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, chatUserId } = useAuth();

  const userIdForChat = chatUserId || user?.id;
  // Message management hooks
  const {
    conversation,
    messages,
    pinnedMessages,
    loading,
    setMessages,
    setPinnedMessages,
    loadConversation,
    normalizeMessages,
    normalizePinnedMessages,
    PAGE_SIZE,
  } = useConversationMessages(conversationId, userIdForChat);
  const isMyDocuments = Boolean(
    conversation?.is_self_conversation ||
    String(conversation?.name || '').trim().toLowerCase() === 'my documents',
  );
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
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [isSendingAttachment, setIsSendingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    label: string;
    percent: number;
  } | null>(null);
  const [mediaAssets, setMediaAssets] = useState<ChatPanelMediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
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
  const isHoldRecordingRef = useRef(false);
  const initialScrollConversationRef = useRef<string | null>(null);
  const initialMediaReadyRef = useRef<Set<string>>(new Set());
  const initialMediaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialMediaReady, setInitialMediaReady] = useState(false);
  const {
    voicePanelVisible,
    imagePanelVisible,
    selectedMediaIds,
    hasSelectedMedia,
    setVoicePanelVisible,
    clearSelectedMedia,
    closeAllPanels,
    toggleVoicePanel,
    toggleImagePanel,
    closeImagePanel,
    toggleSelectMedia,
  } = useChatPanels();

  // Conversation metadata
  const title = getConversationTitle(conversation, userIdForChat);
  const avatar = getConversationAvatar(conversation, userIdForChat);
  const isGroup = conversation?.type === "group";

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

  const typingIndicatorSenderAvatarUrl = typingIndicatorSenderAvatarRaw
    ? resolveMediaUrl(typingIndicatorSenderAvatarRaw)
    : undefined;
  const hasTypingUsers = typingUserIdList.length > 0;
  const hadTypingUsersRef = useRef(false);

  const headerSubtitle = "Hoạt động gần đây";

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

  const openWebCall = useCallback(async (type: 'voice' | 'video') => {
    if (!conversationId) return;

    const callName = encodeURIComponent(title || 'Cuoc goi');
    const base = String(WEB_CALL_BASE_URL || '').replace(/\/$/, '');
    const callUrl = `${base}/call?conversationId=${encodeURIComponent(String(conversationId))}&type=${type}&action=start&name=${callName}`;

    try {
      const canOpen = await Linking.canOpenURL(callUrl);
      if (!canOpen) {
        Alert.alert('Lỗi', 'Không thể mở trang gọi của web.');
        return;
      }

      await WebBrowser.openBrowserAsync(callUrl, {
        showTitle: true,
        enableDefaultShareMenuItem: false,
      });
    } catch (error) {
      console.error('Failed to open web call:', error);
      Alert.alert('Lỗi', 'Không thể mở cuộc gọi web. Vui lòng kiểm tra EXPO_PUBLIC_WEB_URL.');
    }
  }, [conversationId, title]);

  const handleCallMessagePress = useCallback((message: ChatMessage) => {
    const firstContent = Array.isArray(message.content) ? message.content[0] : message.content;
    const raw = typeof firstContent === 'string'
      ? firstContent
      : firstContent && typeof firstContent === 'object'
        ? firstContent.text || firstContent.url || firstContent.name || ''
        : '';

    const isVideoCall = /video/i.test(String(raw || ''));
    void openWebCall(isVideoCall ? 'video' : 'voice');
  }, [openWebCall]);

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

  useEffect(() => {
    const keyboardShowSubscription = Keyboard.addListener('keyboardDidShow', () => {
      closeAllPanels({ clearMediaSelection: true });
    });

    return () => {
      keyboardShowSubscription.remove();
    };
  }, [closeAllPanels]);

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
        const permission = await MediaLibrary.requestPermissionsAsync();
        if (permission.granted) {
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
      .slice(-16)
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

    if (!initialScrollReady || !initialMediaReady) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  }, [conversationId, initialMediaReady, initialScrollReady, loading, messages.length, scrollToBottom]);

  useEffect(() => {
    if (!conversationId || loading || messages.length === 0) {
      return;
    }

    if (initialScrollConversationRef.current === conversationId) {
      return;
    }

    initialScrollConversationRef.current = conversationId;
    setPendingScrollToBottom();
  }, [conversationId, loading, messages.length, setPendingScrollToBottom]);

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
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
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
            return {
              id: asset.id,
              mediaType: asset.mediaType,
              filename: asset.filename,
              uri: detail.localUri || asset.uri,
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
      console.error("Failed to load media library:", error);
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
      await ChatApi.uploadFileToS3(uploadUrl, params.uri, mimeType, (percent) => {
        setUploadProgress((current) => ({
          label: current?.label || params.progressLabel || 'Đang tải tệp...',
          percent,
        }));
      });
      await ChatApi.sendMessage({
        conversationId,
        senderId: userIdForChat,
        content: key,
        type: params.explicitType || fileCategory || "file",
        size: fileSize,
        fileName: params.fileName,
        replyToMsgId: replyToMessage?.msg_id,
      });
      setReplyToMessage(null);
      setPendingScrollToBottom();
      setUploadProgress(null);
    },
    [conversationId, replyToMessage?.msg_id, setPendingScrollToBottom, userIdForChat],
  );

  const uploadAndSendImages = useCallback(
    async (
      assets: Array<{
        uri: string;
        fileName?: string | null;
        mimeType?: string | null;
        fileSize?: number | null;
      }>,
    ) => {
      if (!conversationId || !userIdForChat || assets.length === 0) return;

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
        conversationId,
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

          await ChatApi.uploadFileToS3(uploadUrl, uploadUri, mimeType, (percent) => {
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
          });
          keys.push(key);
        }

        const createdMessage = await ChatApi.sendMessage({
          conversationId,
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
    [conversationId, normalizeMessages, replyToMessage?.msg_id, setPendingScrollToBottom, userIdForChat],
  );

  const pickImagesAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    dismissKeyboard();

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền thư viện ảnh để gửi ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled || result.assets.length === 0) return;

    setIsSendingAttachment(true);
    try {
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
  }, [closeImagePanel, conversationId, dismissKeyboard, isSendingAttachment, uploadAndSendImages, userIdForChat]);

  const takePhotoAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    dismissKeyboard();

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền camera để chụp ảnh.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || result.assets.length === 0) return;

    setIsSendingAttachment(true);
    try {
      await uploadAndSendImages(result.assets);
      closeImagePanel();
    } catch (error) {
      console.error("Failed to send camera image:", error);
      Alert.alert("Lỗi", "Không thể gửi ảnh từ camera.");
    } finally {
      setUploadProgress(null);
      setIsSendingAttachment(false);
    }
  }, [closeImagePanel, conversationId, dismissKeyboard, isSendingAttachment, uploadAndSendImages, userIdForChat]);

  const pickFileAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    dismissKeyboard();

    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) return;

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
    if (validAssets.length === 0) return;

    setIsSendingAttachment(true);
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

    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
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
    for (const message of messages) {
      const action = String(message?.system_meta?.action || "").toLowerCase();
      if (!action) continue;

      if (
        action === "removed_from_group" &&
        String(message?.system_meta?.removed_user_id || "") === currentUserId
      ) {
        locked = true;
        continue;
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

    setIsChatLocked(locked);
  }, [messages, userIdForChat]);

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
      return cleanupHighlight;
    }, [loadConversation, cleanupHighlight, loadRecentMedia]),
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
      setPendingScrollToBottom();
    },
    [conversationId, normalizeMessages],
  );

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
    (payload: { conversationId?: string }) => {
      if (String(payload?.conversationId || "") !== String(conversationId)) {
        return;
      }

      setIsChatLocked(true);
      setMessageText("");
      setReplyToMessage(null);
      closeAllPanels();
      chatSocket.leaveConversation(String(conversationId));
      void loadConversation();
    },
    [closeAllPanels, conversationId, loadConversation],
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
          void loadConversation();
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

  // Setup socket listeners
  useMessageSocket({
    conversationId,
    userIdForChat,
    onIncomingMessage: handleIncomingMessage,
    onReactionChanged: handleReactionChanged,
    onMessagePinned: handleMessagePinned,
    onMessageRevoked: handleMessageRevoked,
    onMessageDeleted: handleMessageDeleted,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop,
    onRemovedFromGroup: handleRemovedFromGroup,
    onGroupDissolved: handleGroupDissolved,
    onConversationSynced: handleConversationSynced,
  });

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

  // Send message
  const onSendMessage = useCallback(async () => {
    if (!conversationId || !userIdForChat || isChatLocked) return;

    const trimmed = messageText.trim();
    if (!trimmed) return;

    const isLink = isStandaloneLink(trimmed);
    const normalizedContent = isLink ? normalizeLink(trimmed) || trimmed : trimmed;

    stopTyping();

    try {
      await ChatApi.sendMessage({
        conversationId,
        senderId: userIdForChat,
        content: normalizedContent,
        type: isLink ? "link" : "text",
        replyToMsgId: replyToMessage?.msg_id,
      });

      setMessageText("");
      setReplyToMessage(null);
      setPendingScrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn.");
    }
  }, [
    conversationId,
    isChatLocked,
    userIdForChat,
    messageText,
    replyToMessage?.msg_id,
    setPendingScrollToBottom,
    stopTyping,
  ]);
  return (
    <SafeAreaView
      className="flex-1 bg-surface-sunken mb-6"
      edges={["left", "right"]}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ChatScreenHeader
          title={title}
          subtitle={headerSubtitle}
          accentStart={CHAT_BROWN_DARK}
          accentEnd={CHAT_BROWN}
          topInset={insets.top}
          onBack={handleBack}
          onPhone={isMyDocuments ? undefined : () => void openWebCall('voice')}
          onVideo={isMyDocuments ? undefined : () => void openWebCall('video')}
          onMenu={() =>
            router.push({
              pathname: "/chat/info/[conversationId]",
              params: { conversationId },
            } as any)
          }
        />

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

        <View className="flex-1 po">
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
          />

          {showScrollToBottom && (
            <Pressable
              onPress={scrollToBottom}
              className="absolute bottom-4 right-4 h-11 w-11 items-center justify-center rounded-full border border-[#d8b79a] bg-[#b78457] shadow-lg"
            >
              <Feather name="chevron-down" size={20} color="#ffffff" />
            </Pressable>
          )}
 
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

        {!isChatLocked ? (
          <ChatComposer
            value={messageText}
            onChangeText={handleTextChange}
            onInputFocus={handleComposerInputFocus}
            onInputPressIn={handleComposerInputPressIn}
            onSend={() => void onSendMessage()}
            onToggleImagePanel={toggleImagePanel}
            onToggleVoicePanel={toggleVoicePanel}
            onPickFile={() => void pickFileAndSend()}
            imagePanelActive={imagePanelVisible}
            voicePanelActive={voicePanelVisible}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            disabled={!conversationId || !userIdForChat || isSendingAttachment}
            accentColor={CHAT_BROWN}
            selectedMediaIds={selectedMediaIds}
            onClearSelection={clearSelectedMedia}
            onSendSelected={() => void sendSelectedPanelMedia()}
          />
        ) : (
          <View className="mx-3 mb-2 rounded-2xl border border-[#ead8c7] bg-[#fff9f4] px-4 py-3">
            <Text className="text-center text-[13px] font-medium text-slate-600">
              Bạn không thể gửi tin nhắn trong cuộc trò chuyện này.
            </Text>
          </View>
        )}

        {!isChatLocked && imagePanelVisible && (
          <ChatMediaPanel
            visible={imagePanelVisible}
            height={CHAT_PANEL_HEIGHT}
            accentColor={CHAT_BROWN}
            selectedMediaIds={selectedMediaIds}
            mediaAssets={mediaAssets}
            mediaLoading={mediaLoading}
            onClose={closeImagePanel}
            onTakePhoto={() => void takePhotoAndSend()}
            onToggleSelectMedia={toggleSelectMedia}
            onClearSelection={clearSelectedMedia}
            onSendSelected={() => void sendSelectedPanelMedia()}
          />
        )}


        {!isChatLocked && voicePanelVisible && (
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
      </KeyboardAvoidingView>

      <ChatImagePreviewModal
        selectedImage={selectedImage}
        messages={messages}
        onClose={() => setSelectedImage(null)}
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
    </SafeAreaView>
  );
}
