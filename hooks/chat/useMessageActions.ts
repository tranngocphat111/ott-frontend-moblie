import { useCallback } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';
import type { ChatMessage } from '@/types/entities/chat';

interface UseMessageActionsProps {
  conversationId: string | undefined;
  userIdForChat: string | undefined;
  onLoadConversation: () => Promise<void>;
}

export function useMessageActions({
  conversationId,
  userIdForChat,
  onLoadConversation,
}: UseMessageActionsProps) {
  const handleSendMessage = useCallback(
    async (messageText: string, replyToMessage: ChatMessage | null) => {
      if (!conversationId || !userIdForChat) return false;

      const trimmed = messageText.trim();
      if (!trimmed) return false;

      const isLink = /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);

      try {
        await ChatApi.sendMessage({
          conversationId,
          senderId: userIdForChat,
          content: trimmed,
          type: isLink ? 'link' : 'text',
          replyToMsgId: replyToMessage?.msg_id,
        });

        await onLoadConversation();
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
        return false;
      }
    },
    [conversationId, userIdForChat, onLoadConversation],
  );

  const handleMessageAction = useCallback(
    (message: ChatMessage) => {
      const isMine = String(message.sender_id) === String(userIdForChat || '');
      const items: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
        { text: 'Trả lời', onPress: () => ({}) }, // Placeholder - will be handled in component
      ];

      if (message.msg_id) {
        const isPinned = !!message.is_pinned;
        items.push({
          text: isPinned ? 'Bỏ ghim' : 'Ghim',
          onPress: async () => {
            if (!userIdForChat || !conversationId || !message.msg_id) return;
            try {
              await ChatApi.pinMessage(conversationId, message.msg_id, userIdForChat, !isPinned);
              await onLoadConversation();
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Không thể ghim tin nhắn';
              if (/toi da 3|tối đa 3|gioi han 3|giới hạn 3/i.test(errorMessage)) {
                return;
              }

              console.error('Failed to toggle pin:', error);
              Alert.alert('Lỗi', errorMessage);
            }
          },
        });
      }

      if (isMine && message.msg_id) {
        items.push({
          text: 'Thu hồi',
          style: 'destructive',
          onPress: async () => {
            if (!userIdForChat || !conversationId || !message.msg_id) return;
            try {
              await ChatApi.revokeMessage(conversationId, message.msg_id, userIdForChat);
              await onLoadConversation();
            } catch (error) {
              console.error('Failed to revoke message:', error);
              Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
            }
          },
        });
      }

      if (message.msg_id) {
        items.push({
          text: 'Xóa ở phía bạn',
          style: 'destructive',
          onPress: async () => {
            if (!userIdForChat || !conversationId || !message.msg_id) return;
            try {
              await ChatApi.deleteMessage(conversationId, message.msg_id, userIdForChat);
              await onLoadConversation();
            } catch (error) {
              console.error('Failed to delete message:', error);
              Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
            }
          },
        });
      }

      items.push({ text: 'Hủy', style: 'cancel' });

      Alert.alert('Tùy chọn tin nhắn', '', items);
    },
    [conversationId, userIdForChat, onLoadConversation],
  );

  return {
    handleSendMessage,
    handleMessageAction,
  };
}
