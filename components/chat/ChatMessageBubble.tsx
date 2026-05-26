import React, { memo, useMemo } from "react";
import {
  Alert,
  GestureResponderEvent,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import type { ChatConversation, ChatMessage } from "@/types/entities/chat";
import { getMessageBodyText, isCallMessageType, isSystemMessageType } from "@/utils/chat";
import { getMessageTranslationCandidate } from "@/utils/translationDetection";
import { THEME_COLORS } from "@/constants/theme";
import {
  CornerUpLeft,
  ImageIcon,
  Music2,
  PlayCircle,
  Phone,
  PhoneMissed,
  PhoneOff,
  FileText,
  UserPlus,
  UserCog,
  UserCheck,
  Ban,
  LogOut,
  Pin,
  PinOff,
  Settings,
  Video,
  TextAlignJustify,
  Languages,
} from "lucide-react-native";
import { ChatFileMessage } from "./message-types/ChatFileMessage";
import { ChatImageMessage } from "./message-types/ChatImageMessage";
import { ChatVideoMessage } from "./message-types/ChatVideoMessage";
import { ChatAudioMessage } from "./message-types/ChatAudioMessage";
import { ChatLinkMessage } from "./message-types/ChatLinkMessage";
import { ChatPollMessage } from "./message-types/ChatPollMessage";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  showSenderName?: boolean;
  highlight?: boolean;
  onPress?: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  onReplyPress?: () => void;
  onImagePress?: (index: number) => void;
  onReactionPress?: (message: ChatMessage, emoji: string) => void;
  onMediaReady?: (messageId: string) => void;
  mineAccentColor?: string;
  conversation?: ChatConversation | null;
  isGroupConversation?: boolean;
  translatedText?: string;
  onTranslate?: () => void;
  isTranslating?: boolean;
  translationUnavailable?: boolean;
}

const getReactionSummary = (message: ChatMessage) => {
  const counts = new Map<string, number>();
  (message.reactions || []).forEach((reaction) => {
    counts.set(reaction.type, (counts.get(reaction.type) || 0) + 1);
  });

  return Array.from(counts.entries()).slice(0, 3);
};

const extractFileName = (value: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return decodeURIComponent(
      (url.pathname.split("/").pop() || "").replace(/^[a-f0-9]+_/i, ""),
    );
  } catch {
    const byPath = raw.split("/").pop() || raw;
    return decodeURIComponent(
      (byPath.split("?")[0] || byPath).replace(/^[a-f0-9]+_/i, ""),
    );
  }
};

const getReplyUiMeta = (reply: NonNullable<ChatMessage["reply_to"]>) => {
  const type = reply.type;
  const raw = String(reply.raw_content || reply.url || reply.content || "");
  const fileName = reply.file_name || extractFileName(raw);

  if (type === "image") {
    const thumb = reply.media_urls?.[0] || reply.url || raw;
    return {
      icon: ImageIcon,
      label: "Hình ảnh",
      detail: fileName || "[Hình ảnh]",
      thumbnail: thumb || "",
    };
  }

  if (type === "video") {
    const thumb = reply.url || raw;
    return {
      icon: PlayCircle,
      label: "Video",
      detail: fileName || "[Video]",
      thumbnail: thumb || "",
    };
  }

  if (type === "audio") {
    return {
      icon: Music2,
      label: "Âm thanh",
      detail: fileName || "[Âm thanh]",
      thumbnail: "",
    };
  }

  if (type === "file") {
    return {
      icon: FileText,
      label: "Tệp",
      detail: fileName || "[Tệp tin]",
      thumbnail: "",
    };
  }

  if (type === "poll") {
    return {
      icon: TextAlignJustify,
      label: "Bình chọn",
      detail: reply.poll_question || "[Bình chọn]",
      thumbnail: "",
    };
  }

  return {
    icon: TextAlignJustify,
    label: "Tin nhắn",
    detail: String(reply.content || "").trim() || "Tin nhắn",
    thumbnail: "",
  };
};

