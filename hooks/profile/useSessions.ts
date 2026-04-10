import { useAuth } from '@/contexts/Authcontext';
import { sessionApi } from '@/services/api/session.api';
import type { SessionInfo } from '@/types';
import { useState } from 'react';
import { Alert } from 'react-native';

export function useSessions() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await sessionApi.getUserSessions();
      if (response.result) {                          
        setSessions(response.result.sessions);       
        setTotal(response.result.total);             
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
      if (response.result !== undefined || response.code === 200) { 
        Alert.alert('Thành công', 'Đã đăng xuất thiết bị thành công');
        await fetchSessions();
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể đăng xuất phiên này');
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      const response = await sessionApi.revokeAllOtherSessions();
      if (response.result !== undefined || response.code === 200) {
        Alert.alert('Thành công', 'Đã đăng xuất các thiết bị khác thành công');
        await fetchSessions();
      }
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể đăng xuất các phiên khác');
    }
  };

  const revokeAllSessions = async () => {
    try {
      await sessionApi.revokeAllSessions();
      await logout();
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể đăng xuất');
    }
  };

  return {
    sessions,
    total,
    isLoading,
    fetchSessions,
    revokeSession,
    revokeAllOtherSessions,
    revokeAllSessions,
  };
}