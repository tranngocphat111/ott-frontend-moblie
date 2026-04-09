// app/(main)/profile/delete-account.tsx
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import TextInputField from '@/components/auth/TextInputField';
import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useDeleteAccount } from '@/hooks/profile/useDeleteAccount';
import { useAuth } from '@/contexts/Authcontext';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { requestOtp, resendOtp, deleteAccount, isLoading, errors, otpSent, countdown } = useDeleteAccount();
  
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleRequestOtp = async () => {
    if (!confirmed) {
      Alert.alert(
        'Xác nhận',
        'Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa tài khoản',
            style: 'destructive',
            onPress: async () => {
              setConfirmed(true);
              await requestOtp();
            },
          },
        ]
      );
    } else {
      await requestOtp();
    }
  };

  const handleDeleteAccount = async () => {
    await deleteAccount(otp, password || undefined);
  };

  const handleResendOtp = async () => {
    await resendOtp();
  };

  // Check if user has password (not Google-only user)
  const hasPassword = user?.accountType !== 'google_only';

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />
      
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-brand-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">
          Xóa tài khoản
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
            {/* Warning Icon */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-red-100 rounded-full justify-center items-center">
                <Feather name="alert-triangle" size={40} color="#ef4444" />
              </View>
            </View>

            {/* Warning */}
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <Text className="text-red-900 font-semibold mb-2">
                ⚠️ Cảnh báo quan trọng
              </Text>
              <Text className="text-red-800 text-sm mb-2">
                Sau khi xóa tài khoản:
              </Text>
              <View className="ml-2">
                <Text className="text-red-800 text-sm mb-1">
                  • Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn
                </Text>
                <Text className="text-red-800 text-sm mb-1">
                  • Bạn sẽ mất tất cả tin nhắn, danh bạ
                </Text>
                <Text className="text-red-800 text-sm mb-1">
                  • Không thể khôi phục tài khoản
                </Text>
                <Text className="text-red-800 text-sm">
                  • Hành động này không thể hoàn tác
                </Text>
              </View>
            </View>

            {!otpSent ? (
              <>
                {/* Info */}
                <View className="bg-gray-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-700 text-sm mb-2">
                    Để xóa tài khoản, bạn cần:
                  </Text>
                  <View className="ml-2">
                    <Text className="text-gray-600 text-sm mb-1">
                      1. Xác nhận quyết định xóa tài khoản
                    </Text>
                    <Text className="text-gray-600 text-sm mb-1">
                      2. Nhận và nhập mã OTP
                    </Text>
                    {hasPassword && (
                      <Text className="text-gray-600 text-sm">
                        3. Nhập mật khẩu để xác thực
                      </Text>
                    )}
                  </View>
                </View>

                <PrimaryButton
                  title="Tiếp tục xóa tài khoản"
                  onPress={handleRequestOtp}
                  loading={isLoading}
                  disabled={isLoading}
                  variant="danger"
                />
              </>
            ) : (
              <>
                <OtpInput
                  value={otp}
                  onChangeText={setOtp}
                  error={errors.otp}
                  countdown={countdown}
                  onResend={handleResendOtp}
                />

                {hasPassword && (
                  <TextInputField
                    label="Mật khẩu"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Nhập mật khẩu để xác thực"
                    error={errors.password}
                    icon="lock"
                    required
                    secureTextEntry
                    autoCapitalize="none"
                  />
                )}

                {errors.general && (
                  <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <Text className="text-red-800 text-sm">{errors.general}</Text>
                  </View>
                )}

                <PrimaryButton
                  title="Xác nhận xóa tài khoản"
                  onPress={handleDeleteAccount}
                  loading={isLoading}
                  disabled={!otp || otp.length !== 6 || (hasPassword && !password) || isLoading}
                  variant="danger"
                />

                <TouchableOpacity
                  onPress={() => router.back()}
                  className="mt-4 py-3"
                  disabled={isLoading}
                >
                  <Text className="text-center text-gray-600 font-medium">
                    Hủy bỏ
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}