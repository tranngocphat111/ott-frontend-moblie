import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/Authcontext';
import { ChatApi, chatSocket } from '@/services/api';
import { NotificationApi, type InAppNotification } from '@/services/api/notification.api';
import { THEME_COLORS } from '@/constants/theme';
import { resolveMediaUrl } from '@/utils/chat';

type Props = {
  includeTopInset?: boolean;
};

const NOTIFICATION_BADGE_CHANGED_EVENT = 'riff_notifications_changed';

type SenderProfile = {
  name?: string;
  avatar?: string;
};

const getString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const getNestedString = (notification: InAppNotification, ...keys: string[]) => {
  const pools = [notification.metadata, notification.data].filter(Boolean);
  for (const pool of pools) {
    for (const key of keys) {
      const value = getString(pool?.[key]);
      if (value) return value;
    }
  }
  return '';
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(-2).map((part) => part[0]).join('') || 'R').toUpperCase();
};

const formatTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Number.isNaN(date.getTime())) return '';
  if (diffMs < minute) return 'Vừa xong';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} phút trước`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} giờ trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getNotificationIcon = (type?: string) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('friend') || normalized.includes('relationship')) return 'person-add';
  if (normalized.includes('call')) return 'call';
  if (normalized.includes('group')) return 'people';
  if (normalized.includes('message') || normalized.includes('chat')) return 'chatbubble-ellipses';
  return 'notifications';
};

const getNotificationKind = (type?: string) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('friend') || normalized.includes('relationship')) return 'Kết bạn';
  if (normalized.includes('call')) return 'Cuộc gọi';
  if (normalized.includes('group')) return 'Nhóm';
  if (normalized.includes('message') || normalized.includes('chat')) return 'Tin nhắn';
  return 'Riff';
};

const isDisplayableNotification = (notification: InAppNotification) => {
  const normalized = String(notification.type || '').toLowerCase();
  return !normalized.includes('message') && !normalized.includes('chat');
};

const NotificationAvatar = ({
  name,
  avatar,
  unread,
}: {
  name: string;
  avatar?: string;
  unread: boolean;
}) => {
  const avatarUrl = resolveMediaUrl(avatar || '');

  return (
    <View
      className="h-12 w-12 items-center justify-center overflow-hidden rounded-full"
      style={{
        backgroundColor: unread ? THEME_COLORS.primary[200] : THEME_COLORS.primary[100],
        borderWidth: 1,
        borderColor: '#f0dfd0',
      }}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} className="h-full w-full" resizeMode="cover" />
      ) : (
        <Text className="text-[14px] font-black" style={{ color: THEME_COLORS.primary[700] }}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
};

export function NotificationsContent({ includeTopInset = true }: Props) {
  const insets = useSafeAreaInsets();
  const { chatUserId } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, SenderProfile>>({});
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
      const sorted = data.filter(isDisplayableNotification).sort(
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
      if (!isDisplayableNotification(notification)) return;
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
    };

    chatSocket.on('thong_bao_moi', handleNewNotification as any);
    return () => {
      chatSocket.off('thong_bao_moi', handleNewNotification as any);
    };
  }, []);

  useEffect(() => {
    const missingSenderIds = Array.from(
      new Set(
        notifications
          .map((item) => String(item.senderId || '').trim())
          .filter(
            (senderId) =>
              senderId &&
              senderId !== String(chatUserId || '') &&
              !Object.prototype.hasOwnProperty.call(senderProfiles, senderId),
          ),
      ),
    );

    missingSenderIds.forEach((senderId) => {
      ChatApi.getUserById(senderId)
        .then((profile) => {
          setSenderProfiles((current) => ({
            ...current,
            [senderId]: {
              name: profile?.name || senderId,
              avatar: profile?.avatar || '',
            },
          }));
        })
        .catch(() => {
          setSenderProfiles((current) => ({
            ...current,
            [senderId]: { name: senderId, avatar: '' },
          }));
        });
    });
  }, [chatUserId, notifications, senderProfiles]);

  const getSenderName = useCallback((notification: InAppNotification) => {
    const senderId = String(notification.senderId || '').trim();
    return (
      getString(notification.senderName) ||
      getString(notification.senderFullName) ||
      getString(notification.actorName) ||
      getNestedString(notification, 'senderName', 'senderFullName', 'actorName', 'fromName') ||
      senderProfiles[senderId]?.name ||
      'Riff'
    );
  }, [senderProfiles]);

  const getSenderAvatar = useCallback((notification: InAppNotification) => {
    const senderId = String(notification.senderId || '').trim();
    return (
      getString(notification.senderAvatar) ||
      getString(notification.senderAvatarUrl) ||
      getString(notification.avatar) ||
      getString(notification.avatarUrl) ||
      getString(notification.actorAvatar) ||
      getString(notification.actorAvatarUrl) ||
      getNestedString(
        notification,
        'senderAvatar',
        'senderAvatarUrl',
        'actorAvatar',
        'actorAvatarUrl',
        'avatarUrl',
      ) ||
      senderProfiles[senderId]?.avatar ||
      ''
    );
  }, [senderProfiles]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
    DeviceEventEmitter.emit(NOTIFICATION_BADGE_CHANGED_EVENT);

    const success = await NotificationApi.markAsRead(id);
    if (!success) {
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, isRead: false } : item)),
      );
      DeviceEventEmitter.emit(NOTIFICATION_BADGE_CHANGED_EVENT);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!chatUserId || unreadCount === 0) return;

    const originalNotifications = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    DeviceEventEmitter.emit(NOTIFICATION_BADGE_CHANGED_EVENT);

    const success = await NotificationApi.markAllAsRead(chatUserId);
    if (!success) {
      setNotifications(originalNotifications);
      DeviceEventEmitter.emit(NOTIFICATION_BADGE_CHANGED_EVENT);
    }
  }, [chatUserId, notifications, unreadCount]);

  const deleteNotification = useCallback(async (id: string) => {
    const originalNotifications = [...notifications];
    setNotifications((current) => current.filter((item) => item.id !== id));
    DeviceEventEmitter.emit(NOTIFICATION_BADGE_CHANGED_EVENT);

    const success = await NotificationApi.deleteNotification(id);
    if (!success) {
      setNotifications(originalNotifications);
      DeviceEventEmitter.emit(NOTIFICATION_BADGE_CHANGED_EVENT);
    }
  }, [notifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadNotifications(true);
  }, [loadNotifications]);

  const renderItem = ({ item }: { item: InAppNotification }) => {
    const unread = !item.isRead;
    const iconName = getNotificationIcon(item.type);
    const senderName = getSenderName(item);
    const senderAvatar = getSenderAvatar(item);
    const kind = getNotificationKind(item.type);

    return (
      <Pressable
        onPress={() => unread && void markAsRead(item.id)}
        className="mx-4 mb-3 flex-row rounded-2xl border px-4 py-4"
        style={{
          backgroundColor: unread ? '#fff8f1' : '#ffffff',
          borderColor: unread ? '#ead3bd' : '#f1e5da',
          shadowColor: '#463421',
          shadowOpacity: unread ? 0.1 : 0.04,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: unread ? 3 : 1,
        }}
      >
        <View className="relative h-14 w-14">
          <NotificationAvatar name={senderName} avatar={senderAvatar} unread={unread} />
          <View
            className="absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full border-2 border-white"
            style={{
              backgroundColor: unread ? THEME_COLORS.primary[600] : THEME_COLORS.primary[100],
              elevation: 4,
              shadowColor: '#463421',
              shadowOpacity: 0.14,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Ionicons
              name={iconName as any}
              size={13}
              color={unread ? '#fff' : THEME_COLORS.primary[600]}
            />
          </View>
        </View>

        <View className="ml-3 flex-1">
          <View className="mb-1 flex-row items-center gap-2">
            <Text className="max-w-[150px] text-[14px] font-black text-[#2c2118]" numberOfLines={1}>
              {senderName}
            </Text>
            <View className="rounded-full bg-[#f4ebe3] px-2 py-0.5">
              <Text className="text-[10px] font-black text-[#8b6642]">{kind}</Text>
            </View>
          </View>
          <Text
            className={`text-[14px] leading-5 ${unread ? 'font-bold text-[#4b3828]' : 'font-medium text-[#6f5947]'}`}
            numberOfLines={2}
          >
            {item.content}
          </Text>
          <Text className="mt-1.5 text-[12px] font-semibold text-[#a78b72]">
            {formatTime(item.createdAt)}
          </Text>
        </View>

        <View className="ml-2 items-center justify-center gap-3">
          {unread && <View className="h-2.5 w-2.5 rounded-full bg-red-500" />}
          <Pressable
            onPress={() => void deleteNotification(item.id)}
            hitSlop={8}
            className="rounded-full p-1.5 active:bg-red-50"
          >
            <Ionicons name="trash-outline" size={18} color="#d94f4f" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View
      className="flex-1 bg-[#f7f3f0]"
      style={{ paddingTop: includeTopInset ? insets.top : 0 }}
    >
      <View className="px-5 pb-4 pt-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[28px] font-black text-[#231a10]">Thông báo</Text>
            <Text className="mt-1 text-[13px] font-semibold text-[#9a7655]">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}
            </Text>
          </View>
          {unreadCount > 0 ? (
            <Pressable
              onPress={() => void markAllAsRead()}
              className="rounded-2xl px-4 py-3 active:opacity-80"
              style={{ backgroundColor: THEME_COLORS.primary[600] }}
            >
              <Text className="text-[12px] font-black text-white">Đọc tất cả</Text>
            </Pressable>
          ) : (
            <View className="rounded-2xl bg-white px-4 py-3">
              <Text className="text-[12px] font-black text-[#8b6642]">Tất cả</Text>
            </View>
          )}
        </View>
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
          <Text className="mt-4 text-center text-[16px] font-black text-[#231a10]">
            Chưa có thông báo nào
          </Text>
          <Text className="mt-2 text-center text-[13px] leading-5 text-[#9a7655]">
            Khi có tin nhắn, lời mời hoặc cập nhật mới, chúng sẽ xuất hiện ở đây.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 18 }}
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
