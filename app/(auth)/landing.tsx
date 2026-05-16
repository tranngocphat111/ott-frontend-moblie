// app/(auth)/landing.tsx
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSystemBackground } from '@/utils/useSystemBackground';

export default function LandingScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = height < 720;
  const intro = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const actionBottomPadding = Math.max(insets.bottom + 10, isCompact ? 16 : 28);
  useSystemBackground('#120c08');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(intro, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [intro, pulse]);

  const introStyle = useMemo(
    () => ({
      opacity: intro,
      transform: [
        {
          translateY: intro.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 0],
          }),
        },
      ],
    }),
    [intro],
  );

  const haloStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.32, 0.08],
      }),
      transform: [
        {
          scale: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.92, 1.12],
          }),
        },
      ],
    }),
    [pulse],
  );

  return (
    <View className="flex-1 bg-[#21140b]">
      <StatusBar style="light" />
      <LinearGradient
        colors={['#5f4129', '#24170d', '#120c08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ flex: 1 }}
      >
        <View className="absolute inset-x-0 top-0 h-40 border-b border-white/10 bg-white/5" />
        <View className="absolute -right-10 top-28 h-44 w-44 rotate-12 rounded-[32px] border border-white/10 bg-white/5" />
        <View className="absolute -left-16 bottom-24 h-52 w-52 -rotate-12 rounded-[36px] border border-[#d0a97e]/15 bg-[#d0a97e]/10" />

        <SafeAreaView className="flex-1 px-6" edges={['top', 'left', 'right']}>
          <Animated.View
            style={introStyle}
            className={`${isCompact ? 'pt-4' : 'pt-8'} flex-row items-center justify-between`}
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white">
                <Image
                  source={require('../../assets/logo_tach_nen.png')}
                  className="h-9 w-9"
                  resizeMode="contain"
                />
              </View>
              <View className="ml-3">
                <Text className="text-2xl font-black tracking-wide text-white">Riff</Text>
                <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-[#dfc0a4]">
                  Mobile
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            style={introStyle}
            className={`flex-1 ${isCompact ? 'justify-center' : 'justify-center'} py-6`}
          >
            <View className="items-center">
              <View className="relative h-52 w-full max-w-[340px] items-center justify-center">
                <Animated.View
                  style={haloStyle}
                  className="absolute h-44 w-44 rounded-[44px] border border-[#dfc0a4]/35 bg-[#dfc0a4]/20"
                />
                <View className="absolute left-2 top-5 w-44 rounded-3xl border border-white/12 bg-white/12 p-3">
                  <View className="mb-3 flex-row items-center">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-[#efe7e0]">
                      <Feather name="message-circle" size={17} color="#694d31" />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="h-2.5 w-20 rounded-full bg-white/70" />
                      <View className="mt-2 h-2 w-12 rounded-full bg-white/35" />
                    </View>
                  </View>
                  <View className="self-end rounded-2xl bg-[#efdccb] px-3 py-2">
                    <Text className="text-xs font-semibold text-[#231a10]">Alo, nghe rõ không?</Text>
                  </View>
                </View>

                <View className="absolute right-1 bottom-2 w-48 rounded-[28px] border border-[#dfc0a4]/20 bg-[#150d08]/88 p-3">
                  <View className="mb-4 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#8b6642]">
                        <Text className="text-sm font-bold text-white">R</Text>
                      </View>
                      <View className="ml-2">
                        <Text className="text-xs font-bold text-white">Cuộc gọi nhóm</Text>
                        <Text className="text-[10px] font-semibold text-[#dfc0a4]">Đang kết nối</Text>
                      </View>
                    </View>
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
                      <Feather name="video" size={14} color="#fff" />
                    </View>
                  </View>
                  <View className="flex-row">
                    {['A', 'B', 'C'].map((name, index) => (
                      <View
                        key={name}
                        className="h-9 w-9 items-center justify-center rounded-full border-2 border-[#150d08] bg-[#efe7e0]"
                        style={{ marginLeft: index === 0 ? 0 : -8 }}
                      >
                        <Text className="text-xs font-bold text-[#694d31]">{name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <Text className="mt-8 text-center text-[34px] font-black leading-[40px] text-white">
                Chào mừng trở lại
              </Text>
              <Text className="mt-3 max-w-[300px] text-center text-sm font-medium leading-6 text-[#efe7e0]">
                Mở Riff và tiếp tục những cuộc trò chuyện đang chờ bạn.
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[introStyle, { paddingBottom: actionBottomPadding }]}
            className="gap-3"
          >
            <Pressable
              className="h-14 flex-row items-center justify-center rounded-2xl bg-white"
              onPress={() => router.push('/(auth)/login')}
              android_ripple={{ color: '#efe7e0' }}
            >
              <Feather name="log-in" size={18} color="#694d31" />
              <Text className="ml-2 text-base font-black text-[#694d31]">Đăng nhập</Text>
            </Pressable>

            <Pressable
              className="h-14 flex-row items-center justify-center rounded-2xl border border-white/25 bg-white/10"
              onPress={() => router.push('/(auth)/register')}
              android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
            >
              <Feather name="user-plus" size={18} color="#fff" />
              <Text className="ml-2 text-base font-bold text-white">Tạo tài khoản mới</Text>
            </Pressable>

            <Text className="px-4 pt-1 text-center text-[11px] font-medium leading-5 text-white/55">
              Bằng việc tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật.
            </Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
