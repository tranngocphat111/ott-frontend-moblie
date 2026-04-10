import OtpInput from '@/components/auth/OtpInput';
import TextInputField from '@/components/auth/TextInputField';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useAuth } from '@/contexts/Authcontext';
import { useDeleteAccount } from '@/hooks/profile/useDeleteAccount';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    step, isLoading, errors, countdown,
    password, setPassword,
    confirmText, setConfirmText,
    otp, setOtp,
    requestOtp, resendOtp, deleteAccount,
    goToConfirm, backToWarning, backToConfirm,
  } = useDeleteAccount();

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />

      <View className="flex-row items-center px-6 py-4 border-b border-brand-200">
        <TouchableOpacity
          onPress={step === 'warning' ? () => router.back() : step === 'confirm' ? backToWarning : backToConfirm}
          className="mr-3"
        >
          <Feather name="arrow-left" size={24} color="#694d31" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">Xóa tài khoản</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-6 pb-6">

            {/* Icon */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-red-100 rounded-full justify-center items-center">
                <Feather name="alert-triangle" size={40} color="#ef4444" />
              </View>
            </View>

            {/* Step indicators */}
            <View className="flex-row justify-center gap-2 mb-6">
              {(['warning', 'confirm', 'otp'] as const).map((s, i) => (
                <View key={s} style={{
                  height: 4, borderRadius: 99,
                  width: s === step ? 24 : 12,
                  backgroundColor: ['warning', 'confirm', 'otp'].indexOf(step) >= i ? '#ef4444' : '#fca5a5',
                }} />
              ))}
            </View>

            {/* ── Warning step ── */}
            {step === 'warning' && (
              <>
                <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                  <Text className="text-red-900 font-semibold mb-2">Dữ liệu sẽ bị mất vĩnh viễn:</Text>
                  {['Thông tin cá nhân và hồ sơ', 'Lịch sử hoạt động', 'Dữ liệu và nội dung đã lưu', 'Tất cả các kết nối và liên kết'].map(item => (
                    <Text key={item} className="text-red-800 text-sm">• {item}</Text>
                  ))}
                </View>

                <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                  <Text className="text-amber-900 font-semibold mb-2">Lưu ý quan trọng:</Text>
                  {['Tài khoản sẽ bị xóa vĩnh viễn và không thể khôi phục', 'Bạn có thể tạo tài khoản mới với cùng số điện thoại / email', 'Mọi dữ liệu sẽ bị mất hoàn toàn'].map(item => (
                    <Text key={item} className="text-amber-800 text-sm">• {item}</Text>
                  ))}
                </View>

                <PrimaryButton title="Tôi hiểu và muốn tiếp tục" onPress={goToConfirm} variant="danger" />
                <TouchableOpacity onPress={() => router.back()} className="mt-3 py-3">
                  <Text className="text-center text-brand-600 font-medium">Hủy</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Confirm step ── */}
            {step === 'confirm' && (
              <>
                <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                  <Text className="text-red-800 text-sm">
                    Để xác nhận, vui lòng nhập chính xác:{' '}
                    <Text className="font-bold font-mono">DELETE</Text>
                  </Text>
                </View>

                <TextInputField
                  label="Nhập cụm từ xác nhận"
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="Nhập: DELETE"
                  error={errors.confirmText}
                  icon="type"
                  autoCapitalize="characters"
                />

                {user?.hasPassword && (
                  <TextInputField
                    label="Mật khẩu hiện tại"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Nhập mật khẩu"
                    error={errors.password}
                    icon="lock"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                )}

                {errors.general && (
                  <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                    <Text className="text-red-700 text-sm">{errors.general}</Text>
                  </View>
                )}

                <PrimaryButton
                  title="Tiếp tục"
                  onPress={requestOtp}
                  loading={isLoading}
                  disabled={confirmText.trim().toUpperCase() !== 'DELETE' || (!!user?.hasPassword && !password.trim()) || isLoading}
                  variant="danger"
                />
                <TouchableOpacity onPress={backToWarning} className="mt-3 py-3">
                  <Text className="text-center text-brand-600 font-medium">Quay lại</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <>
                <OtpInput
                  value={otp}
                  onChangeText={setOtp}
                  error={errors.otp}
                  countdown={countdown}
                  onResend={resendOtp}
                />

                {errors.general && (
                  <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                    <Text className="text-red-700 text-sm">{errors.general}</Text>
                  </View>
                )}

                <PrimaryButton
                  title="Xác nhận xóa tài khoản"
                  onPress={deleteAccount}
                  loading={isLoading}
                  disabled={otp.length !== 6 || isLoading}
                  variant="danger"
                />
                <TouchableOpacity onPress={backToConfirm} className="mt-3 py-3" disabled={isLoading}>
                  <Text className="text-center text-brand-600 font-medium">Quay lại</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}