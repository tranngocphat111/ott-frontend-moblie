import OtpInput from '@/components/auth/OtpInput';
import TextInputField from '@/components/auth/TextInputField';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useAuth } from '@/contexts/Authcontext';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accountApi } from '@/services/api/account.api';
import { getErrorMessage } from '@/utils/messageMapping';

type Step = 'phone' | 'otp';

export default function LinkPhoneScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCountdown = (seconds = 60) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCountdown(seconds);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestOtp = async () => {
    setPhoneError('');
    if (!phone.trim()) {
      setPhoneError('Vui lòng nhập số điện thoại');
      return;
    }

    setIsLoading(true);
    try {
      await accountApi.requestChangePhone({ newPhone: phone });
      setStep('otp');
      startCountdown(60);
    } catch (err: unknown) {
      setPhoneError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    if (otp.length !== 6) {
      setOtpError('Vui lòng nhập mã OTP 6 số');
      return;
    }

    setIsLoading(true);
    try {
      await accountApi.changePhone({ newPhone: phone, otp });
      await refreshUser();
      Alert.alert('Thành công', 'Liên kết số điện thoại thành công!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      setOtpError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    try {
      await accountApi.requestChangePhone({ newPhone: phone });
      startCountdown(60);
      setOtp('');
    } catch (err: unknown) {
      Alert.alert('Lỗi', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-brand-200 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#694d31" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">Liên kết số điện thoại</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="px-6 pt-8 pb-6">

            {/* Step indicator */}
            <View className="flex-row items-center mb-8">
              {['phone', 'otp'].map((s, i) => (
                <React.Fragment key={s}>
                  <View className={`w-8 h-8 rounded-full justify-center items-center ${i <= ['phone', 'otp'].indexOf(step) ? 'bg-brand-600' : 'bg-brand-200'}`}>
                    {i < ['phone', 'otp'].indexOf(step) ? (
                      <Feather name="check" size={14} color="white" />
                    ) : (
                      <Text className="text-white text-xs font-bold">{i + 1}</Text>
                    )}
                  </View>
                  {i < 1 && (
                    <View className={`flex-1 h-0.5 mx-1 ${i < ['phone', 'otp'].indexOf(step) ? 'bg-brand-600' : 'bg-brand-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </View>

            {/* Bước 1: Nhập SĐT */}
            {step === 'phone' && (
              <>
                <Text className="text-2xl font-bold text-brand-900 mb-2">Nhập số điện thoại</Text>
                <Text className="text-sm text-brand-600 mb-6">
                  Nhập số điện thoại bạn muốn liên kết với tài khoản
                </Text>

                <TextInputField
                  label="Số điện thoại"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Nhập số điện thoại"
                  error={phoneError}
                  icon="phone"
                  keyboardType="phone-pad"
                />

                <PrimaryButton
                  title={isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                  onPress={handleRequestOtp}
                  loading={isLoading}
                  disabled={!phone || isLoading}
                />
              </>
            )}

            {/* Bước 2: Xác thực OTP */}
            {step === 'otp' && (
              <>
                <Text className="text-2xl font-bold text-brand-900 mb-2">Xác thực OTP</Text>
                <Text className="text-sm text-brand-600 mb-2">
                  Mã OTP đã được gửi đến số
                </Text>

                {/* Số điện thoại đã nhập */}
                <View className="flex-row items-center bg-white border border-brand-100 rounded-xl px-4 py-3 mb-6">
                  <Feather name="phone" size={14} color="#bc9166" />
                  <Text className="text-sm text-brand-700 ml-2 font-medium">
                    {phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}
                  </Text>
                  <TouchableOpacity onPress={() => setStep('phone')} className="ml-auto">
                    <Text className="text-xs text-brand-500 underline">Thay đổi</Text>
                  </TouchableOpacity>
                </View>

                <OtpInput
                  value={otp}
                  onChangeText={setOtp}
                  error={otpError}
                  countdown={countdown}
                  onResend={handleResend}
                />

                <PrimaryButton
                  title={isLoading ? 'Đang xác thực...' : 'Xác nhận'}
                  onPress={handleVerifyOtp}
                  loading={isLoading}
                  disabled={otp.length !== 6 || isLoading}
                />
              </>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}