import React from 'react';
import { FlatList, Image, Modal, Pressable, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Pin } from 'lucide-react-native';
import { ConversationItem } from '@/components/chat/ConversationItem';
import {
  ConversationContextMenuProvider,
  useConversationContextMenu,
} from '@/contexts/ConversationContextMenuContext';
import { THEME_COLORS } from '@/constants/theme';
import { formatConversationTime, getConversationAvatar, getConversationTitle, getMessageBodyText, isSystemMessageType } from '@/utils/chat';
import type { ChatConversationWithParticipant } from '@/types/entities/chat';
import type { ChatCategory } from '@/services/api/chat';

type HomeConversationListProps = {
  items: ChatConversationWithParticipant[];
  categoryById: Map<string, ChatCategory>;
  currentUserId?: string;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenConversation: (conversationId: string) => void;
  onTogglePinConversation: (item: ChatConversationWithParticipant) => void;
  onToggleMuteConversation: (item: ChatConversationWithParticipant) => void;
  onOpenConversationCategory: (item: ChatConversationWithParticipant) => void;
  onDeleteConversation: (item: ChatConversationWithParticipant) => void;
  actionConversationId?: string | null;
};

export function HomeConversationList({
  items,
  categoryById,
  currentUserId,
  isLoading,
  isRefreshing,
  onRefresh,
  onOpenConversation,
  onTogglePinConversation,
  onToggleMuteConversation,
  onOpenConversationCategory,
  onDeleteConversation,
  actionConversationId,
}: HomeConversationListProps) {
  return (
    <ConversationContextMenuProvider>
      <HomeConversationListBody
        items={items}
        categoryById={categoryById}
        currentUserId={currentUserId}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        onOpenConversation={onOpenConversation}
        onTogglePinConversation={onTogglePinConversation}
        onToggleMuteConversation={onToggleMuteConversation}
        onOpenConversationCategory={onOpenConversationCategory}
        onDeleteConversation={onDeleteConversation}
        actionConversationId={actionConversationId}
      />
    </ConversationContextMenuProvider>
  );
}

