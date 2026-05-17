import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/Authcontext';
import { NotificationApi, type InAppNotification } from '@/services/api/notification.api';
import { chatSocket } from '@/services/api';
import { THEME_COLORS } from '@/constants/theme';

type Props = {
  includeTopInset?: boolean;
};

const formatTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getNotificationIcon = (type?: string) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('friend') || normalized.includes('relationship')) return 'person-add';
  if (normalized.includes('call')) return 'call';
  if (normalized.includes('group')) return 'people';
  if (normalized.includes('message')) return 'chatbubble-ellipses';
  return 'notifications';
};

export function NotificationsContent({ includeTopInset = true }: Props) {
  const insets = useSafeAreaInsets();
  const { chatUserId } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const loadNotifications = useCallback(async (silent = false) => {
    if (!chatUserId) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const data = await NotificationApi.getNotifications(chatUserId);
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setNotifications(sorted);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chatUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications(true);
    }, [loadNotifications]),
  );

  useEffect(() => {
    const handleNewNotification = (notification: InAppNotification) => {
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
    };

    chatSocket.on('thong_bao_moi', handleNewNotification as any);
    return () => {
      chatSocket.off('thong_bao_moi', handleNewNotification as any);
    };
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );

    const success = await NotificationApi.markAsRead(id);
    if (!success) {
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, isRead: false } : item)),
      );
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadNotifications(true);
  }, [loadNotifications]);

  const renderItem = ({ item }: { item: InAppNotification }) => {
    const unread = !item.isRead;
    const iconName = getNotificationIcon(item.type);

    return (
      <Pressable
        onPress={() => unread && void markAsRead(item.id)}
        className={`mx-4 mb-3 flex-row rounded-2xl px-4 py-4 ${
          unread ? 'bg-[#fff7ed]' : 'bg-white'
        }`}
        style={{
          shadowColor: '#111827',
          shadowOpacity: unread ? 0.08 : 0.04,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: unread ? 3 : 1,
        }}
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: unread ? '#9a6a43' : '#f1e5da' }}
        >
          <Ionicons
            name={iconName as any}
            size={21}
            color={unread ? '#fff' : THEME_COLORS.primary[600]}
          />
        </View>
        <View className="ml-3 flex-1">
          <Text
            className={`text-[14px] leading-5 ${unread ? 'font-bold text-slate-950' : 'font-medium text-slate-700'}`}
          >
            {item.content}
          </Text>
          <Text className="mt-1 text-[12px] font-medium text-slate-400">
            {formatTime(item.createdAt)}
          </Text>
        </View>
        {unread && <View className="ml-2 mt-1 h-2.5 w-2.5 rounded-full bg-[#9a6a43]" />}
      </Pressable>
    );
  };

  return (
    <View
      className="flex-1 bg-[#f8fafc]"
      style={{ paddingTop: includeTopInset ? insets.top : 0 }}
    >
      <View className="px-5 pb-4 pt-4">
        <Text className="text-[26px] font-black text-slate-950">Thông báo</Text>
        <Text className="mt-1 text-[13px] font-semibold text-slate-500">
          {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã xem hết thông báo'}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={THEME_COLORS.primary[600]} />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
            <Ionicons name="notifications-outline" size={34} color={THEME_COLORS.primary[500]} />
          </View>
          <Text className="mt-4 text-center text-[16px] font-bold text-slate-800">
            Chưa có thông báo nào
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME_COLORS.primary[600]}
            />
          }
        />
      )}
    </View>
  );
}
