import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { ChatApi } from '@/services/api';

interface UseNicknameEditorProps {
  conversationId: string | undefined;
  userIdForChat: string | undefined;
  onLoadInfo: () => Promise<void>;
}

export function useNicknameEditor({
  conversationId,
  userIdForChat,
  onLoadInfo,
}: UseNicknameEditorProps) {
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameTargetId, setNicknameTargetId] = useState<string | null>(null);

  const openNicknameEditor = useCallback((memberUserId: string, currentName?: string) => {
    setNicknameTargetId(memberUserId);
    setNicknameInput(currentName || '');
    setNicknameModalVisible(true);
  }, []);

  const submitNickname = useCallback(async () => {
    if (!conversationId || !userIdForChat || !nicknameTargetId) return;
    try {
      await ChatApi.updateMemberNickname(
        conversationId,
        nicknameTargetId,
        userIdForChat,
        nicknameInput.trim(),
      );
      setNicknameModalVisible(false);
      setNicknameTargetId(null);
      setNicknameInput('');
      await onLoadInfo();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật biệt danh');
    }
  }, [conversationId, nicknameTargetId, userIdForChat, nicknameInput, onLoadInfo]);

  return {
    nicknameModalVisible,
    setNicknameModalVisible,
    nicknameInput,
    setNicknameInput,
    nicknameTargetId,
    setNicknameTargetId,
    openNicknameEditor,
    submitNickname,
  };
}
