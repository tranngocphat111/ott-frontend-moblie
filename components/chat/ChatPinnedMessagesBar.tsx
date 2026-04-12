import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import type { ChatMessage } from '@/types';
import { getMessageBodyText, resolveMediaUrl } from '@/utils/chat';

const getAttachmentValue = (message: ChatMessage) => {
  const first = Array.isArray(message.content) ? message.content[0] : message.content;
  if (typeof first === 'string') return first;
  if (!first || typeof first !== 'object') return '';
  return String(first.url || first.text || first.name || '');
};

const extractFileName = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    return decodeURIComponent((url.pathname.split('/').pop() || '').replace(/^[a-f0-9]+_/i, ''));
  } catch {
    const byPath = raw.split('/').pop() || raw;
    return decodeURIComponent(byPath.split('?')[0] || byPath).replace(/^[a-f0-9]+_/i, '');
  }
};

const getPinnedPreviewMeta = (message?: ChatMessage | null) => {
  if (!message) return { icon: 'message-circle' as const, label: 'Tin nhắn', detail: '' };

  if (message.type === 'text' || message.type === 'link') {
    return {
      icon: 'message-circle' as const,
      label: 'Tin nhắn',
      detail: getMessageBodyText(message),
    };
  }

  const attachmentValue = getAttachmentValue(message);
  const fileName = extractFileName(attachmentValue);

  if (message.type === 'image') {
    return {
      icon: 'image' as const,
      label: 'Hình ảnh',
      detail: fileName || '[Hình ảnh]',
    };
  }

  if (message.type === 'video') {
    return {
      icon: 'video' as const,
      label: 'Video',
      detail: fileName || '[Video]',
    };
  }

  if (message.type === 'audio') {
    return {
      icon: 'music' as const,
      label: 'Âm thanh',
      detail: fileName || '[Âm thanh]',
    };
  }

  return {
    icon: 'file-text' as const,
    label: 'Tệp',
    detail: fileName || getMessageBodyText(message),
  };
};

const getInitials = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '?';

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0].slice(0, 1).toUpperCase();
  }

  return `${tokens[0].slice(0, 1)}${tokens[tokens.length - 1].slice(0, 1)}`.toUpperCase();
};

// Max 3 pinned messages per conversation
const MAX_PINNED = 3;

type Props = {
  pinnedMessages: ChatMessage[];
  showPinnedList: boolean;
  onTogglePinnedList: () => void;
  onHighlightMessage: (messageId: string) => void;
  onDeletePin?: (messageId: string) => void;
  onReorderPins?: (reorderedMessages: ChatMessage[]) => void;
  overlayTopOffset?: number;
};

