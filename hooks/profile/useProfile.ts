// hooks/profile/useProfile.ts
import { useState } from 'react';
import { profileApi } from '@/services/api/profile.api';
import { useAuth } from '@/contexts/Authcontext';
import type { UpdateProfileRequest } from '@/types';

interface ProfileErrors {
  fullName?: string;
  bio?: string;
  general?: string;
}

export function useProfile() {
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});

  const updateProfile = async (data: UpdateProfileRequest): Promise<boolean> => {
    if (!data.fullName || data.fullName.trim().length < 2) {
      setErrors({ fullName: 'Họ tên phải có ít nhất 2 ký tự' });
      return false;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await profileApi.updateProfile(data);

      if (response.result) {
        // Cập nhật user trong AuthContext ngay lập tức
        await refreshUser();
        return true; // edit.tsx sẽ tự gọi router.back()
      }

      setErrors({ general: response.message || 'Cập nhật thất bại' });
      return false;
    } catch (error: any) {
      setErrors({ general: error?.message || 'Đã xảy ra lỗi' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateProfile,
    isLoading,
    errors,
  };
}