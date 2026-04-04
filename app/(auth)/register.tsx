// app/(auth)/register.tsx
import React, { useState } from 'react';
import { View, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import RegisterStepOne from '@/components/auth/register/RegisterStepOne';
import RegisterStepTwo from '@/components/auth/register/RegisterStepTwo';
import { useRegister } from '@/hooks/auth/useRegister';

export default function RegisterScreen() {
  const router = useRouter();
  const { isLoading, errors, countdown, requestOtp, resendOtp, register } = useRegister();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 field
  const [otp, setOtp] = useState('');

  const handleNextStep = async () => {
    const success = await requestOtp(phone, email, fullName, password, confirmPassword);
    if (success) setStep(2);
  };

  const handleBackStep = () => {
    setStep(1);
    setOtp('');
  };

  const handleSubmit = async () => {
    await register({ phone, email, fullName, password, confirmPassword, otp });
  };

  const handleResendOtp = async () => {
    await resendOtp(phone, email, fullName, password, confirmPassword);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Close button — chỉ hiện ở step 1 */}
      {step === 1 && (
        <View className="px-6 pt-4">
          <TouchableOpacity onPress={() => router.back()} className="self-start">
            <Feather name="x" size={26} color="#374151" />
          </TouchableOpacity>
        </View>
      )}

      {step === 1 ? (
        <RegisterStepOne
          phone={phone}
          email={email}
          fullName={fullName}
          password={password}
          confirmPassword={confirmPassword}
          onPhoneChange={setPhone}
          onEmailChange={setEmail}
          onFullNameChange={setFullName}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onNext={handleNextStep}
          isLoading={isLoading}
          errors={errors}
        />
      ) : (
        <RegisterStepTwo
          phone={phone}
          email={email}
          fullName={fullName}
          otp={otp}
          onOtpChange={setOtp}
          onBack={handleBackStep}
          onSubmit={handleSubmit}
          onResendOtp={handleResendOtp}
          isLoading={isLoading}
          countdown={countdown}
          errors={errors}
        />
      )}

      {/* Footer */}
      <View className="px-6 pb-6 border-t border-gray-100 pt-4">
        <View className="flex-row justify-center items-center">
          <Text className="text-gray-500 text-sm">Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-blue-600 text-sm font-semibold">Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}