export const ChatPinnedMessagesBar: React.FC<Props> = ({
  pinnedMessages,
  showPinnedList,
  onTogglePinnedList,
  onHighlightMessage,
  onDeletePin,
  onReorderPins,
  overlayTopOffset = 108,
}) => {
  const [isEditingPins, setIsEditingPins] = useState(false);
  const [editingMessages, setEditingMessages] = useState<ChatMessage[]>([]);
  const listTranslateY = useRef(new Animated.Value(-12)).current;
  const editTranslateY = useRef(new Animated.Value(24)).current;

  // Limit to MAX_PINNED messages only
  const limitedMessages = useMemo(
    () => pinnedMessages.slice(0, MAX_PINNED),
    [pinnedMessages],
  );
  const remainingCount = Math.max(0, limitedMessages.length - 1);
  const firstMessage = limitedMessages[0];
  const firstPreview = getPinnedPreviewMeta(firstMessage);
  const hasPinnedMessages = limitedMessages.length > 0;

  useEffect(() => {
    if (!showPinnedList || isEditingPins) {
      listTranslateY.setValue(-12);
      return;
    }

    listTranslateY.setValue(-12);
    Animated.timing(listTranslateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isEditingPins, listTranslateY, showPinnedList]);

  useEffect(() => {
    if (!isEditingPins) {
      editTranslateY.setValue(24);
      return;
    }

    editTranslateY.setValue(24);
    Animated.timing(editTranslateY, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [editTranslateY, isEditingPins]);

  const handleOpenEdit = () => {
    setEditingMessages([...limitedMessages]);
    setIsEditingPins(true);
  };

  const handleDeletePin = (messageId: string) => {
    const filtered = editingMessages.filter(
      (m) => (m.msg_id || m._id) !== messageId,
    );
    setEditingMessages(filtered);
    onDeletePin?.(messageId);
  };

  const handleConfirmEdit = async () => {
    try {
      if (onReorderPins) {
        await onReorderPins(editingMessages);
      }
      setIsEditingPins(false);
      onTogglePinnedList();
    } catch {
      // Parent already handles and displays the error message.
    }
  };

  if (!hasPinnedMessages) return null;

  return (
    <>
      <View className="border-b border-slate-200 px-4 py-2">
        {/* Main pinned message bar - State 1 */}
        <View className="flex-row items-center gap-2 rounded-2xl border border-[#ead8c6] bg-white px-3 py-2 shadow-sm">
          <View className="h-9 w-9 overflow-hidden rounded-full bg-[#f0e2d5]">
            {firstMessage?.sender_avatar ? (
              <Image
                source={{ uri: resolveMediaUrl(firstMessage.sender_avatar) }}
                className="h-full w-full"
              />
            ) : (
              <View className="h-full w-full items-center justify-center bg-[#f0e2d5]">
                <Text className="text-[12px] font-bold text-[#8b5e34]">
                  {getInitials(firstMessage?.sender_name || 'Thành viên')}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => firstMessage?.msg_id && onHighlightMessage(firstMessage.msg_id)}
            className="flex-1"
          >
            <Text className="text-[13px] font-semibold text-slate-800" numberOfLines={1}>
              {`${firstMessage?.sender_name || 'Thành viên'}`}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <Feather name={firstPreview.icon} size={13} color="#9a7a5c" />
              <Text className="ml-1 text-[13px] text-slate-500 " numberOfLines={1}>
                {firstPreview.detail}
              </Text>
            </View>
          </Pressable>

          {remainingCount > 0 && (
            <Pressable
              onPress={onTogglePinnedList}
              className="flex-row items-center rounded-full border border-[#e7d5c4] bg-[#faf3ec] px-3 py-1"
            >
              <Text className="mr-1 text-[12px] font-semibold text-[#b78457]">
                +{remainingCount}
              </Text>
              <Feather
                name={showPinnedList ? 'chevron-up' : 'chevron-down'}
                size={13}
                color="#b78457"
              />
            </Pressable>
          )}
        </View>

      </View>

      {/* Expanded pinned list - State 2 (overlay, khong day layout) */}
      <Modal
        visible={showPinnedList && !isEditingPins}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={onTogglePinnedList}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}
            onPress={onTogglePinnedList}
          />

          <Animated.View
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: overlayTopOffset,
              transform: [{ translateY: listTranslateY }],
            }}
          >
            <View className="rounded-2xl border border-[#ead8c6] bg-white px-3 py-3 shadow-xl">
              <View className="mb-2 px-1">
                <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#a6794f]">
                  Danh sách ghim
                </Text>
              </View>

              {limitedMessages.slice(1).map((item) => {
                const preview = getPinnedPreviewMeta(item);
                return (
                <Pressable
                  key={item.msg_id || item._id}
                  onPress={() => {
                    if (item.msg_id) {
                      onHighlightMessage(item.msg_id);
                    }
                    onTogglePinnedList();
                  }}
                  className="mb-2 rounded-xl border border-[#ead8c6] bg-[#fffdfa] px-3 py-2"
                >
                  <Text className="text-[12px] font-semibold text-slate-800" numberOfLines={1}>
                    {item.sender_name || 'Thành viên'}
                  </Text>
                  <View className="mt-0.5 flex-row items-center">
                    <Feather name={preview.icon} size={13} color="#9a7a5c" />
                    <Text className="ml-1 text-[13px] text-slate-500" numberOfLines={2}>
                      {preview.detail}
                    </Text>
                  </View>
                </Pressable>
                );
              })}

              <Pressable
                onPress={handleOpenEdit}
                className="mt-1 flex-row items-center justify-center rounded-xl border border-[#d4a896] bg-[#f5ede4] py-2.5"
              >
                <Feather name="edit-2" size={14} color="#b78457" />
                <Text className="ml-2 text-[13px] font-semibold text-[#b78457]">Chỉnh sửa</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Edit mode modal - State 3 */}
      <Modal
        visible={isEditingPins}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setIsEditingPins(false)}
      >
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setIsEditingPins(false)}
          />

          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateY: editTranslateY }],
            }}
          >
            <View className="rounded-t-3xl bg-white pb-8">
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-4">
              <Text className="text-[16px] font-bold text-slate-800">
                Chỉnh sửa danh sách ghim
              </Text>
              <Pressable onPress={() => setIsEditingPins(false)}>
                <Feather name="x" size={24} color="#8b5e34" />
              </Pressable>
            </View>

            {/* Editable list */}
            <DraggableFlatList
              data={editingMessages}
              keyExtractor={(item) => item.msg_id || item._id || ''}
              scrollEnabled={editingMessages.length > 3}
              activationDistance={16}
              containerStyle={{ maxHeight: 420 }}
              onDragEnd={({ data }) => setEditingMessages(data)}
              renderItem={({ item, drag, isActive }: RenderItemParams<ChatMessage>) => {
                const preview = getPinnedPreviewMeta(item);
                return (
                <Pressable
                  onLongPress={drag}
                  delayLongPress={120}
                  className={`flex-row items-center border-b border-slate-100 px-4 py-3 ${isActive ? 'bg-[#f8f3ee]' : 'bg-white'}`}
                >
                  {/* Drag handle */}
                  <Pressable onLongPress={drag} delayLongPress={120} className="mr-1 p-1">
                    <Feather name="menu" size={18} color="#bfbfbf" />
                  </Pressable>

                  {/* Message content */}
                  <View className="ml-3 flex-1">
                    <Text className="text-[12px] font-semibold text-slate-800" numberOfLines={1}>
                      {item.sender_name || 'Thành viên'}
                    </Text>
                    <View className="mt-0.5 flex-row items-center">
                      <Feather name={preview.icon} size={12} color="#9a7a5c" />
                      <Text className="ml-1 text-[12px] text-slate-500" numberOfLines={1}>
                        {preview.detail}
                      </Text>
                    </View>
                  </View>

                  {/* Delete button */}
                  <Pressable
                    onPress={() => handleDeletePin(item.msg_id || item._id || '')}
                    className="ml-2 rounded-full bg-red-50 p-2"
                  >
                    <Feather name="minus" size={18} color="#dc2626" />
                  </Pressable>
                </Pressable>
                );
              }}
            />

            {/* Footer buttons */}
            <View className="flex-row gap-2 border-t border-slate-200 px-4 py-3">
              <Pressable
                onPress={() => setIsEditingPins(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white py-3"
              >
                <Text className="text-center text-[14px] font-semibold text-slate-700">
                  Hủy
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmEdit}
                className="flex-1 rounded-lg bg-[#b78457] py-3"
              >
                <Text className="text-center text-[14px] font-semibold text-white">
                  Xong
                </Text>
              </Pressable>
            </View>
          </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};
