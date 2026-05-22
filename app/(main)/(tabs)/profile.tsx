import { useAuth } from '@/contexts/Authcontext';
import { useTheme } from '@/contexts/Themecontext';
import { THEME_COLORS } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value?: string;
}) => (
  <View className="flex-row items-center justify-between py-3 border-b border-brand-100">
    <Text className="text-sm font-medium text-brand-500 w-36">{label}</Text>
    <View className="flex-1 flex-row items-center justify-end gap-2">
      <Text className="text-sm text-brand-900 text-right flex-shrink">{value || 'Chưa cập nhật'}</Text>
    </View>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const hasPassword = user?.hasPassword;
  const isGoogleUser = !!user?.googleId;

  const menuItems = [
    {
      icon: 'lock',
      title: hasPassword ? 'Đổi mật khẩu' : 'Thiết lập mật khẩu',
      onPress: () => router.push(hasPassword ? '/profile/change-password' : '/profile/set-password'),
    },
    {
      icon: 'shield',
      title: user?.is2FAEnabled ? 'Tắt xác thực 2 bước' : 'Bật xác thực 2 bước',
      onPress: () => router.push('/profile/two-factor'),
    },
    {
      icon: 'smartphone',
      title: 'Thiết bị đã đăng nhập',
      onPress: () => router.push('/profile/sessions'),
    },
    {
      icon: 'trash-2',
      title: 'Xóa tài khoản',
      onPress: () => router.push('/profile/delete-account'),
      danger: true,
    },
  ];

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Chưa cập nhật';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatGender = (gender?: string) => {
    if (gender === 'MALE') return 'Nam';
    if (gender === 'FEMALE') return 'Nữ';
    if (gender === 'OTHER') return 'Khác';
    return 'Chưa cập nhật';
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View>
          <View className="h-36 relative">
            {user?.coverUrl ? (
              <Image source={{ uri: user.coverUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full bg-brand-400" />
            )}
          </View>

          <View className="px-6 pb-4 bg-surface-raised border-b border-brand-100">
            <View className="flex-row items-end justify-between -mt-12">
              <View className="relative">
                <View className="w-24 h-24 rounded-full border-4 border-brand-50 shadow overflow-hidden bg-brand-100">
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full bg-brand-500 justify-center items-center">
                      <Text className="text-white text-3xl font-bold">
                        {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/profile/edit')}
                className="flex-row items-center gap-1 bg-brand-600 px-4 py-2 rounded-2xl mt-2"
              >
                <Feather name="edit-2" size={14} color={THEME_COLORS.neutral.white} />
                <Text className="text-white text-sm font-semibold ml-1">Chỉnh sửa</Text>
              </TouchableOpacity>
            </View>

            <View className="mt-3">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-xl font-bold text-brand-900">{user?.fullName || 'Người dùng'}</Text>
                {user?.is2FAEnabled && (
                  <View className="flex-row items-center bg-green-100 px-2 py-0.5 rounded">
                    <Feather name="shield" size={11} color={THEME_COLORS.neutral.green500} />
                    <Text className="text-green-700 text-xs font-medium ml-1">2FA</Text>
                  </View>
                )}
                {isGoogleUser && (
                  <View className="flex-row items-center bg-brand-100 px-2 py-0.5 rounded">
                    <Feather name="globe" size={11} color={THEME_COLORS.primary[600]} />
                    <Text className="text-brand-700 text-xs font-medium ml-1">Google</Text>
                  </View>
                )}
              </View>

              {user?.bio ? <Text className="text-sm text-brand-600 mt-1">{user.bio}</Text> : null}

              <View className="flex-row items-center gap-1 mt-2">
                <Feather name="calendar" size={13} color={THEME_COLORS.primary[400]} />
                <Text className="text-xs text-brand-500 ml-1">Tham gia {formatDate(user?.createdAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(main)/qr-scan')}
          className="mx-4 mt-4 bg-brand-600 rounded-2xl py-4 flex-row items-center justify-center gap-3"
        >
          <Feather name="maximize" size={22} color={THEME_COLORS.neutral.white} />
          <View>
            <Text className="text-white font-bold text-base">Quét mã QR</Text>
            <Text className="text-brand-100 text-xs">Đăng nhập web bằng điện thoại</Text>
          </View>
        </TouchableOpacity>

        <View className="mx-4 mt-4 bg-surface-raised rounded-2xl border border-brand-100 overflow-hidden">
          <View className="px-4 pt-4 pb-2">
            <Text className="text-base font-bold text-brand-900">Thông tin cá nhân</Text>
          </View>
          <View className="px-4 pb-2">
            <InfoRow label="Họ và tên" value={user?.fullName} />
            <InfoRow label="Số điện thoại" value={user?.phone} />
            <InfoRow label="Email" value={user?.email} />
            <InfoRow label="Giới thiệu" value={user?.bio} />
            <InfoRow label="Công việc" value={user?.work} />
            <InfoRow label="Địa điểm" value={user?.location} />
            <InfoRow label="Tình trạng quan hệ" value={user?.relationshipStatus} />
            <InfoRow
              label="Ngày sinh"
              value={user?.dateOfBirth ? formatDate(user.dateOfBirth) : undefined}
            />
            <InfoRow label="Giới tính" value={formatGender(user?.gender)} />
            <InfoRow label="Ngày tham gia" value={formatDate(user?.createdAt)} />
            {user?.lastLoginAt && (
              <InfoRow
                label="Đăng nhập gần nhất"
                value={new Date(user.lastLoginAt).toLocaleString('vi-VN')}
              />
            )}
          </View>
        </View>

        <View className="mx-4 mt-4 bg-surface-raised rounded-2xl border border-brand-100 overflow-hidden">
          <View className="px-4 pt-4 pb-2">
            <Text className="text-base font-bold text-brand-900">Bảo mật và Tài khoản</Text>
          </View>
          <View className="px-4 pb-2">
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={item.onPress}
                className={`flex-row items-center py-3 ${index < menuItems.length - 1 ? 'border-b border-brand-100' : ''
                  }`}
              >
                <View
                  className={`w-9 h-9 rounded-full justify-center items-center ${item.danger ? 'bg-red-100' : 'bg-brand-100'
                    }`}
                >
                  <Feather
                    name={item.icon as any}
                    size={18}
                    color={item.danger ? THEME_COLORS.error.border : THEME_COLORS.primary[700]}
                  />
                </View>
                <Text className={`flex-1 text-sm ml-3 ${item.danger ? 'text-red-600' : 'text-brand-900'}`}>
                  {item.title}
                </Text>
                <Feather name="chevron-right" size={18} color={THEME_COLORS.primary[400]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mx-4 mt-4 mb-8">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-50 border border-red-200 rounded-2xl py-4 flex-row items-center justify-center"
          >
            <Feather name="log-out" size={20} color={THEME_COLORS.neutral.red600} />
            <Text className="text-red-600 font-semibold ml-2">Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

