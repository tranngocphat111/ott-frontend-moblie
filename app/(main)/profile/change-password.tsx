// app/(main)/profile/change-password.tsx
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import TextInputField from '@/components/auth/TextInputField';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useChangePassword } from '@/hooks/profile/useChangePassword';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { changePassword, isLoading, errors } = useChangePassword();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    await changePassword(oldPassword, newPassword, confirmPassword);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">
          Đổi mật khẩu
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
              label="Mật khẩu hiện tại"
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Nhập mật khẩu hiện tại"
              error={errors.oldPassword}
              icon="lock"
              required
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInputField
              label="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
              error={errors.newPassword}
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

            {errors.general && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-red-800 text-sm">{errors.general}</Text>
              </View>
            )}

            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <Text className="text-blue-800 text-sm font-medium mb-2">
                Yêu cầu mật khẩu:
              </Text>
              <View className="flex-row items-start mb-1">
                <Feather
                  name={newPassword.length >= 8 ? 'check-circle' : 'circle'}
                  size={14}
                  color={newPassword.length >= 8 ? '#22c55e' : '#9ca3af'}
                />
                <Text className="text-blue-700 text-xs ml-2">
                  Ít nhất 8 ký tự
                </Text>
              </View>
              <View className="flex-row items-start">
                <Feather
                  name={newPassword === confirmPassword && newPassword ? 'check-circle' : 'circle'}
                  size={14}
                  color={newPassword === confirmPassword && newPassword ? '#22c55e' : '#9ca3af'}
                />
                <Text className="text-blue-700 text-xs ml-2">
                  Mật khẩu khớp nhau
                </Text>
              </View>
            </View>

            <PrimaryButton
              title="Đổi mật khẩu"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!oldPassword || !newPassword || !confirmPassword || isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}