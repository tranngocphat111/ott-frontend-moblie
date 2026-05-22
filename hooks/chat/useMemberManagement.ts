import { useCallback } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';

interface UseMemberManagementProps {
  conversationId: string | undefined;
  userIdForChat: string | undefined;
  isAdmin: boolean;
  isOwner: boolean;
  isGroup: boolean | undefined;
  onLoadInfo: () => Promise<void>;
  onOpenMemberOptions?: (payload: {
    member: any;
    options: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }>;
  }) => void;
}

export function useMemberManagement({
  conversationId,
  userIdForChat,
  isAdmin,
  isOwner,
  isGroup,
  onLoadInfo,
  onOpenMemberOptions,
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
        const targetIsOwner = member?.roles === 'owner' || String(memberUserId) === String(member?.conversation?.created_by || member?.created_by /* depends on how owner is determined, usually handled by caller or we can assume if they are owner they won't be kicked */);

        if (isOwner) {
          const nextRole = member?.roles === 'admin' ? 'user' : 'admin';
          options.push({
            text: nextRole === 'admin' ? 'Đặt làm phó nhóm' : 'Gỡ quyền phó nhóm',
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
            text: 'Nhường chức trưởng nhóm',
            onPress: () => {
              Alert.alert(
                'Nhường chức trưởng nhóm',
                `Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho thành viên này không?`,
                [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Đồng ý',
                    onPress: async () => {
                      if (!conversationId || !userIdForChat) return;
                      try {
                        await ChatApi.transferOwnership(conversationId, userIdForChat, memberUserId);
                        await onLoadInfo();
                      } catch (error: any) {
                        Alert.alert('Lỗi', error?.response?.data?.error || 'Không thể chuyển quyền');
                      }
                    },
                  },
                ]
              );
            },
          });
        }

        // Phó nhóm (admin) không được xóa Trưởng nhóm (owner), và không được xóa Phó nhóm khác (nếu cần thiết, nhưng theo yêu cầu chỉ phó nhóm đc đuổi người khác thì có thể hiểu phó nhóm đuổi user, trưởng nhóm đuổi được phó nhóm).
        // For simplicity: admin can kick unless the target is owner, or target is admin and current user is not owner.
        const targetIsAdmin = member?.roles === 'admin';
        if (isOwner || !targetIsAdmin) {
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
      }

      options.push({ text: 'Hủy', style: 'cancel' });
      onOpenMemberOptions?.({ member, options });
      return options;
    },
    [conversationId, userIdForChat, isAdmin, isOwner, onLoadInfo, onOpenMemberOptions],
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
      
      if (isOwner) {
        Alert.alert(
          'Lưu ý',
          'Trưởng nhóm không thể rời nhóm. Vui lòng nhường chức trưởng nhóm cho thành viên khác trước khi rời.',
          [{ text: 'Đóng', style: 'cancel' }]
        );
        return;
      }

      Alert.alert('Rời nhóm', 'Bạn chắc chắn muốn rời nhóm này?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: onConfirm,
        },
      ]);
    },
    [conversationId, userIdForChat, isGroup, isOwner],
  );

  return {
    handleMemberPress,
    handleAddMember,
    handleLeaveGroup,
  };
}
