import { useCallback } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';

interface UseConversationSettingsProps {
  conversationId: string | undefined;
  userIdForChat: string | undefined;
  onLoadInfo: () => Promise<void>;
  onNavigateBack: () => void;
}

export function useConversationSettings({
  conversationId,
  userIdForChat,
  onLoadInfo,
  onNavigateBack,
}: UseConversationSettingsProps) {
  const handleTogglePinConversation = useCallback(async (isPinned: boolean | undefined) => {
    if (!conversationId || !userIdForChat) return;
    try {
      await ChatApi.updatePinStatus(
        conversationId,
        userIdForChat,
        !isPinned,
      );
      await onLoadInfo();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể thay đổi trạng thái ghim hội thoại');
    }
  }, [conversationId, userIdForChat, onLoadInfo]);

  const handleSelectCategory = useCallback(async (categoryId?: string | null) => {
    if (!conversationId || !userIdForChat) return;
    try {
      await ChatApi.updateConversationCategory(conversationId, userIdForChat, categoryId ?? null);
      await onLoadInfo();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật phân loại hội thoại');
    }
  }, [conversationId, userIdForChat, onLoadInfo]);

  const handleDeleteConversation = useCallback(() => {
    if (!conversationId || !userIdForChat) return;
    Alert.alert('Xóa hội thoại', 'Bạn chỉ xóa ở phía bạn. Tiếp tục?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await ChatApi.deleteConversationForMe(conversationId, userIdForChat);
            onNavigateBack();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa hội thoại');
          }
        },
      },
    ]);
  }, [conversationId, userIdForChat, onNavigateBack]);

  const handleChangeNotificationStatus = useCallback(async (status: 'on' | 'mute' | 'off') => {
    if (!conversationId || !userIdForChat) return;
    try {
      await ChatApi.updateNotificationStatus(conversationId, userIdForChat, status, null);
      await onLoadInfo();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái thông báo');
    }
  }, [conversationId, userIdForChat, onLoadInfo]);

  return {
    handleTogglePinConversation,
    handleSelectCategory,
    handleDeleteConversation,
    handleChangeNotificationStatus,
  };
}
