// app/(auth)/forgot-password.tsx
import EmailInput from '@/components/auth/EmailInput';
import OtpInput from '@/components/auth/OtpInput';
import PhoneInput from '@/components/auth/PhoneInput';
import TextInputField from '@/components/auth/TextInputField';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useForgotPassword } from '@/hooks/auth/useForgotPassword';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestOtp, verifyOtp, resendOtp, isLoading, errors, otpSent, countdown } =
    useForgotPassword();

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestOtp = async () => {
    await requestOtp(phone, email);
  };

  const handleVerifyOtp = async () => {
    await verifyOtp(phone, email, otp, newPassword, confirmPassword);
  };

  const handleResendOtp = async () => {
    await resendOtp(phone, email);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />

      <TouchableOpacity onPress={() => router.back()} className="px-6 pt-4">
        <Feather name="arrow-left" size={28} color="#694d31" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-8 pb-6">
            <View className="mb-8">
              <Text className="text-3xl font-bold text-brand-900 mb-2">Quên mật khẩu</Text>
              <Text className="text-base text-brand-600">
                {otpSent ? 'Nhập mã OTP và mật khẩu mới' : 'Nhập số điện thoại và email đã đăng ký'}
              </Text>
            </View>

            {!otpSent ? (
              <>
                <PhoneInput
                  value={phone}
                  onChangeText={setPhone}
                  error={errors.phone}
                  onClear={() => setPhone('')}
                />

                <EmailInput
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                  onClear={() => setEmail('')}
                />
              </>
            ) : (
              <View className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-2xl">
                <Text className="text-sm text-brand-700 mb-1">
                  <Text className="font-medium">Số điện thoại:</Text>{' '}
                  {phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}
                </Text>
                <Text className="text-sm text-brand-700">
                  <Text className="font-medium">Email:</Text>{' '}
                  {email.replace(/(.{2}).*(@.*)/, '$1***$2')}
                </Text>
              </View>
            )}

            {otpSent && (
              <>
                <OtpInput
                  value={otp}
                  onChangeText={setOtp}
                  error={errors.otp}
                  countdown={countdown}
                  onResend={handleResendOtp}
                />

                <TextInputField
                  label="Mật khẩu mới"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                  error={errors.password}
                  icon="lock"
                  required
                  secureTextEntry
                  autoCapitalize="none"
                />

                <TextInputField
                  label="Xác nhận mật khẩu"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  error={errors.confirmPassword}
                  icon="lock"
                  required
                  secureTextEntry
                  autoCapitalize="none"
                />
              </>
            )}

            {errors.general && (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <Text className="text-red-700 text-sm">{errors.general}</Text>
              </View>
            )}

            <PrimaryButton
              title={otpSent ? 'Đặt lại mật khẩu' : 'Gửi mã OTP'}
              onPress={otpSent ? handleVerifyOtp : handleRequestOtp}
              loading={isLoading}
              disabled={
                otpSent
                  ? !otp || !newPassword || !confirmPassword || isLoading
                  : !phone || !email || isLoading
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
