// hooks/profile/useSessions.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { sessionApi } from '@/services/api/session.api';
import type { UserSession } from '@/types';

export function useSessions() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);

    try {
      const response = await sessionApi.getUserSessions();

      if (response.success && response.data) {
        setSessions(response.data.sessions);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải danh sách phiên đăng nhập');
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await sessionApi.revokeSession(sessionId);

      if (response.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        Alert.alert('Thành công', 'Đã đăng xuất phiên');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể đăng xuất phiên này');
    }
  };

  const revokeAllOthers = async () => {
    try {
      const response = await sessionApi.revokeAllOtherSessions();

      if (response.success) {
        await fetchSessions();
        Alert.alert('Thành công', 'Đã đăng xuất tất cả phiên khác');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể đăng xuất các phiên khác');
    }
  };

  return {
    sessions,
    isLoading,
    fetchSessions,
    revokeSession,
    revokeAllOthers,
  };
}