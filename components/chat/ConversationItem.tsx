import React from 'react';
import { Animated, Image, Pressable, Text, View } from 'react-native';
import { Easing } from 'react-native';
import type { ChatConversationWithParticipant } from '@/types';
import {
  formatConversationTime,
  getConversationAvatar,
  getConversationTitle,
  getMessageBodyText,
  isSystemMessageType,
} from '@/utils/chat';
import { THEME_COLORS } from '@/constants/theme';
import { Pin } from 'lucide-react-native';
import type { ChatCategory } from '@/services/api/chat';

interface ConversationItemProps {
  item: ChatConversationWithParticipant;
  currentUserId?: string;
  category?: ChatCategory | null;
  onPress: () => void;
  onLongPressConversation: (payload: {
    conversationId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  isContextActive?: boolean;
}

const getInitials = (value: string) => {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  return tokens.slice(0, 2).map((token) => token[0]).join('').toUpperCase() || '?';
};

export const ConversationItem: React.FC<ConversationItemProps> = ({
  item,
  currentUserId,
  category,
  onPress,
  onLongPressConversation,
  isContextActive = false,
}) => {
  const rowRef = React.useRef<View>(null);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const liftAnim = React.useRef(new Animated.Value(0)).current;
  
  const { conversation, participant } = item;
  const title = getConversationTitle(conversation, currentUserId);
  const avatar = getConversationAvatar(conversation, currentUserId);
  const unreadCount = participant.unread_count || 0;
  const isPinned = !!participant.settings?.is_pinned;
  const isOnline = conversation.participants?.some(
    (member) => member.status === 'online' && String(member.user_id || '') !== String(currentUserId || ''),
  );
  const previewText = conversation.last_message
    ? getMessageBodyText({
        _id: conversation.last_message.msg_id,
        msg_id: conversation.last_message.msg_id,
        content: [{ type: conversation.last_message.type, text: conversation.last_message.content }],
        type: conversation.last_message.type,
        created_at: conversation.last_message.createdAt,
        sender_id: conversation.last_message.sender_id,
        sender_name: conversation.last_message.sender_name,
      })
    : 'Bắt đầu cuộc trò chuyện';
  const isSystemLastMessage = isSystemMessageType(conversation.last_message?.type);

React.useEffect(() => {
    if (isContextActive) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: 150, // Thời gian lún xuống khi mở menu
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(liftAnim, {
          toValue: -2,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Trạng thái bình thường (Khi đóng Context Menu)
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1, // Trả về đúng 1, không dùng spring nên sẽ không bị lố (overshoot)
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(liftAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isContextActive, liftAnim, scaleAnim]);

  // Hiệu ứng lún xuống ngay khi ngón tay vừa chạm vào
  const handlePressIn = () => {
    if (!isContextActive) {
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 100, // Tốc độ phản hồi cực nhanh khi vừa chạm tay
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  };

  // Trả lại kích thước cũ khi nhả tay (mà không bị nảy lò xo)
  const handlePressOut = () => {
    if (!isContextActive) {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150, // Trả về mượt mà
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLongPress = () => {
    rowRef.current?.measureInWindow((x, y, width, height) => {
      onLongPressConversation({
        conversationId: String(conversation._id || ''),
        x,
        y,
        width,
        height,
      });
    });
  };

  return (
    <Animated.View
      ref={rowRef}
      style={{
        transform: [{ translateY: liftAnim }, { scale: scaleAnim }],
        zIndex: isContextActive ? 40 : 1,
        elevation: isContextActive ? 18 : 0,
        position: 'relative',
      }}
    >
      <Pressable
        onPress={onPress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}     // Thêm handlePressIn
        onPressOut={handlePressOut}   // Thêm handlePressOut
        delayLongPress={260}
        className="border-b border-slate-100 bg-white px-4 py-3.5"
      >
        <View className="flex-row items-center">
          <View className="relative mr-3">
            {avatar ? (
              <Image source={{ uri: avatar }} className="h-14 w-14 rounded-full bg-slate-100" />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-200">
                <Text className="text-base font-bold text-slate-600">
                  {getInitials(title)}
                </Text>
              </View>
            )}

            {isOnline && (
              <View className="absolute bottom-0 right-0 h-4 w-4 items-center justify-center rounded-full bg-white">
                <View className="h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </View>
            )}
          </View>

          <View className="flex-1">
            <View className="mb-1 flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-[16px] font-semibold text-slate-900" numberOfLines={1}>
                {title}
              </Text>
              <View className="flex-row items-center gap-2">
                {isPinned && <Pin size={13} color={THEME_COLORS.primary[600]} />}
                <Text className="text-xs font-medium text-slate-400">
                  {formatConversationTime(conversation.last_message?.createdAt)}
                </Text>
              </View>
            </View>

            {category && (
              <View className="mb-1 flex-row items-center">
                <View
                  className="mr-2 h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: category.color || THEME_COLORS.neutral.slate400 }}
                />
                <Text className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {category.name}
                </Text>
              </View>
            )}

            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-[13px] leading-5 text-slate-500" numberOfLines={1}>
                {!isSystemLastMessage && conversation.last_message?.sender_id === String(currentUserId || '')
                  ? `Bạn: ${previewText}`
                  : previewText}
              </Text>

              {unreadCount > 0 && (
                <View className="min-w-[22px] rounded-full bg-brand-600 px-2 py-1">
                  <Text className="text-center text-[11px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};