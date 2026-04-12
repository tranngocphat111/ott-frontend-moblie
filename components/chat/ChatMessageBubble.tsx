import React, { memo, useMemo } from "react";
import {
  GestureResponderEvent,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import type { ChatMessage } from "@/types";
import { getMessageBodyText } from "@/utils/chat";
import {
  CornerUpLeft,
  ImageIcon,
  Music2,
  PlayCircle,
  FileText,
} from "lucide-react-native";
import { ChatFileMessage } from "./message-types/ChatFileMessage";
import { ChatImageMessage } from "./message-types/ChatImageMessage";
import { ChatVideoMessage } from "./message-types/ChatVideoMessage";
import { ChatAudioMessage } from "./message-types/ChatAudioMessage";

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

  return {
    icon: CornerUpLeft,
    label: "Tin nhắn",
    detail: String(reply.content || "").trim() || "Tin nhắn",
    thumbnail: "",
  };
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
}) => {
  const contentText = getMessageBodyText(message);
  const reactions = useMemo(() => getReactionSummary(message), [message]);

  if (message.type === "system_add") {
    return (
      <View className="my-2 items-center px-4">
        <View className="max-w-[92%] rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5">
          <Text className="text-center text-[12px] text-slate-500">
            {contentText}
          </Text>
        </View>
      </View>
    );
  }

  const bubbleStyle = isMine
    ? "bg-white border-[#e7d5c4]"
    : "bg-white border-slate-200";

  const textStyle = isMine ? "text-slate-800" : "text-slate-900";
  const metaStyle = isMine ? "text-slate-500" : "text-slate-400";
  const isMediaVisual =
    message.type === "image" ||
    message.type === "video" ||
    message.type === "audio";

  return (
    <View className={`mb-3 ${isMine ? "items-end" : "items-start"}`}>
      {showSenderName && !isMine && (
        <Text className="mb-1 ml-1 text-[12px] font-semibold text-slate-500">
          {message.sender_name || "Thành viên"}
        </Text>
      )}

      {message.reply_to && !message.is_revoked && !message.is_deleted && (
        <Pressable
          onPress={onReplyPress}
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
                    {meta.detail}
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
          {message.type === "image" ? (
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
          ) : message.type === "video" ? (
            <ChatVideoMessage
              message={message}
              onPress={onPress}
              onLongPress={onLongPress}
              onMediaReady={onMediaReady}
            />
          ) : message.type === "audio" ? (
            <ChatAudioMessage
              message={message}
              isMine={isMine}
              accentColor={mineAccentColor}
            />
          ) : (
            <Text className={`text-[15px] leading-5 ${textStyle}`}>
              {contentText}
            </Text>
          )}
        </Pressable>

        {!!reactions.length && (
          <Pressable
            onPress={() => onReactionPress?.(message, reactions[0][0])}
            className={`absolute -bottom-2 ${isMine ? "right-2" : "left-2"} flex-row items-center rounded-full border border-slate-200 bg-white px-1.5 py-[2px] shadow-sm`}
          >
            {reactions.map(([emoji, count]) => (
              <View
                key={emoji}
                className="mx-[1px] flex-row items-center rounded-full bg-slate-50 px-1 py-[1px]"
              >
                <Text className="text-[11px]">{emoji}</Text>
                <Text className="ml-0.5 text-[10px] font-semibold text-slate-700">
                  {count}
                </Text>
              </View>
            ))}
          </Pressable>
        )}
      </View>
    </View>
  );
};

export const ChatMessageBubble = memo(ChatMessageBubbleBase);
