import { useState } from 'react';
import { accountApi } from '@/services/api';
import type {
  SetPasswordRequest,
  ChangePasswordRequest,
  ChangeEmailRequest,
  ChangePhoneRequest,
  DeleteAccountRequest,
} from '@/types';
import { useAuth } from '../contexts/Authcontext';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/messageMapping';

export const useAccount = () => {
  const { refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // 1. Thiết lập mật khẩu lần đầu (cho tk Google/OTP chưa có pass)
  const setPassword = async (data: SetPasswordRequest) => {
    setIsLoading(true);
    try {
      const response = await accountApi.setPassword(data);
      if (response.result) {
        await refreshUser();
        showToast('Thiết lập mật khẩu thành công!', 'success', 'Thành công');
      }
      return response.result;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi thiết lập');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Đổi mật khẩu đang sử dụng
  const changePassword = async (data: ChangePasswordRequest) => {
    setIsLoading(true);
    try {
      const response = await accountApi.changePassword(data);
      if (response.result) {
        showToast(
          'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
          'success',
          'Thành công'
        );
        setTimeout(async () => {
          await logout();
        }, 1500);
      }
      return response.result;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi đổi mật khẩu');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Thay đổi Email (sau khi đã verify OTP)
  const changeEmail = async (data: ChangeEmailRequest) => {
    setIsLoading(true);
    try {
      const response = await accountApi.changeEmail(data);
      if (response.result) {
        await refreshUser();
        showToast('Cập nhật email thành công', 'success', 'Thành công');
      }
      return response.result;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi cập nhật email');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Thay đổi số điện thoại (sau khi đã verify OTP)
  const changePhone = async (data: ChangePhoneRequest) => {
    setIsLoading(true);
    try {
      const response = await accountApi.changePhone(data);
      if (response.result) {
        await refreshUser();
        showToast('Cập nhật số điện thoại thành công', 'success', 'Thành công');
      }
      return response.result;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi cập nhật số điện thoại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Xóa tài khoản vĩnh viễn
  const deleteAccount = async (data: DeleteAccountRequest) => {
    setIsLoading(true);
    try {
      const response = await accountApi.deleteAccount(data);
      if (response.result) {
        showToast(
          'Tài khoản đã được xóa thành công. Tạm biệt bạn!',
          'success',
          'Thành công'
        );
        setTimeout(async () => {
          await logout();
        }, 2000);
      }
      return response.result;
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi xóa tài khoản');
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
};