// components/auth/register/RegisterStepOne.tsx
import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
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
          <View className="mb-6">
            <Text className="text-2xl font-bold text-brand-900 mb-1">Tạo tài khoản</Text>
            <Text className="text-sm text-brand-600">Điền đầy đủ thông tin để đăng ký</Text>
          </View>

          <View className="flex-row items-center mb-8">
            <View className="w-8 h-8 rounded-full bg-brand-600 justify-center items-center">
              <Text className="text-white font-bold text-sm">1</Text>
            </View>
            <View className="flex-1 h-0.5 bg-brand-200 mx-2" />
            <View className="w-8 h-8 rounded-full bg-brand-100 justify-center items-center">
              <Text className="text-brand-400 font-bold text-sm">2</Text>
            </View>
          </View>

          {errors.general && (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-4">
              <Text className="text-red-700 text-sm">{errors.general}</Text>
            </View>
          )}

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

          <PhoneInput
            value={phone}
            onChangeText={onPhoneChange}
            error={errors.phone}
            onClear={() => onPhoneChange('')}
          />

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

          {(password.length > 0 || confirmPassword.length > 0) && (
            <View className="bg-brand-50 border border-brand-200 rounded-2xl p-3.5 mb-4">
              <View className="flex-row items-center mb-1.5">
                <Feather
                  name={passwordLongEnough ? 'check-circle' : 'circle'}
                  size={13}
                  color={passwordLongEnough ? '#16a34a' : '#bc9166'}
                />
                <Text className="text-brand-700 text-xs ml-2">Ít nhất 8 ký tự</Text>
              </View>
              <View className="flex-row items-center">
                <Feather
                  name={passwordsMatch ? 'check-circle' : 'circle'}
                  size={13}
                  color={passwordsMatch ? '#16a34a' : '#bc9166'}
                />
                <Text className="text-brand-700 text-xs ml-2">Mật khẩu khớp nhau</Text>
              </View>
            </View>
          )}

          <View className="bg-brand-50 border border-brand-200 rounded-2xl p-3.5 mb-6">
            <Text className="text-brand-700 text-xs">
              <Text className="font-semibold">Lưu ý:</Text> Mã OTP sẽ được gửi đến email của bạn để xác thực tài khoản.
            </Text>
          </View>

          <PrimaryButton
            title={isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
            onPress={onNext}
            loading={isLoading}
            disabled={
              !phone ||
              !email ||
              !fullName ||
              !password ||
              !confirmPassword ||
              isLoading
            }
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
