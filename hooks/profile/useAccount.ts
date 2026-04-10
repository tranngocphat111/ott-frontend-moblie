import { useState } from 'react';
import { Alert } from 'react-native';
import { accountApi } from '@/services/api/account.api';
import { useAuth } from '@/contexts/Authcontext';
import { getErrorMessage } from '@/utils/messageMapping';
import type {
  SetPasswordRequest,
  ChangePasswordRequest,
  ChangeEmailRequest,
  ChangePhoneRequest,
  DeleteAccountRequest,
} from '@/types';

export function useAccount() {
  const { refreshUser, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // 1. Thiết lập mật khẩu (user Google chưa có mật khẩu)
  const setPassword = async (data: SetPasswordRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      await accountApi.setPassword(data);
      await refreshUser();
      Alert.alert('Thành công', 'Thiết lập mật khẩu thành công!');
      return true;
    } catch (err: unknown) {
      Alert.alert('Lỗi thiết lập', getErrorMessage(err));
      throw err; // throw để EnableFlow bắt được
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Đổi mật khẩu đang sử dụng
  const changePassword = async (data: ChangePasswordRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await accountApi.changePassword(data);
      if (response.result) {
        Alert.alert(
          'Thành công',
          'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
          [{ text: 'OK', onPress: () => setTimeout(() => logout(), 500) }]
        );
        return true;
      }
      return false;
    } catch (err: unknown) {
      Alert.alert('Lỗi đổi mật khẩu', getErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Thay đổi Email
  const changeEmail = async (data: ChangeEmailRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await accountApi.changeEmail(data);
      if (response.result) {
        await refreshUser();
        Alert.alert('Thành công', 'Cập nhật email thành công');
        return true;
      }
      return false;
    } catch (err: unknown) {
      Alert.alert('Lỗi cập nhật email', getErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Thay đổi số điện thoại
  const changePhone = async (data: ChangePhoneRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await accountApi.changePhone(data);
      if (response.result) {
        await refreshUser();
        Alert.alert('Thành công', 'Cập nhật số điện thoại thành công');
        return true;
      }
      return false;
    } catch (err: unknown) {
      Alert.alert('Lỗi cập nhật số điện thoại', getErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Xóa tài khoản vĩnh viễn
  const deleteAccount = async (data: DeleteAccountRequest): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await accountApi.deleteAccount(data);
      if (response.result) {
        Alert.alert(
          'Tài khoản đã xóa',
          'Tài khoản đã được xóa thành công. Tạm biệt bạn!',
          [{ text: 'OK', onPress: () => setTimeout(() => logout(), 500) }]
        );
        return true;
      }
      return false;
    } catch (err: unknown) {
      Alert.alert('Lỗi xóa tài khoản', getErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    setPassword,
    changePassword,
    changeEmail,
    changePhone,
    deleteAccount,
  };
}