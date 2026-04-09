import { useState } from 'react';
import { profileApi } from '../services/api';
import type { UserProfileResponse, UpdateProfileRequest } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage, ERROR_MESSAGES } from '../utils/messageMapping';

export const useProfile = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const updateProfile = async (data: UpdateProfileRequest): Promise<boolean> => {
    if (data.fullName !== undefined && (data.fullName.trim().length === 0)) {
      showToast(ERROR_MESSAGES[5004] || 'Vui lòng nhập họ và tên', 'warning', 'Thông báo');
      return false;
    }

    if (data.fullName && data.fullName.length > 100) {
      showToast(ERROR_MESSAGES[1303], 'warning', 'Dữ liệu không hợp lệ');
      return false;
    }

    if (data.bio && data.bio.length > 500) {
      showToast(ERROR_MESSAGES[1307], 'warning', 'Tiểu sử quá dài');
      return false;
    }

    setIsLoading(true);
    try {
      const response = await profileApi.updateProfile(data);

      if (response.result) {
        await refreshUser();
        showToast('Cập nhật hồ sơ thành công!', 'success', 'Thành công');
        return true;
      }

      throw new Error('Cập nhật thất bại');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Cập nhật thất bại');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getProfile = async (userId?: string): Promise<UserProfileResponse | null> => {
    setIsLoading(true);
    try {
      const response = userId
        ? await profileApi.getProfile(userId)
        : await profileApi.getCurrentProfile();

      if (response.result) {
        return response.result;
      }
      
      return null;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi tải thông tin');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    updateProfile,
    getProfile,
  };
};