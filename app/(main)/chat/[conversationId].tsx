import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Share,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/Authcontext";
import { THEME_COLORS } from "@/constants/theme";
import { ChatApi } from "@/services/api";
import type { ChatMessage, ChatMessageContent } from "@/types/entities/chat";
import {
  ChatImagePreviewModal,
  ChatComposer,
  ChatEmojiPanel,
  ChatMediaPanel,
  ChatMessagesList,
  ChatPinnedMessagesBar,
  ChatScreenHeader,
  ChatVoicePanel,
} from "@/components/chat";
import { ChatMessageActionsModal } from "@/components/chat/modals/ChatMessageActionsModal";
import {
  getConversationAvatar,
  getConversationTitle,
  getMessageBodyText,
  resolveMediaUrl,
} from "@/utils/chat";
import {
  useChatPanels,
  useConversationMessages,
  useMessageSocket,
  useMessageScroll,
  useMessageHighlight,
} from "@/hooks/chat";

const getMessageKey = (message: ChatMessage) => message.msg_id || message._id;
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const CHAT_BROWN_DARK = '#b78457';
const CHAT_BROWN = '#d2a177';
const CHAT_BROWN_SOFT = '#f5e8dc';
const CHAT_PANEL_HEIGHT = 260;

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

const patchMessageById = (
  source: ChatMessage[],
  incoming: ChatMessage,
  options?: { remove?: boolean },
  normalizeMessages?: (messages: ChatMessage[]) => ChatMessage[],
) => {
  const key = getMessageKey(incoming);
  if (!key) return source;

  const next = [...source];
  const idx = next.findIndex((item) => getMessageKey(item) === key);

  if (options?.remove) {
    if (idx >= 0) next.splice(idx, 1);
    return next;
  }

  if (idx >= 0) {
    next[idx] = incoming;
  } else {
    next.push(incoming);
  }

  return normalizeMessages ? normalizeMessages(next) : next;
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
    PAGE_SIZE,
  } = useConversationMessages(conversationId, userIdForChat);
  const {
    listRef,
    loadingOlder,
    initialScrollReady,
    onScroll,
    handleContentSizeChange,
    setPendingScrollToBottom,
  } = useMessageScroll({
    conversationId,
    userIdForChat,
    messages,
    setMessages,
    normalizeMessages,
    PAGE_SIZE,
  });
  const {
    highlightedMessageId,
    highlightMessage,
    cleanup: cleanupHighlight,
  } = useMessageHighlight({
    messages,
    getMessageKey,
    listRef,
  });

  // Local component state
  const [messageText, setMessageText] = useState("");
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
  const [activeMessageMenuPosition, setActiveMessageMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const isHoldRecordingRef = useRef(false);
  const initialScrollConversationRef = useRef<string | null>(null);
  const {
    voicePanelVisible,
    imagePanelVisible,
    emojiPanelVisible,
    selectedMediaIds,
    hasSelectedMedia,
    setVoicePanelVisible,
    setEmojiPanelVisible,
    clearSelectedMedia,
    toggleVoicePanel,
    toggleImagePanel,
    toggleEmojiPanel,
    closeImagePanel,
    toggleSelectMedia,
  } = useChatPanels();

  // Conversation metadata
  const title = getConversationTitle(conversation, userIdForChat);
  const avatar = getConversationAvatar(conversation, userIdForChat);
  const isGroup = conversation?.type === "group";

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

  const openMessageMenu = useCallback((message: ChatMessage, event?: any) => {
    dismissKeyboard();
    setActiveMessageMenu(message);
    setActiveMessageMenuPosition({
      x: Number(event?.nativeEvent?.pageX || event?.nativeEvent?.locationX || 24),
      y: Number(event?.nativeEvent?.pageY || event?.nativeEvent?.locationY || 120),
    });
  }, [dismissKeyboard]);

  const closeMessageMenu = useCallback(() => {
    setActiveMessageMenu(null);
    setActiveMessageMenuPosition(null);
  }, []);

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
  }, [conversationId]);

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
      const fileSize = Number(params.fileSize || 0);
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

      const validAssets = assets.filter((asset) => Number(asset.fileSize || 0) <= MAX_UPLOAD_SIZE || !asset.fileSize);
      if (validAssets.length !== assets.length) {
        Alert.alert("Lưu ý", "Một số ảnh lớn hơn 50MB nên đã được bỏ qua.");
      }
      if (validAssets.length === 0) return;

      const keys: string[] = [];
      for (let index = 0; index < validAssets.length; index += 1) {
        const asset = validAssets[index];
        const fileName = asset.fileName || `image_${Date.now()}_${index}.jpg`;
        const mimeType = getMimeType(fileName, asset.mimeType || "image/jpeg");
        const { uploadUrl, key } = await ChatApi.getMessagePresignedUrl(fileName, mimeType);
        if (!uploadUrl || !key) {
          throw new Error("Không lấy được thông tin upload ảnh.");
        }

        await ChatApi.uploadFileToS3(uploadUrl, asset.uri, mimeType, (percent) => {
          const overall = Math.round(((index + percent / 100) / validAssets.length) * 100);
          setUploadProgress({
            label: `Đang tải ảnh ${index + 1}/${validAssets.length}`,
            percent: overall,
          });
        });
        keys.push(key);
      }

      await ChatApi.sendMessage({
        conversationId,
        senderId: userIdForChat,
        content: keys,
        type: "image",
        replyToMsgId: replyToMessage?.msg_id,
      });
      setReplyToMessage(null);
      setPendingScrollToBottom();
      setUploadProgress(null);
    },
    [conversationId, replyToMessage?.msg_id, setPendingScrollToBottom, userIdForChat],
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

    const validAssets = result.assets.filter((asset) => Number(asset.size || 0) <= MAX_UPLOAD_SIZE || !asset.size);
    if (validAssets.length !== result.assets.length) {
      const skipped = result.assets.length - validAssets.length;
      Alert.alert("Lưu ý", `${skipped} tệp vượt quá 50MB đã được bỏ qua.`);
    }
    if (validAssets.length === 0) return;

    setIsSendingAttachment(true);
    try {
      for (let index = 0; index < validAssets.length; index += 1) {
        const asset = validAssets[index];
        await uploadAndSendSingleFile({
          uri: asset.uri,
          fileName: asset.name || `file_${Date.now()}_${index}`,
          mimeType: asset.mimeType,
          fileSize: Number(asset.size || 0),
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
  const appendEmoji = useCallback((emoji: string) => {
    setMessageText((current) => `${current}${emoji}`);
  }, []);

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
          normalizeMessages,
        );
      });
    },
    [conversationId, normalizeMessages],
  );

  const handleMessageRevoked = useCallback(
    (payload: ChatMessage) => {
      if (String(payload?.conversation_id || "") !== String(conversationId))
        return;
      setMessages((current) =>
        patchMessageById(current, payload, undefined, normalizeMessages),
      );
    },
    [conversationId, normalizeMessages],
  );

  const handleMessageDeleted = useCallback(
    (payload: ChatMessage) => {
      if (String(payload?.conversation_id || "") !== String(conversationId))
        return;
      setMessages((current) =>
        patchMessageById(current, payload, { remove: true }, normalizeMessages),
      );
      setPinnedMessages((current) =>
        patchMessageById(current, payload, { remove: true }, normalizeMessages),
      );
    },
    [conversationId, normalizeMessages],
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
  });

  // Send message
  const onSendMessage = useCallback(async () => {
    if (!conversationId || !userIdForChat) return;

    const trimmed = messageText.trim();
    if (!trimmed) return;

    const isLink = /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);

    try {
      await ChatApi.sendMessage({
        conversationId,
        senderId: userIdForChat,
        content: trimmed,
        type: isLink ? "link" : "text",
        replyToMsgId: replyToMessage?.msg_id,
      });

      setMessageText("");
      setReplyToMessage(null);
      setEmojiPanelVisible(false);
      setPendingScrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn.");
    }
  }, [
    conversationId,
    userIdForChat,
    messageText,
    replyToMessage?.msg_id,
    setPendingScrollToBottom,
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
          subtitle="Hoat động gần đây"
          accentStart={CHAT_BROWN_DARK}
          accentEnd={CHAT_BROWN}
          topInset={insets.top}
          onBack={handleBack}
          onPhone={() => undefined}
          onVideo={() => undefined}
          onMenu={() =>
            router.push({
              pathname: "/chat/info/[conversationId]",
              params: { conversationId },
            } as any)
          }
        />

        <ChatPinnedMessagesBar
          pinnedMessages={pinnedMessages}
          showPinnedList={showPinnedList}
          onTogglePinnedList={() => setShowPinnedList((prev) => !prev)}
          onHighlightMessage={(messageId: string) => highlightMessage(messageId)}
        />

        <View className="flex-1">
          <ChatMessagesList
            loading={loading}
            preparing={!loading && messages.length > 0 && !initialScrollReady}
            messages={messages}
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
            accentColor={CHAT_BROWN}
            mineAccentColor={CHAT_BROWN_SOFT}
          />
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

        <ChatComposer
          value={messageText}
          onChangeText={setMessageText}
          onSend={() => void onSendMessage()}
          onToggleEmoji={toggleEmojiPanel}
          onToggleImagePanel={toggleImagePanel}
          onToggleVoicePanel={toggleVoicePanel}
          onPickFile={() => void pickFileAndSend()}
          emojiActive={emojiPanelVisible}
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

        {imagePanelVisible && (
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

        {emojiPanelVisible && (
          <ChatEmojiPanel height={CHAT_PANEL_HEIGHT} onAppendEmoji={appendEmoji} />
        )}

        {voicePanelVisible && (
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
        onClose={() => setSelectedImage(null)}
      />

      <ChatMessageActionsModal
        visible={!!activeMessageMenu}
        message={activeMessageMenu}
        isMine={String(activeMessageMenu?.sender_id || '') === String(userIdForChat || '')}
        isPinned={!!activeMessageMenu?.is_pinned}
        x={activeMessageMenuPosition?.x}
        y={activeMessageMenuPosition?.y}
        onClose={closeMessageMenu}
        onReply={() => {
          if (activeMessageMenu) {
            setReplyToMessage(activeMessageMenu);
          }
          closeMessageMenu();
        }}
        onForward={async () => {
          if (activeMessageMenu) {
            try {
              await shareMessage(activeMessageMenu);
            } catch (error) {
              console.error('Failed to forward message:', error);
              Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn');
            }
          }
          closeMessageMenu();
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
          try {
            await ChatApi.pinMessage(conversationId, activeMessageMenu.msg_id, userIdForChat, !activeMessageMenu.is_pinned);
            await loadConversation();
          } catch (error) {
            console.error('Failed to toggle pin:', error);
            Alert.alert('Lỗi', 'Không thể ghim/bỏ ghim tin nhắn');
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
            await ChatApi.revokeMessage(conversationId, activeMessageMenu.msg_id, userIdForChat);
            await loadConversation();
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
            await ChatApi.deleteMessage(conversationId, activeMessageMenu.msg_id, userIdForChat);
            await loadConversation();
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
            await ChatApi.reactToMessage(conversationId, activeMessageMenu.msg_id, userIdForChat, emoji);
            await loadConversation();
          } catch (error) {
            console.error('Failed to react to message:', error);
            Alert.alert('Lỗi', 'Không thể thả cảm xúc');
          }
        }}
      />
    </SafeAreaView>
  );
}
