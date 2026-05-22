// app/(main)/profile/set-password.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import TextInputField from '@/components/auth/TextInputField';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useSetPassword } from '@/hooks/profile/useSetPassword';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SetPasswordScreen() {
  const router = useRouter();
  const { setPassword, isLoading, errors } = useSetPassword();
  
  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    await setPassword(password, confirmPassword);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />
      
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-brand-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">
          Thiết lập mật khẩu
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
              <View className="flex-row items-start">
                <Feather name="info" size={20} color="#3b82f6" />
                <Text className="flex-1 text-blue-800 text-sm ml-3">
                  Bạn đang sử dụng tài khoản Google. Thiết lập mật khẩu để có thể đăng nhập bằng số điện thoại hoặc email.
                </Text>
              </View>
            </View>

            <TextInputField
              label="Mật khẩu mới"
              value={password}
              onChangeText={setPasswordValue}
              placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
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
              placeholder="Nhập lại mật khẩu"
              error={errors.confirmPassword}
              icon="lock"
              required
              secureTextEntry
              autoCapitalize="none"
            />

            {errors.general && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-red-800 text-sm">{errors.general}</Text>
              </View>
            )}

            <View className="bg-gray-50 border border-brand-200 rounded-xl p-4 mb-6">
              <Text className="text-gray-700 text-sm font-medium mb-2">
                Yêu cầu mật khẩu:
              </Text>
              <View className="flex-row items-start mb-1">
                <Feather
                  name={password.length >= 8 ? 'check-circle' : 'circle'}
                  size={14}
                  color={password.length >= 8 ? '#22c55e' : '#9ca3af'}
                />
                <Text className="text-gray-600 text-xs ml-2">
                  Ít nhất 8 ký tự
                </Text>
              </View>
              <View className="flex-row items-start">
                <Feather
                  name={password === confirmPassword && password ? 'check-circle' : 'circle'}
                  size={14}
                  color={password === confirmPassword && password ? '#22c55e' : '#9ca3af'}
                />
                <Text className="text-gray-600 text-xs ml-2">
                  Mật khẩu khớp nhau
                </Text>
              </View>
            </View>

            <PrimaryButton
              title="Thiết lập mật khẩu"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!password || !confirmPassword || isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}