import { colors, fonts } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

const FEATURES = [
  { icon: 'message-circle' as const, title: 'Nhắn tin nhanh', desc: 'Gửi tin nhắn, ảnh, video tức thì. Nhóm lên đến 500 người.' },
  { icon: 'video' as const, title: 'Gọi video HD', desc: 'Ổn định ngay cả khi mạng yếu. Hỗ trợ nhóm video 50 người.' },
  { icon: 'shield' as const, title: 'Bảo mật tuyệt đối', desc: 'Mã hóa end-to-end, xác thực 2 lớp bảo vệ tài khoản.' },
  { icon: 'users' as const, title: 'Nhóm & Cộng đồng', desc: 'Kết nối bạn bè và đồng nghiệp dễ dàng.' },
  { icon: 'maximize' as const, title: 'Đăng nhập QR', desc: 'Quét mã QR, đăng nhập không cần mật khẩu.' },
  { icon: 'globe' as const, title: 'Đa nền tảng', desc: 'Web, iOS, Android, Windows, macOS.' },
];

export default function FeaturesSection() {
  return (
    <View className="px-6 py-12" style={{ backgroundColor: '#ffffff' }}>

      {/* Section label */}
      <Text
        className="text-xs font-medium tracking-widest uppercase mb-2"
        style={{ color: colors.primary[500], fontFamily: fonts.body }}
      >
        Tính năng
      </Text>

      {/* Heading with serif */}
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: 30,
          lineHeight: 36,
          color: colors.primary[900],
          marginBottom: 32,
          letterSpacing: -0.3,
        }}
      >
        Mọi thứ{'\n'}
        <Text style={{ fontStyle: 'italic', color: colors.primary[500] }}>
          bạn cần
        </Text>
      </Text>

      {/* Feature list */}
      <View style={{ gap: 20 }}>
        {FEATURES.map(({ icon, title, desc }) => (
          <View key={title} className="flex-row items-start" style={{ gap: 16 }}>
            {/* Icon box */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.primary[50],
                borderWidth: 1,
                borderColor: colors.primary[100],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name={icon} size={18} color={colors.primary[600]} />
            </View>

            {/* Text */}
            <View className="flex-1">
              <Text
                className="text-sm font-medium mb-1"
                style={{ color: colors.primary[900], fontFamily: fonts.body }}
              >
                {title}
              </Text>
              <Text
                className="text-xs leading-5"
                style={{ color: colors.primary[600], fontFamily: fonts.body, fontWeight: '300' }}
              >
                {desc}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}