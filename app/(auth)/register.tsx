import RegisterStepOne from '@/components/auth/register/RegisterStepOne';
import RegisterStepTwo from '@/components/auth/register/RegisterStepTwo';
import { useRegister } from '@/hooks/auth/useRegister';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const router = useRouter();
  const { isLoading, errors, countdown, requestOtp, resendOtp, register } = useRegister();

  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />

      {step === 1 && (
        <View className="px-6 pt-4">
          <TouchableOpacity onPress={() => router.back()} className="self-start">
            <Feather name="x" size={26} color="#694d31" />
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

      <View className="px-6 pb-6 border-t border-brand-100 pt-4 bg-white/80">
        <View className="flex-row justify-center items-center">
          <Text className="text-brand-600 text-sm">Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-brand-700 text-sm font-semibold">Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
