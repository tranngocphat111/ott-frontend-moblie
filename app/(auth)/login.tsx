import GoogleIcon from '@/components/auth/GoogleIcon';
import LoginOptionButton from '@/components/auth/LoginOptionButton';
import TextInputField from '@/components/auth/TextInputField';
import TwoFactorStep from '@/components/auth/TwoFactorStep';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useGoogleLogin } from '@/hooks/auth/useGoogleLogin';
import { useLogin } from '@/hooks/auth/useLogin';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const { login, verify2FA, request2FAOtp, isLoading, errors } = useLogin();
  const { loginWithGoogle, isLoading: googleLoading, error: googleError } = useGoogleLogin();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async () => {
    const result = await login(identifier, password);
    if (result?.requires2FA && result?.tempToken) {
      setTempToken(result.tempToken);
      setRequires2FA(true);
      startCountdown();
    }
  };

  const handleVerify2FA = async (isBackupCode: boolean) => {
    await verify2FA(tempToken, otp, isBackupCode);
  };

  const handleResend2FA = async () => {
    await request2FAOtp(identifier);
    setOtp('');
    startCountdown();
  };

  const handleBack2FA = () => {
    setRequires2FA(false);
    setTempToken('');
    setOtp('');
  };

  if (requires2FA) {
    return (
      <TwoFactorStep
        otp={otp}
        onChangeOtp={setOtp}
        onVerify={handleVerify2FA}
        onResend={handleResend2FA}
        onBack={handleBack2FA}
        countdown={countdown}
        isLoading={isLoading}
        error={errors.general}
      />
    );
  }

  const anyLoading = isLoading || googleLoading;

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />

      <TouchableOpacity onPress={() => router.back()} className="px-6 pt-4">
        <Feather name="x" size={28} color="#694d31" />
      </TouchableOpacity>

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
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-white rounded-3xl justify-center items-center mb-3 border border-brand-200 shadow-soft overflow-hidden">
                <Image source={require('../../assets/logo_tach_nen.jpg')} className="w-16 h-16" resizeMode="contain" />
              </View>
              <Text className="text-2xl font-bold text-brand-900">Đăng nhập</Text>
              <Text className="text-sm text-brand-600 mt-1">Nhập thông tin để tiếp tục</Text>
            </View>

            <TextInputField
              label="Số điện thoại hoặc Email"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="0123 456 789 hoặc email@example.com"
              error={errors.identifier}
              icon="user"
              required
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInputField
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              placeholder="Nhập mật khẩu"
              error={errors.password}
              icon="lock"
              required
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() => router.push('../(auth)/forgot-password')}
              className="self-end mb-6"
            >
              <Text className="text-brand-600 text-sm font-medium">Quên mật khẩu?</Text>
            </TouchableOpacity>

            {(errors.general || googleError) && (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <Text className="text-red-700 text-sm">{errors.general || googleError}</Text>
              </View>
            )}

            <PrimaryButton
              title="Đăng nhập"
              onPress={handleLogin}
              loading={isLoading}
              disabled={!identifier || !password || anyLoading}
            />

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-brand-200" />
              <Text className="mx-4 text-brand-500 text-sm">Hoặc đăng nhập bằng</Text>
              <View className="flex-1 h-px bg-brand-200" />
            </View>

            <View className="gap-3">
              <LoginOptionButton
                icon="hash"
                label="Mã OTP"
                onPress={() => router.push('../(auth)/login-otp')}
                disabled={anyLoading}
              />
              <LoginOptionButton
                label={googleLoading ? 'Đang mở Google...' : 'Tiếp tục với Google'}
                onPress={loginWithGoogle}
                customIcon={googleLoading ? undefined : <GoogleIcon size={18} />}
                icon={googleLoading ? 'loader' : undefined}
                disabled={anyLoading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="px-6 pb-6 pt-4 border-t border-brand-100 bg-white/80">
        <View className="flex-row justify-center items-center">
          <Text className="text-brand-600 text-sm">Chưa có tài khoản? </Text>
          <TouchableOpacity
            onPress={() => router.push('../(auth)/register')}
            disabled={anyLoading}
          >
            <Text className="text-brand-700 text-sm font-semibold">Đăng ký</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
