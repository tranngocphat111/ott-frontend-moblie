// hooks/profile/useChangePassword.ts
import { useState } from 'react';
import { accountApi } from '@/services/api/account.api';
import { useAuth } from '@/contexts/Authcontext'; // import thêm

interface ChangePasswordErrors {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export function useChangePassword() {
  const { logout } = useAuth(); // thêm dòng này
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});

  const changePassword = async (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<boolean> => {
    const newErrors: ChangePasswordErrors = {};
    if (!oldPassword) newErrors.oldPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (!newPassword || newPassword.length < 8) newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Mật khẩu không khớp';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await accountApi.changePassword({
        oldPassword,
        newPassword,
      });

      if (response.result) {
        await logout(); // logout thay vì router.back()
        return true;
      }

      setErrors({ general: response.message || 'Đổi mật khẩu thất bại' });
      return false;
    } catch (error: any) {
      setErrors({ general: error?.message || 'Đã xảy ra lỗi' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    changePassword,
    isLoading,
    errors,
  };
}