function HomeConversationListBody({
  items,
  categoryById,
  currentUserId,
  isLoading,
  isRefreshing,
  onRefresh,
  onOpenConversation,
  onTogglePinConversation,
  onToggleMuteConversation,
  onOpenConversationCategory,
  onDeleteConversation,
  actionConversationId,
}: HomeConversationListProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const containerRef = React.useRef<View>(null);
  const [containerOrigin, setContainerOrigin] = React.useState({ x: 0, y: 0 });
  const [menuHeight, setMenuHeight] = React.useState(220);
  const { activeAnchor, openMenu, closeMenu } = useConversationContextMenu();

  React.useEffect(() => {
    containerRef.current?.measureInWindow((x, y) => {
      setContainerOrigin({ x, y });
    });
  }, []);

  const activeItem = React.useMemo(
    () => items.find((item) => item.conversation._id === activeAnchor?.conversationId) || null,
    [activeAnchor?.conversationId, items],
  );

  const activeIsPinned = !!activeItem?.participant.settings?.is_pinned;
  const activeMuteUntil = activeItem?.participant.settings?.mute_until
    ? new Date(activeItem.participant.settings.mute_until)
    : null;
  const activeIsMuted =
    activeItem?.participant.settings?.notification_status === 'off' ||
    (activeItem?.participant.settings?.notification_status === 'mute' &&
      !!activeMuteUntil &&
      activeMuteUntil > new Date());

  const menuWidth = 258;
  const menuLeftInWindow = Math.min(
    Math.max((activeAnchor?.x || 16) - 16, 12),
    Math.max(windowWidth - menuWidth - 12, 12),
  );
  const anchorTop = activeAnchor?.y || 120;
  const anchorHeight = activeAnchor?.height || 70;
  const anchorBottom = anchorTop + anchorHeight;
  const shouldOpenUpward = anchorTop > windowHeight * 0.55;

  const menuTopInWindow = shouldOpenUpward
    ? Math.max(anchorTop - menuHeight - 6, 12)
    : Math.min(anchorBottom + 8, windowHeight - menuHeight - 12);
  const menuLeft = menuLeftInWindow - containerOrigin.x;
  const menuTop = menuTopInWindow - containerOrigin.y;

  const previewLeft = (activeAnchor?.x || 12) - containerOrigin.x;
  const previewTop = (activeAnchor?.y || 80) - containerOrigin.y;
  const previewWidth = activeAnchor?.width || windowWidth - 24;

  const activeTitle = activeItem ? getConversationTitle(activeItem.conversation, currentUserId) : '';
  const activeAvatar = activeItem ? getConversationAvatar(activeItem.conversation, currentUserId) : '';
  const activePreviewText = activeItem?.conversation.last_message
    ? getMessageBodyText({
        _id: activeItem.conversation.last_message.msg_id,
        msg_id: activeItem.conversation.last_message.msg_id,
        content: [{ type: activeItem.conversation.last_message.type, text: activeItem.conversation.last_message.content }],
        type: activeItem.conversation.last_message.type,
        created_at: activeItem.conversation.last_message.createdAt,
        sender_id: activeItem.conversation.last_message.sender_id,
        sender_name: activeItem.conversation.last_message.sender_name,
      })
    : '';
  const activeIsSystemLastMessage = isSystemMessageType(activeItem?.conversation.last_message?.type);

  const activeInitials = String(activeTitle || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <View ref={containerRef} style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.conversation._id}
        renderItem={({ item }) => (
          <ConversationItem
            item={item}
            currentUserId={currentUserId}
            category={item.participant.settings?.category_id ? categoryById.get(String(item.participant.settings.category_id)) || null : null}
            onPress={() => onOpenConversation(item.conversation._id)}
            onLongPressConversation={openMenu}
            isContextActive={activeAnchor?.conversationId === item.conversation._id}
          />
        )}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={THEME_COLORS.primary[600]} />}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <View className="flex-1 items-center justify-center px-6 py-20">
              <Text className="text-[15px] text-slate-500">Đang tải cuộc trò chuyện...</Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-6 py-20">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <Feather name="message-circle" size={28} color={THEME_COLORS.primary[600]} />
              </View>
              <Text className="text-center text-[17px] font-semibold text-slate-900">Chưa có hội thoại nào</Text>
              <Text className="mt-2 text-center text-[13px] leading-5 text-slate-500">
                Khi có tin nhắn mới, danh sách sẽ xuất hiện ở đây.
              </Text>
            </View>
          )
        }
      />

      <Modal
        visible={!!activeAnchor}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeMenu}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            onPress={closeMenu}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
              zIndex: 1000,
              elevation: 1000,
            }}
          />

          {!!activeItem && (
            <View
              style={{
                position: 'absolute',
                left: activeAnchor?.x || 12,
                top: activeAnchor?.y || 80,
                width: activeAnchor?.width || windowWidth - 24,
                zIndex: 1010,
                transform: [{ scale: 1.02 }],
                borderRadius: 16,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 1010,
                backgroundColor: '#fff',
              }}
            >
              <View className="bg-white px-4 py-3.5">
                <View className="flex-row items-center">
                  {activeAvatar ? (
                    <Image source={{ uri: activeAvatar }} className="mr-3 h-14 w-14 rounded-full bg-slate-100" />
                  ) : (
                    <View className="mr-3 h-14 w-14 items-center justify-center rounded-full bg-slate-200">
                      <Text className="text-base font-bold text-slate-600">{activeInitials}</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <View className="mb-1 flex-row items-center justify-between gap-2">
                      <Text className="flex-1 text-[16px] font-semibold text-slate-900" numberOfLines={1}>{activeTitle}</Text>
                      <Text className="text-xs font-medium text-slate-400">
                        {formatConversationTime(activeItem.conversation.last_message?.createdAt)}
                      </Text>
                    </View>
                    <Text className="text-[13px] leading-5 text-slate-500" numberOfLines={1}>
                      {!activeIsSystemLastMessage && activeItem.conversation.last_message?.sender_id === String(currentUserId || '')
                        ? `Bạn: ${activePreviewText}`
                        : activePreviewText}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View
            style={{
              position: 'absolute',
              left: menuLeftInWindow,
              top: menuTopInWindow,
              width: menuWidth,
              borderRadius: 18,
              backgroundColor: '#FFFFFF',
              zIndex: 1020,
              elevation: 1020,
              paddingVertical: 6,
            }}
            onLayout={(event) => {
              const nextHeight = Math.round(event.nativeEvent.layout.height || 0);
              if (nextHeight > 0 && Math.abs(nextHeight - menuHeight) > 1) {
                setMenuHeight(nextHeight);
              }
            }}
          >
            <Pressable
              disabled={!activeItem || !!actionConversationId}
              onPress={() => {
                if (!activeItem) return;
                closeMenu();
                onTogglePinConversation(activeItem);
              }}
              className="flex-row items-center px-4 py-3"
            >
              <Pin size={18} color={THEME_COLORS.neutral.slate700} />
              <Text className="ml-3 text-[17px] text-slate-800">{activeIsPinned ? 'Bỏ ghim' : 'Ghim'}</Text>
            </Pressable>

            <Pressable
              disabled={!activeItem || !!actionConversationId}
              onPress={() => {
                if (!activeItem) return;
                closeMenu();
                onToggleMuteConversation(activeItem);
              }}
              className="flex-row items-center px-4 py-3"
            >
              <Feather name={activeIsMuted ? 'bell' : 'bell-off'} size={18} color={THEME_COLORS.neutral.slate700} />
              <Text className="ml-3 text-[17px] text-slate-800">{activeIsMuted ? 'Bật thông báo' : 'Tắt thông báo'}</Text>
            </Pressable>

            <Pressable
              disabled={!activeItem || !!actionConversationId}
              onPress={() => {
                if (!activeItem) return;
                closeMenu();
                onOpenConversationCategory(activeItem);
              }}
              className="flex-row items-center px-4 py-3"
            >
              <Feather name="tag" size={18} color={THEME_COLORS.neutral.slate700} />
              <Text className="ml-3 text-[17px] text-slate-800">Phân loại</Text>
            </Pressable>

            <Pressable
              disabled={!activeItem || !!actionConversationId}
              onPress={() => {
                if (!activeItem) return;
                closeMenu();
                onDeleteConversation(activeItem);
              }}
              className="flex-row items-center px-4 py-3"
            >
              <Feather name="trash-2" size={18} color={THEME_COLORS.error.border} />
              <Text className="ml-3 text-[17px] text-red-500">Xóa</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
