// app/(auth)/google-login.tsx
import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGoogleLogin } from '@/hooks/auth/useGoogleLogin';

export default function GoogleLoginScreen() {
  const router = useRouter();
  const { loginWithGoogle, isLoading, error } = useGoogleLogin();

  useEffect(() => {
    // Automatically trigger Google login when screen loads
    loginWithGoogle();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <TouchableOpacity
        onPress={() => router.back()}
        className="px-6 pt-4"
      >
        <Feather name="arrow-left" size={28} color="#374151" />
      </TouchableOpacity>

      <View className="flex-1 justify-center items-center px-6">
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color="#0084ff" />
            <Text className="text-gray-600 mt-4 text-center">
              Đang đăng nhập bằng Google...
            </Text>
          </>
        ) : error ? (
          <>
            <Feather name="alert-circle" size={64} color="#ef4444" />
            <Text className="text-xl font-bold text-gray-900 mt-6 mb-2 text-center">
              Đăng nhập thất bại
            </Text>
            <Text className="text-base text-gray-600 text-center mb-8">
              {error}
            </Text>
            <TouchableOpacity
              onPress={loginWithGoogle}
              className="bg-blue-600 rounded-xl py-4 px-8"
            >
              <Text className="text-white font-semibold">Thử lại</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Feather name="globe" size={64} color="#0084ff" />
            <Text className="text-xl font-bold text-gray-900 mt-6 mb-2 text-center">
              Đăng nhập Google
            </Text>
            <Text className="text-base text-gray-600 text-center mb-8">
              Nhấn nút bên dưới để tiếp tục
            </Text>
            <TouchableOpacity
              onPress={loginWithGoogle}
              className="bg-blue-600 rounded-xl py-4 px-8"
            >
              <Text className="text-white font-semibold">Đăng nhập với Google</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}