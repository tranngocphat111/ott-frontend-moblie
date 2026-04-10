// app/(auth)/google-login.tsx
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGoogleLogin } from '@/hooks/auth/useGoogleLogin';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME_COLORS } from '@/constants/theme';

export default function GoogleLoginScreen() {
  const router = useRouter();
  const { loginWithGoogle, isLoading, error } = useGoogleLogin();

  useEffect(() => {
    // Automatically trigger Google login when screen loads
    loginWithGoogle();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style="dark" />
      
      <TouchableOpacity
        onPress={() => router.back()}
        className="px-6 pt-4"
      >
        <Feather name="arrow-left" size={28} color={THEME_COLORS.neutral.gray700} />
      </TouchableOpacity>

      <View className="flex-1 justify-center items-center px-6">
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color={THEME_COLORS.primary[600]} />
            <Text className="text-gray-600 mt-4 text-center">
              Đang đăng nhập bằng Google...
            </Text>
          </>
        ) : error ? (
          <>
            <Feather name="alert-circle" size={64} color={THEME_COLORS.error.border} />
            <Text className="text-xl font-bold text-brand-900 mt-6 mb-2 text-center">
              Đăng nhập thất bại
            </Text>
            <Text className="text-base text-gray-600 text-center mb-8">
              {error}
            </Text>
            <TouchableOpacity
              onPress={loginWithGoogle}
              className="bg-brand-600 rounded-xl py-4 px-8"
            >
              <Text className="text-white font-semibold">Thử lại</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Feather name="globe" size={64} color={THEME_COLORS.primary[600]} />
            <Text className="text-xl font-bold text-brand-900 mt-6 mb-2 text-center">
              Đăng nhập Google
            </Text>
            <Text className="text-base text-gray-600 text-center mb-8">
              Nhấn nút bên dưới để tiếp tục
            </Text>
            <TouchableOpacity
              onPress={loginWithGoogle}
              className="bg-brand-600 rounded-xl py-4 px-8"
            >
              <Text className="text-white font-semibold">Đăng nhập với Google</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