const getSystemNotificationUi = (type?: string | null) => {
  const normalizedType = String(type || "").toLowerCase();

  if (normalizedType === "call_join") {
    return {
      icon: Video,
      iconColor: "#b45309",
      badgeClassName: "border-amber-200 bg-amber-50",
      textClassName: "text-amber-800",
    };
  }

  if (normalizedType === "system_add" || normalizedType === "system_friend_request") {
    const isFriendReq = normalizedType === "system_friend_request";
    return {
      icon: UserPlus,
      iconColor: isFriendReq ? THEME_COLORS.primary[600] : "#0f766e",
      badgeClassName: isFriendReq ? "border-primary-100 bg-primary-50" : "border-teal-100 bg-teal-50",
      textClassName: isFriendReq ? "text-primary-700" : "text-teal-700",
    };
  }

  if (normalizedType === "system_block") {
    return {
      icon: Ban,
      iconColor: "#ef4444",
      badgeClassName: "border-red-100 bg-red-50",
      textClassName: "text-red-700",
    };
  }

  if (normalizedType === "system_leave") {
    return {
      icon: LogOut,
      iconColor: "#f97316",
      badgeClassName: "border-orange-100 bg-orange-50",
      textClassName: "text-orange-700",
    };
  }

  if (normalizedType === "system_pin") {
    return {
      icon: Pin,
      iconColor: THEME_COLORS.primary[600],
      badgeClassName: "border-primary-100 bg-primary-50",
      textClassName: "text-primary-700",
    };
  }

  if (normalizedType === "system_unpin") {
    return {
      icon: PinOff,
      iconColor: "#475569",
      badgeClassName: "border-slate-200 bg-slate-100",
      textClassName: "text-slate-700",
    };
  }

  if (normalizedType === "system_transfer_owner") {
    return {
      icon: UserCheck,
      iconColor: "#059669",
      badgeClassName: "border-emerald-100 bg-emerald-50",
      textClassName: "text-emerald-700",
    };
  }

  if (normalizedType === "system_role_change") {
    return {
      icon: UserCog,
      iconColor: "#4f46e5",
      badgeClassName: "border-indigo-100 bg-indigo-50",
      textClassName: "text-indigo-700",
    };
  }

  return {
    icon: Settings,
    iconColor: "#64748b",
    badgeClassName: "border-slate-200 bg-slate-100",
    textClassName: "text-slate-600",
  };
};

const getCallRawContent = (message: ChatMessage) => {
  const firstContent = Array.isArray(message.content) ? message.content[0] : undefined;
  if (typeof firstContent === "string") return String(firstContent);
  if (!firstContent || typeof firstContent !== "object") return "";
  return String(firstContent.text || firstContent.url || firstContent.name || "");
};

const getCallTypeUi = (type?: string | null) => {
  const normalizedType = String(type || "").toLowerCase();

  if (normalizedType === "call_end") {
    return { Icon: PhoneOff, label: "Cuộc gọi đã kết thúc" };
  }

  if (
    normalizedType === "call_missed" ||
    normalizedType === "call_cancel" ||
    normalizedType === "call_no_answer" ||
    normalizedType === "call_start" ||
    normalizedType === "call_join"
  ) {
    return { Icon: PhoneMissed, label: "Cuộc gọi nhỡ" };
  }

  return { Icon: Phone, label: "Cuộc gọi" };
};

const getCallDisplayCopy = (message: ChatMessage, isGroupCall = false) => {
  const normalizedType = String(message.type || "").toLowerCase();
  const rawContent = getCallRawContent(message);
  const isVideoCall = /video/i.test(rawContent);
  const isMissedCall =
    normalizedType === "call_missed" ||
    normalizedType === "call_cancel" ||
    normalizedType === "call_no_answer";

  const callDate = new Date(String(message.createdAt || message.created_at || ""));
  const callTimeLabel = Number.isNaN(callDate.getTime())
    ? ""
    : callDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const durationText = rawContent
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(1)
    .pop() || "";

  return {
    title: isMissedCall
      ? `Đã bỏ lỡ cuộc gọi ${isVideoCall ? "video" : "thoại"}`
      : `Cuộc gọi ${isVideoCall ? "video" : "thoại"}`,
    subtitle: isGroupCall ? "" : isMissedCall ? callTimeLabel : durationText || callTimeLabel,
    isMissedCall,
    isVideoCall,
  };
};

