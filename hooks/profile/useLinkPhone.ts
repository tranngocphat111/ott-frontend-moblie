// hooks/profile/useLinkPhone.ts
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { linkingApi } from '@/services/api/linking.api';
import { otpApi } from '@/services/api/otp.api';
import { useAuth } from '@/contexts/Authcontext';

interface LinkPhoneErrors {
  phone?: string;
  otp?: string;
  general?: string;
}

const OTP_EXPIRY_SECONDS = 120;

export const useLinkPhone = () => {
  const router = useRouter();
  const { updateUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LinkPhoneErrors>({});
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const validatePhone = (phone: string): string | undefined => {
    if (!phone) return 'Vui lòng nhập số điện thoại';
    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone)) {
      return 'Số điện thoại không hợp lệ';
    }
    return undefined;
  };

  const startCountdown = () => {
    setCountdown(OTP_EXPIRY_SECONDS);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const requestOtp = async (phone: string): Promise<boolean> => {
    setIsLoading(true);
    setErrors({});

    const phoneError = validatePhone(phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      setIsLoading(false);
      return false;
    }

    try {
      const response = await otpApi.requestLinkPhoneOtp(phone);

      if (response.code === 1000 && response.result) {
        setOtpSent(true);
        startCountdown();
        Alert.alert(
          'Thành công',
          `Mã OTP đã được gửi đến ${response.result.phone}`
        );
        return true;
      } else {
        setErrors({ general: response.message || 'Không thể gửi OTP' });
        return false;
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Đã xảy ra lỗi' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (phone: string): Promise<boolean> => {
    if (countdown > 0) {
      Alert.alert('Thông báo', `Vui lòng đợi ${countdown} giây trước khi gửi lại`);
      return false;
    }
    return await requestOtp(phone);
  };

  const linkPhone = async (phone: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    setErrors({});

    const phoneError = validatePhone(phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      setIsLoading(false);
      return false;
    }

    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Mã OTP phải có 6 chữ số' });
      setIsLoading(false);
      return false;
    }

    try {
      const response = await linkingApi.linkPhone(phone, otp);

      if (response.code === 1000 && response.result) {
        await updateUser(response.result);
        Alert.alert(
          'Thành công',
          'Đã liên kết số điện thoại thành công',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
        return true;
      } else {
        setErrors({ general: response.message || 'Liên kết số điện thoại thất bại' });
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
    requestOtp,
    resendOtp,
    linkPhone,
    isLoading,
    errors,
    otpSent,
    countdown,
  };
};