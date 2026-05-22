import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import TextInputField from '@/components/auth/TextInputField';
import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useChangeEmail } from '@/hooks/profile/useChangeEmail';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangeEmailScreen() {
  const router = useRouter();
  const { requestOtp, verifyOtp, resendOtp, isLoading, errors, otpSent, countdown } = useChangeEmail();
  
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');

  const handleRequestOtp = async () => {
    await requestOtp(newEmail);
  };

  const handleVerifyOtp = async () => {
    await verifyOtp(newEmail, otp);
  };

  const handleResendOtp = async () => {
    await resendOtp(newEmail);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />
      
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-brand-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">
          Đổi email
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
            <TextInputField
              label="Email mới"
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Nhập email mới"
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

            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <Text className="text-blue-800 text-sm">
                💡 Mã OTP sẽ được gửi đến email mới của bạn
              </Text>
            </View>

            {!otpSent ? (
              <PrimaryButton
                title="Gửi OTP"
                onPress={handleRequestOtp}
                loading={isLoading}
                disabled={!newEmail || isLoading}
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