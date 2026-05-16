import EmailInput from '@/components/auth/EmailInput';
import OtpInput from '@/components/auth/OtpInput';
import PhoneInput from '@/components/auth/PhoneInput';
import TextInputField from '@/components/auth/TextInputField';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useForgotPassword } from '@/hooks/auth/useForgotPassword';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STEP_TITLES = {
  request: { title: 'Quên mật khẩu', subtitle: 'Nhập số điện thoại và email đã đăng ký' },
  verify:  { title: 'Xác thực OTP',  subtitle: 'Nhập mã OTP đã được gửi đến email của bạn' },
  reset:   { title: 'Mật khẩu mới',  subtitle: 'Nhập mật khẩu mới cho tài khoản của bạn' },
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { step, isLoading, errors, countdown, requestPasswordReset, verifyOtp, resetPassword, resendOtp } =
    useForgotPassword();

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { title, subtitle } = STEP_TITLES[step];

  // Step indicator
  const steps = ['request', 'verify', 'reset'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />

      <TouchableOpacity onPress={() => router.back()} className="px-6 pt-4">
        <Feather name="arrow-left" size={28} color="#694d31" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View className="px-6 pt-8 pb-6">

            {/* Step indicator */}
            <View className="flex-row items-center mb-8">
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  <View
                    className={`w-8 h-8 rounded-full justify-center items-center ${
                      i <= currentStepIndex ? 'bg-brand-600' : 'bg-brand-200'
                    }`}
                  >
                    {i < currentStepIndex ? (
                      <Feather name="check" size={14} color="white" />
                    ) : (
                      <Text className="text-white text-xs font-bold">{i + 1}</Text>
                    )}
                  </View>
                  {i < steps.length - 1 && (
                    <View className={`flex-1 h-0.5 mx-1 ${i < currentStepIndex ? 'bg-brand-600' : 'bg-brand-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </View>

            {/* Title */}
            <View className="mb-6">
              <Text className="text-3xl font-bold text-brand-900 mb-2">{title}</Text>
              <Text className="text-base text-brand-600">{subtitle}</Text>
            </View>

            {/* ── Bước 1: Nhập SĐT + Email ── */}
            {step === 'request' && (
              <>
                <PhoneInput
                  value={phone}
                  onChangeText={setPhone}
                  error={errors.phone}
                  onClear={() => setPhone('')}
                />
                <EmailInput
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                  onClear={() => setEmail('')}
                />
              </>
            )}

            {/* ── Bước 2: Xác thực OTP ── */}
            {step === 'verify' && (
              <>
                {/* Thông tin đã nhập */}
                <View className="mb-4 p-4 bg-white border border-brand-100 rounded-2xl">
                  <View className="flex-row items-center mb-1">
                    <Feather name="phone" size={13} color="#bc9166" />
                    <Text className="text-sm text-brand-700 ml-2">
                      {phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Feather name="mail" size={13} color="#bc9166" />
                    <Text className="text-sm text-brand-700 ml-2">
                      {email.replace(/(.{2}).*(@.*)/, '$1***$2')}
                    </Text>
                  </View>
                </View>

                <OtpInput
                  value={otp}
                  onChangeText={setOtp}
                  error={errors.otp}
                  countdown={countdown}
                  onResend={() => resendOtp(phone, email)}
                />
              </>
            )}

            {/* ── Bước 3: Đặt mật khẩu mới ── */}
            {step === 'reset' && (
              <>
                <TextInputField
                  label="Mật khẩu mới"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                  error={errors.password}
                  icon="lock"
                  required
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
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
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                />
              </>
            )}

            {/* General error */}
            {errors.general && (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <Text className="text-red-700 text-sm">{errors.general}</Text>
              </View>
            )}

            {/* CTA button */}
            <PrimaryButton
              title={
                step === 'request' ? 'Gửi mã OTP' :
                step === 'verify'  ? 'Xác nhận OTP' :
                                     'Đặt lại mật khẩu'
              }
              onPress={() => {
                if (step === 'request') requestPasswordReset(phone, email);
                else if (step === 'verify') verifyOtp(phone, email, otp);
                else resetPassword(phone, email, otp, newPassword, confirmPassword);
              }}
              loading={isLoading}
              disabled={
                isLoading ||
                (step === 'request' && (!phone || !email)) ||
                (step === 'verify'  && otp.length !== 6) ||
                (step === 'reset'   && (!newPassword || !confirmPassword))
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
