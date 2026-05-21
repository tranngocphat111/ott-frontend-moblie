import { sessionApi } from '@/services/api/session.api';
import type { SessionInfo } from '@/types';
import { useState } from 'react';
import { Alert } from 'react-native';

export function useSessions() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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

  return {
    sessions,
    total,
    isLoading,
    fetchSessions,
  };
}