const getSystemDisplayText = (
  message: ChatMessage,
  fallbackText: string,
  isMine: boolean,
) => {
  const normalizedType = String(message.type || "").toLowerCase();
  const text = String(fallbackText || "").trim();
  const senderName = String(message.sender_name || "").trim();

  if (normalizedType === "system_friend_request") {
    const requesterName = String((message.system_meta as any)?.requester_name || senderName).trim();
    if (isMine) return "Tôi đã gửi lời mời kết bạn";
    const displayName = requesterName;

    if (!text || text === "Đã gửi lời mời kết bạn" || text === "Đã gửi lời mời kết bạn.") {
      return displayName
        ? `${displayName} đã gửi lời mời kết bạn`
        : "Có lời mời kết bạn mới";
    }
  }

  if (isMine && senderName && text.startsWith(senderName)) {
    return `Bạn${text.slice(senderName.length)}`;
  }

  return text;
};

const ChatMessageBubbleBase: React.FC<ChatMessageBubbleProps> = ({
  message,
  isMine,
  showSenderName = false,
  highlight = false,
  onPress,
  onLongPress,
  onReplyPress,
  onImagePress,
  onReactionPress,
  onMediaReady,
  mineAccentColor = "#dff0ff",
  conversation,
  isGroupConversation = false,
  translatedText,
  onTranslate,
  isTranslating = false,
  translationUnavailable = false,
}) => {
  const contentText = getMessageBodyText(message);
  const translationCandidate = useMemo(
    () => getMessageTranslationCandidate(contentText),
    [contentText],
  );
  const visibleTranslatedText =
    translatedText?.trim() && translatedText.trim() !== contentText.trim()
      ? translatedText.trim()
      : "";
  const shouldShowTranslation =
    !isMine &&
    !message.is_revoked &&
    !translationUnavailable &&
    Boolean(visibleTranslatedText || (onTranslate && translationCandidate.shouldOffer));
  const reactions = useMemo(() => getReactionSummary(message), [message]);
  const totalReactionCount = useMemo(
    () => reactions.reduce((sum, [, count]) => sum + count, 0),
    [reactions],
  );

  if (isSystemMessageType(message.type)) {
    const systemUi = getSystemNotificationUi(message.type);
    const SystemIcon = systemUi.icon;
    const displayText = getSystemDisplayText(message, contentText, isMine);

    return (
      <View className="my-2 items-center px-4">
        <View
          className={`max-w-[92%] flex-row items-center rounded-full border px-3 py-1.5 ${systemUi.badgeClassName}`}
        >
          <SystemIcon size={14} color={systemUi.iconColor} />
          <Text
            className={`ml-1.5 text-center text-[12px] ${systemUi.textClassName}`}
          >
            {displayText}
          </Text>
        </View>
      </View>
    );
  }

  const bubbleStyle = isMine
    ? "bg-white border-[#e7d5c4]"
    : "bg-white border-slate-200";

  const textStyle = isMine ? "text-slate-800" : "text-slate-900";
  const isMediaVisual =
    !message.is_revoked &&
    !isCallMessageType(message.type) &&
    (message.type === "image" ||
      message.type === "video" ||
      message.type === "audio" ||
      message.type === "poll");
  const isCallMessage = isCallMessageType(message.type);
  const normalizedCallType = String(message.type || "").toLowerCase();
  const hideCallMessageBubble = normalizedCallType === "call_start" || normalizedCallType === "call_join";
  const isGroupCallMessage =
    isGroupConversation ||
    conversation?.type === "group" ||
    Boolean((message.system_meta as any)?.isGroup);
  const callCopy = isCallMessage ? getCallDisplayCopy(message, isGroupCallMessage) : null;
  const callTypeUi = getCallTypeUi(message.type);
  const CallStatusIcon = callTypeUi.Icon;

  const isReplyTargetDeleted = Boolean(message.reply_to?.is_deleted);
  const isReplyTargetRevoked = Boolean(message.reply_to?.is_revoked);
  const replyPreviewText = isReplyTargetDeleted
    ? "Tin nhắn đã bị xóa"
    : isReplyTargetRevoked
      ? "Tin nhắn đã được thu hồi"
      : null;

  if (hideCallMessageBubble) {
    return null;
  }

  return (
    <View className={`mb-3 ${message.type === 'poll' ? 'items-center' : isMine ? "items-end" : "items-start"}`}>
      {showSenderName && !isMine && (
        <Text className="mb-1 ml-1 text-[12px] font-semibold text-slate-500">
          {message.sender_name || "Thành viên"}
        </Text>
      )}

      {message.reply_to && !message.is_revoked && !message.is_deleted && (
        <Pressable
          onPress={() => {
            if (isReplyTargetDeleted) {
              Alert.alert("Thông báo", "Tin nhắn đã bị xóa");
              return;
            }

            if (isReplyTargetRevoked) {
              Alert.alert("Thông báo", "Tin nhắn đã được thu hồi");
              return;
            }

            onReplyPress?.();
          }}
          className={`mb-1 rounded-xl border px-3 py-2 ${isMine ? "border-[#e7d5c4] bg-white/70" : "border-slate-200 bg-slate-50"}`}
          style={{ minWidth: 170, maxWidth: 260 }}
        >
          <View className="flex-row items-center gap-2">
            <CornerUpLeft size={12} color={isMine ? "#b78457" : "#64748b"} />
            <Text
              className={`flex-1 text-[12px] font-semibold ${isMine ? "text-slate-700" : "text-slate-600"}`}
              numberOfLines={1}
            >
              {message.reply_to.sender_name || "Tin nhắn trước"}
            </Text>
          </View>
          {(() => {
            const meta = getReplyUiMeta(message.reply_to);
            const ReplyIcon = meta.icon;
            const showThumb =
              !!meta.thumbnail && message.reply_to?.type === "image";

            return (
              <View className="mt-1 flex-row items-center">
                <View className="flex-1 gap-2 flex-row items-center">
                  <ReplyIcon size={16} color={isMine ? "#a8744c" : "#64748b"} />
                  <Text
                    className={`ml-1 text-[12px] max-w-[80%] ${isMine ? "text-slate-600" : "text-slate-500"}`}
                    numberOfLines={2}
                  >
                    {replyPreviewText || meta.detail}
                  </Text>
                </View>
              </View>
            );
          })()}
        </Pressable>
      )}

      <View className="relative max-w-full">
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          className={`max-w-full rounded-xl border ${isMediaVisual ? "p-0" : "px-3 py-2.5"} ${bubbleStyle}`}
          style={[
            isMine
              ? { backgroundColor: mineAccentColor, borderColor: "#e0c3ad" }
              : undefined,
            isMediaVisual
              ? { backgroundColor: "transparent", borderColor: "transparent" }
              : undefined,
            highlight
              ? {
                borderColor: "#b78457",
                borderWidth: 2,
                shadowColor: "#8b5e34",
                shadowOpacity: 0.24,
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 10,
                elevation: 7,
              }
              : undefined,
          ]}
        >
          {message.is_revoked ? (
            <Text className="text-[15px] italic leading-5 text-slate-500">
              {contentText || (isMine ? "Bạn đã thu hồi một tin nhắn" : "Tin nhắn đã được thu hồi")}
            </Text>
          ) : isCallMessage && callCopy ? (
            <View className="min-w-[190px] max-w-[280px] p-1">
              <View className="flex-row items-center gap-3">
                <View className={`h-9 w-9 items-center justify-center rounded-full ${callCopy.isMissedCall ? "bg-[#fee2e2]" : isMine ? "bg-white/40" : "bg-[#f3e8dc]"}`}>
                  {callCopy.isVideoCall ? (
                    <Video size={18} color={callCopy.isMissedCall ? "#dc2626" : "#8b6642"} />
                  ) : (
                    <CallStatusIcon size={18} color={callCopy.isMissedCall ? "#dc2626" : "#8b6642"} />
                  )}
                </View>

                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold leading-tight text-slate-900">
                    {callCopy.title}
                  </Text>
                  {!!callCopy.subtitle && (
                    <Text className="mt-0.5 text-[12px] text-slate-500" numberOfLines={1}>
                      {callCopy.subtitle}
                    </Text>
                  )}
                </View>
              </View>

              <Pressable
                onPress={onPress}
                disabled={!onPress}
                className={`mt-2.5 items-center rounded-xl py-2 ${isMine ? "bg-[#bc9369]" : "bg-[#ded7d1]"} ${!onPress ? "opacity-50" : "active:opacity-85"}`}
              >
                <Text className={`text-[14px] font-semibold ${isMine ? "text-white" : "text-[#8b6642]"}`}>
                  Gọi lại
                </Text>
              </Pressable>
            </View>
          ) : message.type === "image" ? (
            <ChatImageMessage
              message={message}
              onImagePress={onImagePress}
              onLongPress={onLongPress}
              onMediaReady={onMediaReady}
            />
          ) : message.type === "file" ? (
            <ChatFileMessage
              message={message}
              isMine={isMine}
              onLongPress={onLongPress}
            />
          ) : message.type === "link" ? (
            <ChatLinkMessage
              message={message}
              isMine={isMine}
              onLongPress={onLongPress}
            />
          ) : message.type === "video" ? (
            <ChatVideoMessage
              message={message}
              onPress={onPress}
              onLongPress={onLongPress}
              onMediaReady={onMediaReady}
            />
          ) : message.type === "poll" ? (
            <ChatPollMessage
              message={message}
              isMine={isMine}
              conversation={conversation}
            />
          ) : message.type === "audio" ? (
            <ChatAudioMessage
              message={message}
              isMine={isMine}
              accentColor={mineAccentColor}
            />
          ) : (
            <View>
              <Text className={`text-[15px] leading-6 ${textStyle}`}>
                {contentText}
              </Text>

              {shouldShowTranslation && (
                <View className="mt-2 border-t border-slate-100 pt-2">
                  {visibleTranslatedText ? (
                    <View className="bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <Languages size={10} color={THEME_COLORS.primary[500]} />
                        <Text className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Dịch bởi AI</Text>
                      </View>
                      <Text className="text-[14px] leading-5 text-slate-700 italic">
                        {visibleTranslatedText}
                      </Text>
                    </View>
                  ) : (
                    <Pressable 
                      onPress={onTranslate}
                      disabled={isTranslating}
                      className="flex-row items-center gap-1.5 opacity-80 active:opacity-100"
                    >
                      <Languages size={12} color={isMine ? "#b78457" : "#64748b"} />
                      <Text className={`text-[11px] font-semibold ${isMine ? "text-[#b78457]" : "text-slate-500"}`}>
                        {isTranslating ? "Đang dịch..." : "Dịch"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}
        </Pressable>

        {!message.is_revoked && !!reactions.length && (
          <Pressable
            onPress={() => onReactionPress?.(message, reactions[0][0])}
            className={`absolute -bottom-2 ${isMine ? "right-2" : "left-2"} flex-row items-center rounded-full border border-slate-200 bg-white px-1.5 py-[2px] shadow-sm`}
          >
            {reactions.map(([emoji]) => (
              <View
                key={emoji}
                className="mx-[1px] flex-row items-center rounded-full bg-slate-50 px-1 py-[1px]"
              >
                <Text className="text-[11px]">{emoji}</Text>
              </View>
            ))}
            {totalReactionCount > 1 && (
              <Text className="ml-1 text-[10px] font-semibold text-slate-700">
                {totalReactionCount}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

export const ChatMessageBubble = memo(ChatMessageBubbleBase);
