// components/auth/register/RegisterStepTwo.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import OtpInput from '../OtpInput';
import PrimaryButton from '../../common/PrimaryButton';

interface RegisterStepTwoProps {
  phone: string;
  email: string;
  fullName: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onResendOtp: () => void;
  isLoading: boolean;
  countdown: number;
  errors: {
    otp?: string;
    general?: string;
  };
}

export default function RegisterStepTwo({
  phone,
  email,
  fullName,
  otp,
  onOtpChange,
  onBack,
  onSubmit,
  onResendOtp,
  isLoading,
  countdown,
  errors,
}: RegisterStepTwoProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-4 pb-6">

          {/* Back Button */}
          <TouchableOpacity
            onPress={onBack}
            className="flex-row items-center mb-6"
            disabled={isLoading}
          >
            <Feather name="arrow-left" size={20} color="#374151" />
            <Text className="text-gray-700 ml-2 font-medium text-sm">Quay lại</Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-1">
              Xác thực OTP
            </Text>
            <Text className="text-sm text-gray-500">
              Nhập mã OTP đã gửi đến email của bạn
            </Text>
          </View>

          {/* Step Indicator */}
          <View className="flex-row items-center mb-8">
            <View className="w-8 h-8 rounded-full bg-green-500 justify-center items-center">
              <Feather name="check" size={14} color="#fff" />
            </View>
            <View className="flex-1 h-0.5 bg-blue-600 mx-2" />
            <View className="w-8 h-8 rounded-full bg-blue-600 justify-center items-center">
              <Text className="text-white font-bold text-sm">2</Text>
            </View>
          </View>

          {/* Info Summary */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <Text className="text-xs text-blue-600 mb-2">Mã OTP đã gửi đến</Text>
            <View className="flex-row items-center mb-1.5">
              <Feather name="user" size={13} color="#3b82f6" />
              <Text className="text-blue-800 text-sm font-medium ml-2">{fullName}</Text>
            </View>
            <View className="flex-row items-center mb-1.5">
              <Feather name="phone" size={13} color="#3b82f6" />
              <Text className="text-blue-800 text-sm ml-2">
                {phone.replace(/(\d{3})\d+(\d{3})/, '$1****$2')}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Feather name="mail" size={13} color="#3b82f6" />
              <Text className="text-blue-800 text-sm ml-2">
                {email.replace(/(.{3}).*(@.*)/, '$1***$2')}
              </Text>
            </View>
          </View>

          {/* General Error */}
          {errors.general && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4">
              <Text className="text-red-600 text-sm">{errors.general}</Text>
            </View>
          )}

          {/* OTP Input */}
          <OtpInput
            value={otp}
            onChangeText={onOtpChange}
            error={errors.otp}
            countdown={countdown}
            onResend={onResendOtp}
          />

          {/* Submit */}
          <PrimaryButton
            title={isLoading ? 'Đang xử lý...' : 'Hoàn tất đăng ký'}
            onPress={onSubmit}
            loading={isLoading}
            disabled={!otp || otp.length !== 6 || isLoading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}