// app/(main)/profile/link-email.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import TextInputField from '@/components/auth/TextInputField';
import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useLinkEmail } from '@/hooks/profile/useLinkEmail';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LinkEmailScreen() {
  const router = useRouter();
  const { requestOtp, resendOtp, linkEmail, isLoading, errors, otpSent, countdown } = useLinkEmail();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const handleRequestOtp = async () => {
    await requestOtp(email);
  };

  const handleLinkEmail = async () => {
    await linkEmail(email, otp);
  };

  const handleResendOtp = async () => {
    await resendOtp(email);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />
      
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-brand-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">
          Liên kết email
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
                💡 Liên kết email để có thể đăng nhập bằng email và nhận thông báo quan trọng
              </Text>
            </View>

            <TextInputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Nhập địa chỉ email"
              error={errors.email}
              icon="mail"
              required
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!otpSent}
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
                disabled={!email || isLoading}
              />
            ) : (
              <PrimaryButton
                title="Xác nhận"
                onPress={handleLinkEmail}
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