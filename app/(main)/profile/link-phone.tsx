// app/(main)/profile/link-phone.tsx
import PhoneInput from '@/components/auth/EmailInput';
import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useLinkPhone } from '@/hooks/profile/useLinkPhone';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function LinkPhoneScreen() {
  const router = useRouter();
  const { requestOtp, resendOtp, linkPhone, isLoading, errors, otpSent, countdown } = useLinkPhone();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const handleRequestOtp = async () => {
    await requestOtp(phone);
  };

  const handleLinkPhone = async () => {
    await linkPhone(phone, otp);
  };

  const handleResendOtp = async () => {
    await resendOtp(phone);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          Liên kết số điện thoại
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
            {/* Info */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <Text className="text-blue-800 text-sm">
                💡 Liên kết số điện thoại để có thể đăng nhập bằng số điện thoại thay vì Google
              </Text>
            </View>

            <PhoneInput
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
              editable={!otpSent}
              onClear={() => setPhone('')}
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

            {!otpSent ? (
              <PrimaryButton
                title="Gửi OTP"
                onPress={handleRequestOtp}
                loading={isLoading}
                disabled={!phone || isLoading}
              />
            ) : (
              <PrimaryButton
                title="Xác nhận"
                onPress={handleLinkPhone}
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