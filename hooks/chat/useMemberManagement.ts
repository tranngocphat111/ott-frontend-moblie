import { useCallback } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';

interface UseMemberManagementProps {
  conversationId: string | undefined;
  userIdForChat: string | undefined;
  isAdmin: boolean;
  isGroup: boolean | undefined;
  onLoadInfo: () => Promise<void>;
}

export function useMemberManagement({
  conversationId,
  userIdForChat,
  isAdmin,
  isGroup,
  onLoadInfo,
}: UseMemberManagementProps) {
  const handleMemberPress = useCallback(
    (member: any) => {
      const memberUserId = String(member?.user_id || '');
      const isSelf = memberUserId === String(userIdForChat || '');

      const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
        {
          text: 'Đổi biệt danh',
          onPress: () => ({}), // Will be handled by caller
        },
      ];

      if (isAdmin && !isSelf) {
        const nextRole = member?.roles === 'admin' ? 'user' : 'admin';
        options.push({
          text: nextRole === 'admin' ? 'Đặt làm quản trị viên' : 'Gỡ quyền quản trị viên',
          onPress: async () => {
            if (!conversationId || !userIdForChat) return;
            try {
              await ChatApi.updateMemberRole(conversationId, memberUserId, userIdForChat, nextRole);
              await onLoadInfo();
            } catch {
              Alert.alert('Lỗi', 'Không thể cập nhật vai trò');
            }
          },
        });
        options.push({
          text: 'Xóa khỏi nhóm',
          style: 'destructive',
          onPress: async () => {
            if (!conversationId || !userIdForChat) return;
            try {
              await ChatApi.removeMember(conversationId, memberUserId, userIdForChat);
              await onLoadInfo();
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa thành viên');
            }
          },
        });
      }

      options.push({ text: 'Hủy', style: 'cancel' });
      Alert.alert('Tùy chọn thành viên', '', options);
    },
    [conversationId, userIdForChat, isAdmin, onLoadInfo],
  );

  const handleAddMember = useCallback(
    async (newMemberId: string) => {
      if (!conversationId || !userIdForChat) return;
      try {
        await ChatApi.addMembers(conversationId, userIdForChat, [newMemberId]);
        await onLoadInfo();
      } catch {
        Alert.alert('Lỗi', 'Không thể thêm thành viên');
      }
    },
    [conversationId, userIdForChat, onLoadInfo],
  );

  const handleLeaveGroup = useCallback(
    (onConfirm: () => Promise<void>) => {
      if (!conversationId || !userIdForChat || !isGroup) return;
      Alert.alert('Rời nhóm', 'Bạn chắc chắn muốn rời nhóm này?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: onConfirm,
        },
      ]);
    },
    [conversationId, userIdForChat, isGroup],
  );

  return {
    handleMemberPress,
    handleAddMember,
    handleLeaveGroup,
  };
}
