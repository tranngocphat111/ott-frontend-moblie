// app/(main)/profile/two-factor.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useTwoFactor } from '@/hooks/profile/useTwoFactor';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TwoFactorScreen() {
  const router = useRouter();
  const {
    isEnabled,
    isLoading,
    checkStatus,
    requestEnable,
    enable,
    requestDisable,
    disable,
    countdown,
  } = useTwoFactor();

  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [action, setAction] = useState<'enable' | 'disable'>('enable');

  useEffect(() => {
    checkStatus();
  }, []);

  const handleToggle = async (value: boolean) => {
    if (value) {
      // Enable 2FA
      setAction('enable');
      const success = await requestEnable();
      if (success) {
        setShowOtpInput(true);
      }
    } else {
      // Disable 2FA
      setAction('disable');
      const success = await requestDisable();
      if (success) {
        setShowOtpInput(true);
      }
    }
  };

  const handleConfirmOtp = async () => {
    if (action === 'enable') {
      await enable(otp);
    } else {
      await disable(otp);
    }
    setOtp('');
    setShowOtpInput(false);
  };

  const handleCancelOtp = () => {
    setOtp('');
    setShowOtpInput(false);
  };

  const handleResend = async () => {
    if (action === 'enable') {
      await requestEnable();
    } else {
      await requestDisable();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-brand-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0084ff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />
      
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-brand-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-brand-900">
          Xác thực 2 bước
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-6">
          {/* Status Card */}
          <View className="bg-gray-50 rounded-xl p-4 mb-6">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className={`w-12 h-12 rounded-full ${isEnabled ? 'bg-green-100' : 'bg-gray-200'} justify-center items-center`}>
                  <Feather
                    name="shield"
                    size={24}
                    color={isEnabled ? '#22c55e' : '#9ca3af'}
                  />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-base font-semibold text-brand-900 mb-1">
                    {isEnabled ? 'Đã bật' : 'Đã tắt'}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {isEnabled 
                      ? 'Tài khoản được bảo vệ bằng 2FA'
                      : 'Tài khoản chưa có bảo vệ 2FA'}
                  </Text>
                </View>
              </View>
              
              <Switch
                value={isEnabled}
                onValueChange={handleToggle}
                disabled={showOtpInput}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* OTP Input */}
          {showOtpInput && (
            <View className="mb-6">
              <OtpInput
                value={otp}
                onChangeText={setOtp}
                countdown={countdown}
                onResend={handleResend}
              />

              <View className="flex-row space-x-3 mt-4">
                <View className="flex-1">
                  <PrimaryButton
                    title="Hủy"
                    onPress={handleCancelOtp}
                    variant="outline"
                  />
                </View>
                <View className="flex-1">
                  <PrimaryButton
                    title="Xác nhận"
                    onPress={handleConfirmOtp}
                    disabled={otp.length !== 6}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Info */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <View className="flex-row items-start">
              <Feather name="info" size={20} color="#3b82f6" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-900 font-semibold mb-2">
                  Xác thực 2 bước là gì?
                </Text>
                <Text className="text-blue-800 text-sm">
                  Xác thực 2 bước thêm một lớp bảo mật cho tài khoản của bạn. Khi bật tính năng này, bạn sẽ cần nhập mã OTP mỗi khi đăng nhập.
                </Text>
              </View>
            </View>
          </View>

          {/* Benefits */}
          <View className="mb-4">
            <Text className="text-base font-semibold text-brand-900 mb-3">
              Lợi ích:
            </Text>
            
            {[
              'Bảo vệ tài khoản khỏi truy cập trái phép',
              'Nhận thông báo khi có đăng nhập lạ',
              'Tăng cường bảo mật dữ liệu cá nhân',
            ].map((benefit, index) => (
              <View key={index} className="flex-row items-start mb-2">
                <Feather name="check-circle" size={16} color="#22c55e" />
                <Text className="text-gray-700 text-sm ml-2 flex-1">
                  {benefit}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}