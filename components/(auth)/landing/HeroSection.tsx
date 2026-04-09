import { colors, fonts } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

const STATS = [
  { value: '100M+', label: 'Người dùng' },
  { value: '50M+', label: 'Tin nhắn/ngày' },
  { value: '99.9%', label: 'Uptime' },
];

export default function HeroSection() {
  const router = useRouter();

  return (
    <View className="px-6 pt-16 pb-10 bg-[#f7f3f0] overflow-hidden">

      {/* Decorative background circle */}
      <View
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: colors.primary[200],
          opacity: 0.25,
          top: -60,
          right: -80,
        }}
      />

      {/* Logo row */}
      <View className="flex-row items-center gap-3 mb-10">
        {/* ===== CHÈN ICON APP VÀO ĐÂY ===== */}
        <Image
          source={require('@/assets/images/logo_tach_nen.jpg')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
          }}
          resizeMode="cover"
        />
        {/* ==================================== */}
        <Text
          style={{ fontFamily: fonts.display, fontSize: 28, color: colors.primary[900] }}
          className="font-bold tracking-tight"
        >
          riff
        </Text>
      </View>

      {/* Badge */}
      <View
        className="self-start mb-4 px-3 py-1 rounded-full"
        style={{ backgroundColor: colors.primary[800] }}
      >
        <Text
          className="text-xs font-medium tracking-widest uppercase"
          style={{ color: colors.primary[200], fontFamily: fonts.body }}
        >
          ✦ Tin nhắn thế hệ mới
        </Text>
      </View>

      {/* Heading */}
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 40,
          lineHeight: 46,
          color: colors.primary[900],
          marginBottom: 14,
          letterSpacing: -0.5,
        }}
      >
        Kết nối{'\n'}
        <Text style={{ color: colors.primary[500], fontStyle: 'italic' }}>
          mọi người,
        </Text>
        {'\n'}mọi nơi
      </Text>

      {/* Subtitle */}
      <Text
        className="text-sm mb-8 leading-6"
        style={{ color: colors.primary[600], fontFamily: fonts.body, fontWeight: '300' }}
      >
        Nhắn tin tức thì · Gọi video HD · Bảo mật tuyệt đối
      </Text>

      {/* CTA Primary */}
      <TouchableOpacity
        className="w-full py-4 rounded-2xl items-center mb-3"
        style={{ backgroundColor: colors.primary[800] }}
        onPress={() => router.push('/(auth)/register')}
        activeOpacity={0.85}
      >
        <Text
          className="text-base font-medium tracking-wide"
          style={{ color: colors.primary[100], fontFamily: fonts.body }}
        >
          Đăng ký miễn phí  →
        </Text>
      </TouchableOpacity>

      {/* CTA Ghost */}
      <TouchableOpacity
        className="w-full py-4 rounded-2xl items-center mb-10 border"
        style={{ borderColor: colors.primary[200] }}
        onPress={() => router.push('/(auth)/login')}
        activeOpacity={0.85}
      >
        <Text
          className="text-sm"
          style={{ color: colors.primary[700], fontFamily: fonts.body }}
        >
          Đã có tài khoản?{' '}
          <Text className="font-medium">Đăng nhập</Text>
        </Text>
      </TouchableOpacity>

      {/* Stats */}
      <View
        className="flex-row w-full rounded-2xl overflow-hidden border"
        style={{
          backgroundColor: '#ffffff',
          borderColor: colors.primary[100],
        }}
      >
        {STATS.map(({ value, label }, i) => (
          <React.Fragment key={label}>
            {i > 0 && (
              <View style={{ width: 1, backgroundColor: colors.primary[100] }} />
            )}
            <View className="flex-1 items-center py-4">
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  fontWeight: '700',
                  color: colors.primary[700],
                }}
              >
                {value}
              </Text>
              <Text
                className="text-xs mt-1"
                style={{ color: colors.primary[500], fontFamily: fonts.body }}
              >
                {label}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}