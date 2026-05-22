import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'react-native';

interface SocialLoginProps {
  onGoogleLogin: () => void;
}

export const SocialLogin: React.FC<SocialLoginProps> = ({ onGoogleLogin }) => {
  return (
    <View className="w-full px-6 mt-8">
      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-4 text-gray-500">Hoặc đăng nhập với</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      <TouchableOpacity
        onPress={onGoogleLogin}
        className="flex-row items-center justify-center bg-white border-2 border-gray-200 rounded-xl py-3 px-4"
      >
        <View className="w-6 h-6 mr-3">
          <Text className="text-xl">🔵</Text>
        </View>
        <Text className="text-gray-700 font-semibold">Đăng nhập với Google</Text>
      </TouchableOpacity>
    </View>
  );
};
