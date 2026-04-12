import React from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Forward, Pin, Reply, Trash2, Download, CornerDownLeft, XCircle } from 'lucide-react-native';
import type { ChatMessage } from '@/types';
import { getMessageBodyText } from '@/utils/chat';

type Props = {
  visible: boolean;
  message: ChatMessage | null;
  isMine?: boolean;
  isPinned?: boolean;
  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onSaveToDocuments: () => void;
  onPinToggle: () => void;
  onSaveFile: () => void;
  onRevoke: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  currentUserId?: string;
};

const reactionList = ['❤️', '👍', '😂', '😮', '😭', '😡'];

const normalizeId = (value: unknown) => String(value || '').trim();

export const ChatMessageActionsModal: React.FC<Props> = ({
  visible,
  message,
  isMine = false,
  isPinned = false,
  onClose,
  onReply,
  onForward,
  onSaveToDocuments,
  onPinToggle,
  onSaveFile,
  onRevoke,
  onDelete,
  onReact,
  currentUserId,
}) => {
  if (!visible || !message) return null;

  const senderAvatar = message.sender_avatar;
  const senderName = message.sender_name || message.sender_id || 'Thành viên';
  const isRevokedMessage = !!message.is_revoked;
  const canSaveFile = ['image', 'file', 'video', 'audio'].includes(message.type);
  const canRevoke = isMine && !message.is_deleted && !message.is_revoked;
  const canPinMessage = !message.is_deleted && !message.is_revoked;
  const myReaction = (message.reactions || []).find(
    (reaction) => normalizeId(reaction.user_id) === normalizeId(currentUserId),
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        {/* Đẩy modal xuống đáy màn hình */}
        <View className="mt-auto rounded-t-[32px] bg-[#f7efe8] px-4 pb-8 pt-2 shadow-2xl">
          {/* Thanh kéo nhỏ ở trên cùng */}
          <View className="mb-4 mt-2 h-1 w-12 self-center rounded-full bg-slate-200" />

          {/* 1. KHU VỰC TRÍCH DẪN TIN NHẮN */}
          <View className="mb-4 rounded-[20px] bg-white px-4 py-3 shadow-sm border border-slate-100">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#f7f1ea]">
                {senderAvatar ? (
                  <Image source={{ uri: senderAvatar }} className="h-full w-full object-cover" />
                ) : (
                  <Text className="text-[16px] font-bold text-[#8b6642]">
                    {String(senderName || '?').trim().slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-slate-900" numberOfLines={1}>
                  {senderName}
                </Text>
                <Text className="mt-0.5 text-[13px] text-slate-600" numberOfLines={2}>
                  {getMessageBodyText(message)}
                </Text>
              </View>
            </View>
          </View>

          {!isRevokedMessage && (
            <View className="mb-5 flex-row items-center w-full gap-3">
              {/* Container Emoji (Dùng flex-1 và justify-between để giãn đều) */}
              <View className="flex-1 flex-row items-center justify-between rounded-full bg-white px-4 py-2 shadow-sm border border-slate-100">
                {reactionList.map((emoji) => {
                  const isSelected = myReaction?.type === emoji;
                  return (
                    <Pressable
                      key={emoji}
                      onPress={() => {
                        onReact(emoji);
                        onClose();
                      }}
                      className={`h-11 w-11 items-center justify-center rounded-full active:bg-slate-50 ${
                        isSelected ? 'bg-slate-100' : ''
                      }`}
                    >
                      <Text className="text-[26px]">{emoji}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Nút Gỡ Cảm Xúc (thêm shrink-0 để không bị bóp méo khi hiện ra) */}
              {!!myReaction && (
                <View className="h-12 w-12 shrink-0 rounded-full bg-white shadow-sm border border-slate-100">
                  <Pressable
                    onPress={() => {
                      onReact(myReaction.type);
                      onClose();
                    }}
                    className="h-full w-full items-center justify-center rounded-full active:bg-slate-50"
                  >
                    <XCircle size={22} color="#9b2c2c" />
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* 3. DANH SÁCH HÀNH ĐỘNG */}
          <View className="flex-row flex-wrap justify-between">
            {isRevokedMessage ? (
              <View className="w-full">
                <Pressable onPress={onDelete} className="mb-2 flex-row items-center gap-3 rounded-2xl border border-error-border bg-error-bg px-4 py-3 active:bg-slate-100">
                  <Trash2 size={18} color="#dc2626" />
                  <Text className="text-[14px] font-medium text-error-text" numberOfLines={1}>Xóa tin</Text>
                </Pressable>
              </View>
            ) : (
              <>
            {/* Cột trái */}
            <View className="w-[48%]">
              <Pressable onPress={onReply} className="mb-2 flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm active:bg-slate-100">
                <Reply size={18} color="#8b6642" />
                <Text className="text-[14px] font-medium text-slate-800" numberOfLines={1}>Trả lời</Text>
              </Pressable>

              <Pressable onPress={onForward} className="mb-2 flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm active:bg-slate-100">
                <Forward size={18} color="#8b6642" />
                <Text className="text-[14px] font-medium text-slate-800" numberOfLines={1}>Chuyển tiếp</Text>
              </Pressable>

              {canPinMessage && (
                <Pressable onPress={onPinToggle} className="mb-2 flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm active:bg-slate-100">
                  <Pin size={18} color="#f59e0b" fill={isPinned ? '#f59e0b' : 'none'} />
                  <Text className="text-[14px] font-medium text-slate-800" numberOfLines={1}>{isPinned ? 'Bỏ ghim' : 'Ghim tin'}</Text>
                </Pressable>
              )}
            </View>

            {/* Cột phải */}
            <View className="w-[48%]">
              <Pressable onPress={onSaveToDocuments} className="mb-2 flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm active:bg-slate-100">
                <Download size={18} color="#06b6d4" />
                <Text className="text-[14px] font-medium text-slate-800" numberOfLines={1}>Lưu Documents</Text>
              </Pressable>

              <Pressable onPress={onSaveFile} disabled={!canSaveFile} className={`mb-2 flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ${!canSaveFile ? 'opacity-40' : 'active:bg-slate-100'}`}>
                <Feather name="download" size={18} color="#16a34a" />
                <Text className="text-[14px] font-medium text-slate-800" numberOfLines={1}>Lưu file</Text>
              </Pressable>

              {canRevoke && (
                <Pressable onPress={onRevoke} className="mb-2 flex-row items-center gap-3 rounded-2xl border border-error-border bg-error-bg px-4 py-3 active:bg-slate-100">
                  <CornerDownLeft size={18} color="#ef4444" />
                  <Text className="text-[14px] font-medium text-error-text" numberOfLines={1}>Thu hồi</Text>
                </Pressable>
              )}

              <Pressable onPress={onDelete} className="mb-2 flex-row items-center gap-3 rounded-2xl border border-error-border bg-error-bg px-4 py-3 active:bg-slate-100">
                <Trash2 size={18} color="#dc2626" />
                <Text className="text-[14px] font-medium text-error-text" numberOfLines={1}>Xóa tin</Text>
              </Pressable>
            </View>
              </>
            )}
          </View>

        </View>
      </Pressable>
    </Modal>
  );
};