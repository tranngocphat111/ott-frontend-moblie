// app/(auth)/setup-phone.tsx
import PhoneInput from '@/components/auth/PhoneInput';
import PrimaryButton from '@/components/common/PrimaryButton';
import { useAuth } from '@/contexts/Authcontext';
import { authApi } from '@/services/api/auth.api';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SetupPhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setTokens } = useAuth();
  const tempToken = params.tempToken as string;

  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const validatePhone = (phone: string): string | undefined => {
    if (!phone) return 'Vui lòng nhập số điện thoại';
    if (!/^(0|\+84)[0-9]{9,10}$/.test(phone)) {
      return 'Số điện thoại không hợp lệ';
    }
    return undefined;
  };

  const handleSubmit = async () => {
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const response = await authApi.completeGoogleRegistration({
        tempToken,
        phone,
      });

      if (response.code === 1000 && response.result) {
        const { token, refreshToken } = response.result;

        if (token && refreshToken) {
          await setTokens(token, refreshToken);
          Alert.alert(
            'Hoàn tất',
            'Thiết lập số điện thoại thành công!',
            [
              {
                text: 'OK',
                onPress: () => router.replace('../(main)/(tabs)/home'),
              },
            ]
          );
        }
      } else {
        setError(response.message || 'Thiết lập số điện thoại thất bại');
      }
    } catch (error: any) {
      setError(error.message || 'Đã xảy ra lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50" edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

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
            {/* Icon */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-blue-100 rounded-full justify-center items-center mb-4">
                <Feather name="phone" size={40} color="#0084ff" />
              </View>
              <Text className="text-3xl font-bold text-brand-900 mb-2 text-center">
                Thiết lập số điện thoại
              </Text>
              <Text className="text-base text-gray-600 text-center">
                Vui lòng nhập số điện thoại để hoàn tất đăng ký
              </Text>
            </View>

            {/* Phone Input */}
            <PhoneInput
              value={phone}
              onChangeText={setPhone}
              error={error}
              onClear={() => setPhone('')}
            />

            {/* Info */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <Text className="text-blue-800 text-sm">
                💡 Số điện thoại sẽ được sử dụng để đăng nhập và khôi phục tài khoản
              </Text>
            </View>

            {/* Submit Button */}
            <PrimaryButton
              title="Hoàn tất"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!phone || isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
