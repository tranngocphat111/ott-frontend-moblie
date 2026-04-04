// app/(main)/profile/change-phone.tsx
import PhoneInput from '@/components/auth/EmailInput';
import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useChangePhone } from '@/hooks/profile/useChangePhone';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ChangePhoneScreen() {
  const router = useRouter();
  const { requestOtp, verifyOtp, resendOtp, isLoading, errors, otpSent, countdown } = useChangePhone();

  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');

  const handleRequestOtp = async () => {
    await requestOtp(newPhone);
  };

  const handleVerifyOtp = async () => {
    await verifyOtp(newPhone, otp);
  };

  const handleResendOtp = async () => {
    await resendOtp(newPhone);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          Đổi số điện thoại
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6 pt-6 pb-6">
            <PhoneInput
              value={newPhone}
              onChangeText={setNewPhone}
              error={errors.phone}
              editable={!otpSent}
              onClear={() => setNewPhone('')}
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
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-red-800 text-sm">{errors.general}</Text>
              </View>
            )}

            <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <Text className="text-yellow-800 text-sm">
                ⚠️ Sau khi đổi số điện thoại, bạn sẽ cần sử dụng số mới để đăng nhập
              </Text>
            </View>

            {!otpSent ? (
              <PrimaryButton
                title="Gửi OTP"
                onPress={handleRequestOtp}
                loading={isLoading}
                disabled={!newPhone || isLoading}
              />
            ) : (
              <PrimaryButton
                title="Xác nhận"
                onPress={handleVerifyOtp}
                loading={isLoading}
                disabled={!otp || otp.length !== 6 || isLoading}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}