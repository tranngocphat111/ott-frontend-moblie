import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TwoFactorStepProps {
  otp: string;
  onChangeOtp: (value: string) => void;
  onVerify: (isBackupCode: boolean) => void;
  onResend: () => void;
  onBack: () => void;
  countdown: number;
  isLoading: boolean;
  error?: string;
  
}

export default function TwoFactorStep({
  otp,
  onChangeOtp,
  onVerify,
  onResend,
  onBack,
  countdown,
  isLoading,
  error,
}: TwoFactorStepProps) {
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleToggleMode = () => {
    setUseBackupCode(prev => !prev);
    onChangeOtp(''); // reset otp khi đổi mode
  };

  const isValid = useBackupCode ? otp.length === 8 : otp.length === 6;

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <View className="flex-row items-center px-6 pt-4 pb-2">
        <TouchableOpacity onPress={onBack} className="mr-3">
          <Feather name="arrow-left" size={24} color="#694d31" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">Xác thực 2 bước</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View className="px-6 pt-6 pb-6">

            {/* Icon + title */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-brand-100 rounded-full justify-center items-center border border-brand-200">
                <Feather name="shield" size={40} color="#8b6642" />
              </View>
              <Text className="text-base font-semibold text-brand-900 mt-4">
                {useBackupCode ? 'Mã dự phòng' : 'Nhập mã xác thực'}
              </Text>
              <Text className="text-sm text-brand-600 mt-1 text-center">
                {useBackupCode
                  ? 'Nhập một trong các mã dự phòng của bạn'
                  : 'Mã OTP đã được gửi đến email của bạn'}
              </Text>
            </View>

            {/* Input */}
            {useBackupCode ? (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-brand-700 mb-2">
                  Mã dự phòng (8 ký tự)
                </Text>
                <TextInput
                  value={otp}
                  onChangeText={v => onChangeOtp(v.replace(/\D/g, '').slice(0, 8))}
                  keyboardType="numeric"
                  maxLength={8}
                  placeholder="· · · · · · · ·"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  importantForAutofill="yes"
                  returnKeyType="done"
                  underlineColorAndroid="transparent"
                  className="border border-brand-200 rounded-2xl bg-white text-center text-2xl font-bold tracking-widest text-brand-900 py-4"
                  style={{
                    fontFamily: 'monospace',
                    letterSpacing: 8,
                    paddingVertical: 0,
                    minHeight: 58,
                    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
                  }}
                />
              </View>
            ) : (
              <OtpInput
                value={otp}
                onChangeText={onChangeOtp}
                error={error}
                countdown={countdown}
                onResend={onResend}
              />
            )}

            {/* Error */}
            {error && (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <Text className="text-red-700 text-sm">{error}</Text>
              </View>
            )}

            <PrimaryButton
              title={useBackupCode ? 'Xác nhận mã dự phòng' : 'Xác thực'}
              onPress={() => onVerify(useBackupCode)}
              loading={isLoading}
              disabled={!isValid || isLoading}
            />

            {/* Gửi lại OTP — chỉ hiện khi dùng OTP */}
            {!useBackupCode && (
              <View className="flex-row justify-end mt-3">
                <TouchableOpacity onPress={onResend} disabled={countdown > 0 || isLoading}>
                  <Text className={`text-sm font-medium ${countdown > 0 ? 'text-brand-300' : 'text-brand-600'}`}>
                    {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Toggle backup / OTP */}
            <View className="mt-5 pt-4 border-t border-brand-100 items-center">
              <TouchableOpacity onPress={handleToggleMode}>
                <Text className="text-sm text-brand-500 underline">
                  {useBackupCode ? 'Dùng mã OTP thay thế' : 'Dùng mã dự phòng thay thế'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
