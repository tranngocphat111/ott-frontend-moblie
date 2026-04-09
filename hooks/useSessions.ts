import { useState, useEffect } from 'react';
import { sessionApi } from '../services/api';
import type { UserSessionsResponse } from '../types';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/messageMapping';
import { useAuth } from '../contexts/AuthContext';

export const useSessions = () => {
  const [sessions, setSessions] = useState<UserSessionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { logout } = useAuth();

  const fetchSessions = async () => {
    setIsLoading(true);

    try {
      const response = await sessionApi.getUserSessions();
      if (response.result) {
        setSessions(response.result);
      }
    } catch (err: unknown) {
      // Đã bật Toast báo lỗi cho hàm fetch
      showToast(getErrorMessage(err), 'error', 'Lỗi tải danh sách thiết bị');
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      await sessionApi.revokeSession(sessionId);
      showToast('Đã đăng xuất thiết bị thành công', 'success');
      await fetchSessions();
      return true;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi đăng xuất thiết bị');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const revokeAllOtherSessions = async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      await sessionApi.revokeAllOtherSessions();
      showToast('Đã đăng xuất các thiết bị khác thành công', 'success');
      await fetchSessions();
      return true;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi đăng xuất thiết bị khác');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const revokeAllSessions = async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      await sessionApi.revokeAllSessions();
      showToast('Đã đăng xuất khỏi tất cả thiết bị', 'success');

      // Xóa toàn bộ token và đẩy user ra trang Login
      await logout();
      return true;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi đăng xuất');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessions,
    isLoading,
    fetchSessions,
    revokeSession,
    revokeAllOtherSessions,
    revokeAllSessions,
  };
};