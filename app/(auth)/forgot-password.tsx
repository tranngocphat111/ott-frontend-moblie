import OtpInput from '@/components/auth/OtpInput';
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
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import PhoneInput from '@/components/auth/PhoneInput';
import EmailInput from '@/components/auth/EmailInput';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const {
    requestOtp,
    verifyOtp,
    resendOtp,
    isLoading,
    errors,
    otpSent,
    countdown,
  } = useForgotPassword();

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRequestOtp = async () => {
    await requestOtp(phone, email);   // ← truyền thêm email
  };

  const handleVerifyOtp = async () => {
    await verifyOtp(phone, email, otp, newPassword, confirmPassword); // ← truyền thêm email
  };

  const handleResendOtp = async () => {
    await resendOtp(phone, email);   // ← truyền thêm email
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      <TouchableOpacity
        onPress={() => router.back()}
        className="px-6 pt-4"
      >
        <Feather name="arrow-left" size={28} color="#374151" />
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
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                Quên mật khẩu
              </Text>
              <Text className="text-base text-gray-600">
                {otpSent
                  ? 'Nhập mã OTP và mật khẩu mới'
                  : 'Nhập số điện thoại & email đã đăng ký'}
              </Text>
            </View>

            {/* Step 1: Nhập phone + email */}
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
              /* Thông tin đã gửi OTP (masked) */
              <View className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <Text className="text-sm text-blue-700 mb-1">
                  <Text className="font-medium">Số điện thoại:</Text>{' '}
                  {phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}
                </Text>
                <Text className="text-sm text-blue-700">
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
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-red-800 text-sm">{errors.general}</Text>
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