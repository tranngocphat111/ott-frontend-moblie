// hooks/profile/useSetPassword.ts
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { accountApi } from '@/services/api/account.api';

interface SetPasswordErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export const useSetPassword = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<SetPasswordErrors>({});

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Vui lòng nhập mật khẩu';
    if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
    return undefined;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) return 'Vui lòng xác nhận mật khẩu';
    if (password !== confirmPassword) return 'Mật khẩu không khớp';
    return undefined;
  };

  const setPassword = async (password: string, confirmPassword: string): Promise<boolean> => {
    setIsLoading(true);
    setErrors({});

    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

    if (passwordError || confirmPasswordError) {
      setErrors({
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      setIsLoading(false);
      return false;
    }

    try {
      const response = await accountApi.setPassword({
        password,
        confirmPassword,
      });

      if (response.code === 1000) {
        Alert.alert(
          'Thành công',
          'Đã thiết lập mật khẩu thành công',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
        return true;
      } else {
        setErrors({ general: response.message || 'Thiết lập mật khẩu thất bại' });
        return false;
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Đã xảy ra lỗi' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    setPassword,
    isLoading,
    errors,
  };
};