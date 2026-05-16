// app/(auth)/login-otp.tsx
import EmailInput from '@/components/auth/EmailInput';
import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useOtpLogin } from '@/hooks/auth/useOtpLogin';
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

export default function LoginOtpScreen() {
  const router = useRouter();
  const { requestOtp, verifyOtp, resendOtp, isLoading, errors, otpSent, countdown } =
    useOtpLogin();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const handleRequestOtp = async () => {
    await requestOtp(email);
  };

  const handleVerifyOtp = async () => {
    await verifyOtp(email, otp);
  };

  const handleResendOtp = async () => {
    await resendOtp(email);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />

      <TouchableOpacity onPress={() => router.back()} className="px-6 pt-4">
        <Feather name="arrow-left" size={28} color="#694d31" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View className="px-6 pt-8 pb-6">
            <View className="mb-8">
              <Text className="text-3xl font-bold text-brand-900 mb-2">Đăng nhập OTP</Text>
              <Text className="text-base text-brand-600">
                {otpSent ? 'Nhập mã OTP đã gửi đến email của bạn' : 'Nhập email để nhận mã OTP'}
              </Text>
            </View>

            <EmailInput
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              editable={!otpSent}
              onClear={() => setEmail('')}
            />

            {otpSent && (
              <OtpInput
                value={otp}
                onChangeText={setOtp}
                error={errors.otp}
                countdown={countdown}
                onResend={handleResendOtp}
              />
            )}

            {errors.general && (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <Text className="text-red-700 text-sm">{errors.general}</Text>
              </View>
            )}

            {!otpSent ? (
              <PrimaryButton
                title="Gửi OTP"
                onPress={handleRequestOtp}
                loading={isLoading}
                disabled={!email || isLoading}
              />
            ) : (
              <PrimaryButton
                title="Xác thực"
                onPress={handleVerifyOtp}
                loading={isLoading}
                disabled={otp.length !== 6 || isLoading}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
