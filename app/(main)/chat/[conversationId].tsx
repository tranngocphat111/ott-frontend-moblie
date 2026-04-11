import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
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
  ChatComposer,
  ChatEmojiPanel,
  ChatMediaPanel,
  ChatMessageBubble,
  ChatPinnedMessagesBar,
  ChatScreenHeader,
  ChatVoicePanel,
} from "@/components/chat";
import {
  formatConversationTime,
  getConversationAvatar,
  getConversationTitle,
  getMessageBodyText,
  shouldShowTimestamp,
} from "@/utils/chat";
import {
  useConversationMessages,
  useMessageSocket,
  useMessageActions,
  useMessageScroll,
  useMessageHighlight,
} from "@/hooks/chat";

const getMessageKey = (message: ChatMessage) => message.msg_id || message._id;
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const CHAT_BROWN_DARK = '#6f4326';
const CHAT_BROWN = '#8b5e34';

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
  const { handleMessageAction } = useMessageActions({
    conversationId,
    userIdForChat,
    onLoadConversation: loadConversation,
  });

  // Local component state
  const [messageText, setMessageText] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(
    null,
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [isSendingAttachment, setIsSendingAttachment] = useState(false);
  const [voicePanelVisible, setVoicePanelVisible] = useState(false);
  const [imagePanelVisible, setImagePanelVisible] = useState(false);
  const [emojiPanelVisible, setEmojiPanelVisible] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<ChatPanelMediaAsset[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const isHoldRecordingRef = useRef(false);

  // Conversation metadata
  const title = getConversationTitle(conversation, userIdForChat);
  const avatar = getConversationAvatar(conversation, userIdForChat);
  const isGroup = conversation?.type === "group";
  const hasSelectedMedia = selectedMediaIds.length > 0;

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

      await ChatApi.uploadFileToS3(uploadUrl, params.uri, mimeType);
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

      const keys = await Promise.all(
        validAssets.map(async (asset, index) => {
          const fileName = asset.fileName || `image_${Date.now()}_${index}.jpg`;
          const mimeType = getMimeType(fileName, asset.mimeType || "image/jpeg");
          const { uploadUrl, key } = await ChatApi.getMessagePresignedUrl(fileName, mimeType);
          if (!uploadUrl || !key) {
            throw new Error("Không lấy được thông tin upload ảnh.");
          }
          await ChatApi.uploadFileToS3(uploadUrl, asset.uri, mimeType);
          return key;
        }),
      );

      await ChatApi.sendMessage({
        conversationId,
        senderId: userIdForChat,
        content: keys,
        type: "image",
        replyToMsgId: replyToMessage?.msg_id,
      });
      setReplyToMessage(null);
      setPendingScrollToBottom();
    },
    [conversationId, replyToMessage?.msg_id, setPendingScrollToBottom, userIdForChat],
  );

  const pickImagesAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    Keyboard.dismiss();

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
        });
      }
      setImagePanelVisible(false);
    } catch (error) {
      console.error("Failed to send images:", error);
      Alert.alert("Lỗi", "Không thể gửi ảnh. Vui lòng thử lại.");
    } finally {
      setIsSendingAttachment(false);
    }
  }, [conversationId, isSendingAttachment, uploadAndSendImages, userIdForChat]);

  const takePhotoAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    Keyboard.dismiss();

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
      setImagePanelVisible(false);
    } catch (error) {
      console.error("Failed to send camera image:", error);
      Alert.alert("Lỗi", "Không thể gửi ảnh từ camera.");
    } finally {
      setIsSendingAttachment(false);
    }
  }, [conversationId, isSendingAttachment, uploadAndSendImages, userIdForChat]);

  const pickFileAndSend = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    Keyboard.dismiss();

    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const fileSize = Number(asset.size || 0);
    if (fileSize > MAX_UPLOAD_SIZE) {
      Alert.alert("Tệp quá lớn", "Giới hạn kích thước tệp là 50MB.");
      return;
    }

    setIsSendingAttachment(true);
    try {
      await uploadAndSendSingleFile({
        uri: asset.uri,
        fileName: asset.name || `file_${Date.now()}`,
        mimeType: asset.mimeType,
        fileSize,
      });
    } catch (error) {
      console.error("Failed to send file:", error);
      Alert.alert("Lỗi", "Không thể gửi tệp. Vui lòng thử lại.");
    } finally {
      setIsSendingAttachment(false);
    }
  }, [conversationId, isSendingAttachment, uploadAndSendSingleFile, userIdForChat]);

  const startVoiceRecording = useCallback(async () => {
    if (isRecordingVoice) return;
    Keyboard.dismiss();

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
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Lỗi", "Không thể bắt đầu ghi âm.");
    }
  }, [isRecordingVoice]);

  const stopVoiceRecording = useCallback(async () => {
    if (!recording) return null;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
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

  const sendVoiceRecording = useCallback(async () => {
    if (!conversationId || !userIdForChat || isSendingAttachment) return;
    const uri = await stopVoiceRecording();
    if (!uri) return;

    setIsSendingAttachment(true);
    try {
      const filename = `voice_${Date.now()}.m4a`;
      await uploadAndSendSingleFile({
        uri,
        fileName: filename,
        mimeType: "audio/mp4",
        explicitType: "audio",
      });
      setVoicePanelVisible(false);
      setRecordingDurationMs(0);
    } catch (error) {
      console.error("Failed to send voice:", error);
      Alert.alert("Lỗi", "Không thể gửi ghi âm.");
    } finally {
      setIsSendingAttachment(false);
    }
  }, [conversationId, isSendingAttachment, stopVoiceRecording, uploadAndSendSingleFile, userIdForChat]);

  const toggleVoicePanel = useCallback(() => {
    Keyboard.dismiss();
    setVoicePanelVisible((current) => {
      const next = !current;
      if (next) {
        setImagePanelVisible(false);
        setEmojiPanelVisible(false);
      }
      return next;
    });
  }, []);

  const toggleImagePanel = useCallback(() => {
    Keyboard.dismiss();
    setImagePanelVisible((current) => {
      const next = !current;
      if (next) {
        setVoicePanelVisible(false);
        setEmojiPanelVisible(false);
        setSelectedMediaIds([]);
      } else {
        setSelectedMediaIds([]);
      }
      return next;
    });
  }, []);

  const toggleEmojiPanel = useCallback(() => {
    Keyboard.dismiss();
    setEmojiPanelVisible((current) => {
      const next = !current;
      if (next) {
        setVoicePanelVisible(false);
        setImagePanelVisible(false);
      }
      return next;
    });
  }, []);

  const appendEmoji = useCallback((emoji: string) => {
    setMessageText((current) => `${current}${emoji}`);
  }, []);

  const toggleSelectMedia = useCallback((assetId: string) => {
    setSelectedMediaIds((current) => (
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId]
    ));
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
        });
      }

      setSelectedMediaIds([]);
      setImagePanelVisible(false);
    } catch (error) {
      console.error('Failed to send selected media:', error);
      Alert.alert('Lỗi', 'Không thể gửi ảnh/video đã chọn.');
    } finally {
      setIsSendingAttachment(false);
    }
  }, [conversationId, isSendingAttachment, mediaAssets, selectedMediaIds, uploadAndSendImages, uploadAndSendSingleFile, userIdForChat]);

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

  const pinnedChips = pinnedMessages.slice(0, 3);
  const pinnedCount = pinnedMessages.length;

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
          onBack={() => router.back()}
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
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator
                size="large"
                color={CHAT_BROWN}
              />
              <Text className="mt-3 text-[14px] text-slate-500">
                Đang tải cuộc trò chuyện...
              </Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={getMessageKey}
              onScroll={onScroll}
              scrollEventThrottle={16}
              onContentSizeChange={handleContentSizeChange}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              onScrollToIndexFailed={(info) => {
                requestAnimationFrame(() => {
                  listRef.current?.scrollToOffset({
                    offset: Math.max(info.averageItemLength * info.index, 0),
                    animated: true,
                  });
                });
              }}
              renderItem={({ item, index }) => {
                const prevMessage = messages[index - 1];
                const isMine =
                  String(item.sender_id) === String(userIdForChat || "");
                const showTimestamp = shouldShowTimestamp(
                  item.createdAt || item.created_at,
                  prevMessage?.createdAt || prevMessage?.created_at,
                );
                const showSenderName =
                  isGroup &&
                  !isMine &&
                  (index === 0 ||
                    prevMessage?.sender_id !== item.sender_id ||
                    showTimestamp);

                return (
                  <View>
                    {showTimestamp && (
                      <View className="my-3 items-center">
                        <View className="rounded-full bg-slate-200 px-3 py-1">
                          <Text className="text-[11px] font-medium text-slate-600">
                            {formatConversationTime(
                              item.createdAt || item.created_at,
                            )}
                          </Text>
                        </View>
                      </View>
                    )}

                    <ChatMessageBubble
                      message={item}
                      isMine={isMine}
                      mineAccentColor={CHAT_BROWN}
                      showSenderName={showSenderName}
                      highlight={highlightedMessageId === getMessageKey(item)}
                      onLongPress={() => {
                        setReplyToMessage(item);
                        handleMessageAction(item);
                      }}
                      onReplyPress={() =>
                        item.reply_to_msg_id &&
                        highlightMessage(item.reply_to_msg_id)
                      }
                      onImagePress={(imageIndex) => {
                        const imageItems = Array.isArray(item.content)
                          ? item.content.filter(
                              (content): content is ChatMessageContent =>
                                typeof content !== "string",
                            )
                          : [];
                        const selected =
                          (imageItems[imageIndex] as any)?.url || "";
                        if (selected) setSelectedImage(selected);
                      }}
                    />
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center px-6 py-24">
                  <Feather
                    name="message-square"
                    size={32}
                    color={THEME_COLORS.neutral.slate400}
                  />
                  <Text className="mt-3 text-[15px] font-semibold text-slate-900">
                    Chưa có tin nhắn
                  </Text>
                  <Text className="mt-2 text-center text-[13px] leading-5 text-slate-500">
                    Hãy gửi lời chào đầu tiên để bắt đầu cuộc trò chuyện.
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {!hasSelectedMedia && (
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
          />
        )}

        {imagePanelVisible && (
          <ChatMediaPanel
            visible={imagePanelVisible}
            accentColor={CHAT_BROWN}
            selectedMediaIds={selectedMediaIds}
            mediaAssets={mediaAssets}
            mediaLoading={mediaLoading}
            onClose={() => setImagePanelVisible(false)}
            onTakePhoto={() => void takePhotoAndSend()}
            onToggleSelectMedia={toggleSelectMedia}
            onClearSelection={() => setSelectedMediaIds([])}
            onSendSelected={() => void sendSelectedPanelMedia()}
          />
        )}

        {emojiPanelVisible && (
          <ChatEmojiPanel height={360} onAppendEmoji={appendEmoji} />
        )}

        {voicePanelVisible && (
          <ChatVoicePanel
            height={360}
            accentColor={CHAT_BROWN}
            recordingDurationMs={recordingDurationMs}
            isRecordingVoice={isRecordingVoice}
            isSendingAttachment={isSendingAttachment}
            onToggleRecord={async () => {
              if (isRecordingVoice) {
                await stopVoiceRecording();
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
              await sendVoiceRecording();
            }}
            onSendVoice={() => void sendVoiceRecording()}
            onClose={() => {
              setVoicePanelVisible(false);
              if (isRecordingVoice) {
                void stopVoiceRecording();
              }
            }}
            formatVoiceDuration={formatVoiceDuration}
          />
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/90 px-4"
          onPress={() => setSelectedImage(null)}
        >
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              className="h-[72%] w-full rounded-3xl"
              resizeMode="contain"
            />
          )}
          <Pressable
            onPress={() => setSelectedImage(null)}
            className="absolute right-5 top-16 h-11 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <Feather name="x" size={22} color={THEME_COLORS.neutral.white} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
