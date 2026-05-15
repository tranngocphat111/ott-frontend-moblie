// app/(auth)/landing.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-brand-900">
      <StatusBar style="light" />

      <LinearGradient
        colors={['#8b6642', '#ae7f53', '#dfc0a4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1 px-6">
          <View className="pt-8 items-center">
            <View className="w-24 h-24 rounded-3xl bg-white/20 border border-white/30 items-center justify-center overflow-hidden">
              <Image
                source={require('../../assets/logo_tach_nen.png')}
                className="w-20 h-20"
                resizeMode="contain"
              />
            </View>
            <Text className="text-white text-3xl font-bold mt-5">RIFF</Text>
            <Text className="text-white/90 text-center text-sm mt-1 px-8 leading-5">
              Trò chuyện, gọi thoại và kết nối liền mạch trên mọi thiết bị
            </Text>
          </View>

          <View className="flex-1 justify-center gap-3">
            <FeatureItem icon="message-circle" text="Nhắn tin tức thì, phản hồi siêu nhanh" />
            <FeatureItem icon="shield" text="Bảo mật phiên đăng nhập và xác thực 2 lớp" />
            <FeatureItem icon="smartphone" text="Đồng bộ web và mobile theo thời gian thực" />
          </View>

          <View className="gap-3 pb-6">
            <TouchableOpacity
              className="bg-white rounded-2xl py-4 items-center"
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.9}
            >
              <Text className="text-brand-700 text-base font-bold">Đăng nhập</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-transparent rounded-2xl py-4 items-center border border-white/70"
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.9}
            >
              <Text className="text-white text-base font-semibold">Tạo tài khoản mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-transparent rounded-2xl py-3 items-center border border-white/40"
              onPress={() => router.push('/(auth)/demo-users')}
              activeOpacity={0.7}
            >
              <Text className="text-white/70 text-xs font-medium">💬 Chế độ Demo (Test nhanh)</Text>
            </TouchableOpacity>

            <Text className="text-center text-white/80 text-xs leading-5 px-4">
              Bằng việc tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="rounded-2xl bg-white/20 border border-white/30 px-4 py-3.5 flex-row items-center">
      <View className="w-9 h-9 rounded-xl bg-white/25 items-center justify-center mr-3">
        <Text className="text-white text-xs font-semibold">{icon.slice(0, 2).toUpperCase()}</Text>
      </View>
      <Text className="text-white text-sm font-medium flex-1">{text}</Text>
    </View>
  );
}
