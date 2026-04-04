// components/auth/register/RegisterStepOne.tsx
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import PrimaryButton from '../../common/PrimaryButton';
import PhoneInput from '../PhoneInput';
import TextInputField from '../TextInputField';

interface RegisterStepOneProps {
  phone: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onNext: () => void;
  isLoading: boolean;
  errors: {
    phone?: string;
    email?: string;
    fullName?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  };
}

export default function RegisterStepOne({
  phone,
  email,
  fullName,
  password,
  confirmPassword,
  onPhoneChange,
  onEmailChange,
  onFullNameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onNext,
  isLoading,
  errors,
}: RegisterStepOneProps) {
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordLongEnough = password.length >= 8;

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
        <View className="px-6 pt-8 pb-6">

          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-1">
              Tạo tài khoản
            </Text>
            <Text className="text-sm text-gray-500">
              Điền đầy đủ thông tin để đăng ký
            </Text>
          </View>

          {/* Step Indicator */}
          <View className="flex-row items-center mb-8">
            <View className="w-8 h-8 rounded-full bg-blue-600 justify-center items-center">
              <Text className="text-white font-bold text-sm">1</Text>
            </View>
            <View className="flex-1 h-0.5 bg-gray-200 mx-2" />
            <View className="w-8 h-8 rounded-full bg-gray-200 justify-center items-center">
              <Text className="text-gray-400 font-bold text-sm">2</Text>
            </View>
          </View>

          {/* General Error */}
          {errors.general && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-4">
              <Text className="text-red-600 text-sm">{errors.general}</Text>
            </View>
          )}

          {/* Full Name */}
          <TextInputField
            label="Họ và tên"
            value={fullName}
            onChangeText={onFullNameChange}
            placeholder="Nguyễn Văn A"
            error={errors.fullName}
            icon="user"
            required
            autoCapitalize="words"
          />

          {/* Phone */}
          <PhoneInput
            value={phone}
            onChangeText={onPhoneChange}
            error={errors.phone}
            onClear={() => onPhoneChange('')}
          />

          {/* Email */}
          <TextInputField
            label="Email"
            value={email}
            onChangeText={onEmailChange}
            placeholder="email@example.com"
            error={errors.email}
            icon="mail"
            required
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Password */}
          <TextInputField
            label="Mật khẩu"
            value={password}
            onChangeText={onPasswordChange}
            placeholder="Tối thiểu 8 ký tự"
            error={errors.password}
            icon="lock"
            required
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Confirm Password */}
          <TextInputField
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChangeText={onConfirmPasswordChange}
            placeholder="Nhập lại mật khẩu"
            error={errors.confirmPassword}
            icon="lock"
            required
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Password checklist */}
          {(password.length > 0 || confirmPassword.length > 0) && (
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-4">
              <View className="flex-row items-center mb-1.5">
                <Feather
                  name={passwordLongEnough ? 'check-circle' : 'circle'}
                  size={13}
                  color={passwordLongEnough ? '#22c55e' : '#9ca3af'}
                />
                <Text className="text-blue-700 text-xs ml-2">Ít nhất 8 ký tự</Text>
              </View>
              <View className="flex-row items-center">
                <Feather
                  name={passwordsMatch ? 'check-circle' : 'circle'}
                  size={13}
                  color={passwordsMatch ? '#22c55e' : '#9ca3af'}
                />
                <Text className="text-blue-700 text-xs ml-2">Mật khẩu khớp nhau</Text>
              </View>
            </View>
          )}

          {/* Info */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-6">
            <Text className="text-blue-700 text-xs">
              <Text className="font-semibold">Lưu ý:</Text> Mã OTP sẽ được gửi đến email của bạn để xác thực tài khoản.
            </Text>
          </View>

          {/* Button */}
          <PrimaryButton
            title={isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
            onPress={onNext}
            loading={isLoading}
            disabled={
              !phone || !email || !fullName ||
              !password || !confirmPassword ||
              isLoading
            }
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}