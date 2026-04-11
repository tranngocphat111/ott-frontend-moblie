import React from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FileText, Forward, Pin, Reply, Trash2, Download, CornerDownLeft } from 'lucide-react-native';
import { Image } from 'expo-image';
import type { ChatMessage } from '@/types';
import { getMessageBodyText, resolveMediaUrl } from '@/utils/chat';

type Props = {
  visible: boolean;
  message: ChatMessage | null;
  isMine?: boolean;
  isPinned?: boolean;
  x?: number;
  y?: number;
  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onSaveToDocuments: () => void;
  onPinToggle: () => void;
  onSaveFile: () => void;
  onRevoke: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
};

const reactionList = ['❤️', '👍', '😂', '😮', '😭', '😡'];

const actionButtonClass = 'items-center justify-center rounded-2xl bg-white px-2 py-3';

const getPreviewUrl = (message: ChatMessage) => {
  const firstContent = Array.isArray(message.content) ? message.content[0] : message.content;
  if (typeof firstContent === 'string') return resolveMediaUrl(firstContent);
  if (!firstContent || typeof firstContent !== 'object') return '';
  return resolveMediaUrl(firstContent.url || firstContent.text || firstContent.name || '');
};

export const ChatMessageActionsModal: React.FC<Props> = ({
  visible,
  message,
  isMine = false,
  isPinned = false,
  x = 24,
  y = 120,
  onClose,
  onReply,
  onForward,
  onSaveToDocuments,
  onPinToggle,
  onSaveFile,
  onRevoke,
  onDelete,
  onReact,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  if (!visible || !message) return null;

  const previewUrl = getPreviewUrl(message);
  const canSaveFile = ['image', 'file', 'video', 'audio'].includes(message.type);
  const canRevoke = isMine && !message.is_deleted && !message.is_revoked;
  const canPinMessage = !message.is_deleted && !message.is_revoked;
  const menuWidth = 286;
  const menuHeight = canSaveFile ? (canRevoke ? 388 : 348) : (canRevoke ? 344 : 304);
  const isLowerHalf = y > windowHeight * 0.58;
  const menuLeft = Math.min(Math.max(x - menuWidth / 2, 12), Math.max(windowWidth - menuWidth - 12, 12));
  const menuTop = isLowerHalf
    ? Math.max((windowHeight - menuHeight) / 2, 12)
    : Math.min(Math.max(y - 24, 12), Math.max(windowHeight - menuHeight - 20, 12));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/35 px-4" onPress={onClose}>
        <View className="flex-1">
          <Pressable
            onPress={() => undefined}
            className="overflow-hidden rounded-[28px] bg-[#f7efe8] p-3 shadow-2xl shadow-black/20"
            style={{
              position: 'absolute',
              left: menuLeft,
              top: menuTop,
              width: menuWidth,
            }}
          >
            <View className="mb-3 rounded-[20px] bg-white px-3 py-2 shadow-sm">
              <View className="flex-row items-center gap-3">
                <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#f0f4fb]">
                  {previewUrl ? (
                    <Image source={{ uri: previewUrl }} className="h-full w-full" contentFit="cover" transition={120} />
                  ) : (
                    <FileText size={24} color="#4b5563" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-slate-900" numberOfLines={1}>
                    {getMessageBodyText(message)}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-slate-500" numberOfLines={1}>
                    {message.type === 'file' ? 'File đính kèm' : 'Tùy chọn tin nhắn'}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mb-3 flex-row items-center justify-between rounded-[20px] bg-white px-2 py-2">
              {reactionList.map((emoji) => (
                <Pressable key={emoji} onPress={() => onReact(emoji)} className="h-11 w-11 items-center justify-center rounded-full bg-slate-50">
                  <Text className="text-[24px]">{emoji}</Text>
                </Pressable>
              ))}
            </View>

            <View className="rounded-[24px] bg-white p-3">
              <View className="flex-row flex-wrap gap-2">
                <Pressable onPress={onReply} className={`w-[48%] ${actionButtonClass}`}>
                  <Reply size={18} color="#7c3aed" />
                  <Text className="mt-1 text-[13px] text-slate-700">Trả lời</Text>
                </Pressable>
                <Pressable onPress={onForward} className={`w-[48%] ${actionButtonClass}`}>
                  <Forward size={18} color="#0ea5e9" />
                  <Text className="mt-1 text-[13px] text-slate-700">Chuyển tiếp</Text>
                </Pressable>
                <Pressable onPress={onSaveToDocuments} className={`w-[48%] ${actionButtonClass}`}>
                  <Download size={18} color="#06b6d4" />
                  <Text className="mt-1 text-center text-[13px] text-slate-700">Lưu vào My Documents</Text>
                </Pressable>
                {canPinMessage && (
                  <Pressable onPress={onPinToggle} className={`w-[48%] ${actionButtonClass}`}>
                    <Pin size={18} color="#f59e0b" fill={isPinned ? '#f59e0b' : 'none'} />
                    <Text className="mt-1 text-[13px] text-slate-700">{isPinned ? 'Bỏ ghim' : 'Ghim'}</Text>
                  </Pressable>
                )}
                <Pressable onPress={onSaveFile} disabled={!canSaveFile} className={`w-[48%] ${actionButtonClass} ${!canSaveFile ? 'opacity-40' : ''}`}>
                  <Feather name="download" size={18} color="#16a34a" />
                  <Text className="mt-1 text-[13px] text-slate-700">Lưu file</Text>
                </Pressable>
                {canRevoke && (
                  <Pressable onPress={onRevoke} className={`w-[48%] ${actionButtonClass}`}>
                    <CornerDownLeft size={18} color="#ef4444" />
                    <Text className="mt-1 text-[13px] text-slate-700">Thu hồi</Text>
                  </Pressable>
                )}
                <Pressable onPress={onDelete} className={`w-[48%] ${actionButtonClass}`}>
                  <Trash2 size={18} color="#ef4444" />
                  <Text className="mt-1 text-[13px] text-slate-700">Xóa</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};
