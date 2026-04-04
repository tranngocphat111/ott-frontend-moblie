// app/(main)/profile/sessions.tsx
import { useSessions } from '@/hooks/profile/useSessions';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView, ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SessionsScreen() {
  const router = useRouter();
  const { sessions, isLoading, fetchSessions, revokeSession, revokeAllOthers } = useSessions();

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = (sessionId: string) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn đăng xuất phiên này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => revokeSession(sessionId),
        },
      ]
    );
  };

  const handleRevokeAllOthers = () => {
    const otherSessions = sessions.filter(s => !s.isCurrent);
    if (otherSessions.length === 0) return;

    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn đăng xuất tất cả thiết bị khác?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất tất cả',
          style: 'destructive',
          onPress: () => revokeAllOthers(),
        },
      ]
    );
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toUpperCase()) {
      case 'MOBILE': return 'smartphone';
      case 'TABLET': return 'tablet';
      case 'DESKTOP': return 'monitor';
      default: return 'monitor';
    }
  };

  const formatLastActive = (dateString?: string, fallback?: string) => {
    const ds = dateString || fallback;
    if (!ds) return 'Không rõ';
    const date = new Date(ds);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Vừa xong';
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const formatLoginMethod = (method?: string) => {
    if (!method) return null;
    const map: Record<string, string> = {
      phone: 'số điện thoại',
      email: 'email',
      google: 'Google',
      password: 'mật khẩu',
    };
    return map[method.toLowerCase()] || method.toLowerCase();
  };

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Thiết bị đã đăng nhập</Text>
        {otherSessions.length > 0 ? (
          <TouchableOpacity onPress={handleRevokeAllOthers}>
            <Text className="text-sm text-red-600 font-medium">Đăng xuất tất cả</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0084ff" />
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-4 pb-6">
            <Text className="text-sm text-gray-500 mb-4 px-2">
              Bạn đang đăng nhập trên {sessions.length} thiết bị
            </Text>

            {sessions.map((session) => {
              const deviceIcon = getDeviceIcon(session.deviceType);
              const isCurrent = session.isCurrent;
              const loginMethod = formatLoginMethod(session.loginMethod);

              return (
                <View
                  key={session.id}
                  className={`rounded-xl border p-4 mb-3 ${isCurrent
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white'
                    }`}
                >
                  <View className="flex-row items-start">
                    {/* Icon */}
                    <View
                      className={`w-11 h-11 rounded-full justify-center items-center ${isCurrent ? 'bg-blue-100' : 'bg-gray-100'
                        }`}
                    >
                      <Feather
                        name={deviceIcon as any}
                        size={20}
                        color={isCurrent ? '#3b82f6' : '#374151'}
                      />
                    </View>

                    {/* Info */}
                    <View className="flex-1 ml-3">
                      {/* Device name row */}
                      <View className="flex-row items-center flex-wrap gap-1">
                        <Text className="text-sm font-semibold text-gray-900">
                          {session.deviceName || 'Thiết bị không xác định'}
                        </Text>
                        {isCurrent && (
                          <View className="bg-blue-600 px-2 py-0.5 rounded ml-1">
                            <Text className="text-white text-xs font-medium">Hiện tại</Text>
                          </View>
                        )}
                        {session.twoFactorVerified && (
                          <Feather name="shield" size={14} color="#16a34a" />
                        )}
                      </View>

                      {/* IP & Location */}
                      {(session.ipAddress || session.location) && (
                        <View className="flex-row items-center mt-1">
                          <Feather name="map-pin" size={12} color="#9ca3af" />
                          <Text className="text-xs text-gray-500 ml-1">
                            {[session.ipAddress, session.location].filter(Boolean).join(' • ')}
                          </Text>
                        </View>
                      )}

                      {/* Last active */}
                      <View className="flex-row items-center mt-1">
                        <Feather name="clock" size={12} color="#9ca3af" />
                        <Text className="text-xs text-gray-500 ml-1">
                          Hoạt động {formatLastActive(session.lastActiveAt, session.createdAt)}
                        </Text>
                      </View>

                      {/* Login method */}
                      {loginMethod && (
                        <Text className="text-xs text-gray-400 mt-1">
                          Đăng nhập bằng {loginMethod}
                        </Text>
                      )}
                    </View>

                    {/* Revoke button */}
                    {!isCurrent && (
                      <TouchableOpacity
                        onPress={() => handleRevokeSession(session.id)}
                        className="w-8 h-8 rounded-full justify-center items-center ml-2"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={18} color="#9ca3af" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {sessions.length === 0 && (
              <View className="items-center justify-center py-16">
                <Feather name="smartphone" size={48} color="#d1d5db" />
                <Text className="text-gray-400 mt-4">Không có thiết bị nào đã đăng nhập</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}