import { useState } from 'react';
import { userApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { SUCCESS_MESSAGES, getErrorMessage } from '../utils/messageMapping';

type Step = 'form' | 'otp';

type FormData = {
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  otp: string;
};

const INITIAL_FORM: FormData = {
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  otp: '',
};

export const useRegister = () => {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateForm = (): string => {
    const { phone, email, password, confirmPassword, fullName } = formData;
    if (!phone || !email || !password || !fullName) return 'Vui lòng điền đầy đủ thông tin';
    if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp';
    if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
    return '';
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'warning', 'Thiếu thông tin');
      return;
    }

    setLoading(true);
    try {
      await userApi.requestRegisterOtp(
        formData.phone,
        formData.email,
        formData.fullName
      );
      showToast(SUCCESS_MESSAGES.OTP_SENT, 'success', 'Đã gửi');
      setStep('otp');
    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.otp || formData.otp.length !== 6) {
      showToast('Vui lòng nhập đủ mã OTP 6 số', 'warning', 'Chú ý');
      return;
    }

    setLoading(true);
    try {
      await userApi.register({
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        otp: formData.otp,
      });

      showToast(SUCCESS_MESSAGES.REGISTER, 'success', 'Thành công');
      setTimeout(() => (window.location.href = '/login'), 2000);

    } catch (err: unknown) {
      showToast(getErrorMessage(err), 'error', 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep('form');
  };

  return {
    step,
    formData,
    loading,
    handleChange,
    handleRequestOtp,
    handleRegister,
    goBack,
  };
};