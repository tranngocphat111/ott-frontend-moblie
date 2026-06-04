import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs } from 'expo-router';
import { AppState, DeviceEventEmitter, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_COLORS } from '@/constants/theme';
import { useAuth } from '@/contexts/Authcontext';
import { ChatApi, chatSocket } from '@/services/api';
import { NotificationApi } from '@/services/api/notification.api';
import type { ChatConversationWithParticipant } from '@/types/entities/chat';
import { getBackendDateTime } from '@/utils/time';

type TabIconName = ComponentProps<typeof Ionicons>['name'];

const NOTIFICATION_BADGE_CHANGED_EVENT = 'riff_notifications_changed';

const getUnreadCount = (item: ChatConversationWithParticipant) =>
  Number(item.participant?.unread_count || 0);

const isMutedConversation = (item: ChatConversationWithParticipant) => {
  const settings = item.participant?.settings;
  const status = settings?.notification_status;
  if (status === 'off') return true;
  if (status !== 'mute') return false;

  const muteUntil = settings?.mute_until
    ? getBackendDateTime(settings.mute_until)
    : Number.POSITIVE_INFINITY;
  return !muteUntil || muteUntil > Date.now();
};

const isDisplayableNotification = (item: { type?: string }) => {
  const normalized = String(item.type || '').toLowerCase();
  return !normalized.includes('message') && !normalized.includes('chat');
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { chatUserId } = useAuth();
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 14);
  const tabBarHeight = bottomInset + 68;

  const loadMessageBadge = useCallback(async () => {
    if (!chatUserId) {
      setMessageUnreadCount(0);
      return;
    }

    try {
      const conversations = await ChatApi.getUserConversations(chatUserId);
      const count = conversations.reduce((total, item) => {
        if (isMutedConversation(item)) return total;
        return total + getUnreadCount(item);
      }, 0);
      setMessageUnreadCount(count);
    } catch (error) {
      console.warn('Cannot refresh message badge.', error);
    }
  }, [chatUserId]);

  const loadNotificationBadge = useCallback(async () => {
    if (!chatUserId) {
      setNotificationUnreadCount(0);
      return;
    }

    try {
      const notifications = await NotificationApi.getNotifications(chatUserId);
      setNotificationUnreadCount(
        notifications.filter((item) => isDisplayableNotification(item) && !item.isRead).length,
      );
    } catch (error) {
      console.warn('Cannot refresh notification badge.', error);
    }
  }, [chatUserId]);

  const loadBadges = useCallback(() => {
    void loadMessageBadge();
    void loadNotificationBadge();
  }, [loadMessageBadge, loadNotificationBadge]);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  useEffect(() => {
    if (!chatUserId) return;

    chatSocket.connect();
    chatSocket.joinUserRoom(chatUserId);

    const refreshMessageBadge = () => {
      void loadMessageBadge();
    };
    const refreshNotificationBadge = () => {
      void loadNotificationBadge();
    };

    chatSocket.on('tin_nhan', refreshMessageBadge);
    chatSocket.on('conversation_read_synced', refreshMessageBadge);
    chatSocket.on('participant_cursor_changed', refreshMessageBadge);
    chatSocket.on('cap_nhat_thong_bao', refreshMessageBadge);
    chatSocket.on('cap_nhat_phan_loai', refreshMessageBadge);
    chatSocket.on('cap_nhat_ghim', refreshMessageBadge);
    chatSocket.on('cap_nhat_role', refreshMessageBadge);
    chatSocket.on('chuyen_quyen_truong_nhom', refreshMessageBadge);
    chatSocket.on('thong_bao_moi', refreshNotificationBadge);

    return () => {
      chatSocket.off('tin_nhan', refreshMessageBadge);
      chatSocket.off('conversation_read_synced', refreshMessageBadge);
      chatSocket.off('participant_cursor_changed', refreshMessageBadge);
      chatSocket.off('cap_nhat_thong_bao', refreshMessageBadge);
      chatSocket.off('cap_nhat_phan_loai', refreshMessageBadge);
      chatSocket.off('cap_nhat_ghim', refreshMessageBadge);
      chatSocket.off('cap_nhat_role', refreshMessageBadge);
      chatSocket.off('chuyen_quyen_truong_nhom', refreshMessageBadge);
      chatSocket.off('thong_bao_moi', refreshNotificationBadge);
    };
  }, [chatUserId, loadMessageBadge, loadNotificationBadge]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadBadges();
    });
    const notificationSubscription = DeviceEventEmitter.addListener(
      NOTIFICATION_BADGE_CHANGED_EVENT,
      loadNotificationBadge,
    );

    return () => {
      appStateSubscription.remove();
      notificationSubscription.remove();
    };
  }, [loadBadges, loadNotificationBadge]);

  const badgeLabels = useMemo(
    () => ({
      messages: messageUnreadCount > 99 ? '99+' : String(messageUnreadCount),
      notifications: notificationUnreadCount > 99 ? '99+' : String(notificationUnreadCount),
    }),
    [messageUnreadCount, notificationUnreadCount],
  );

  const renderTabIcon = (name: TabIconName, focusedName: TabIconName, badgeCount = 0) =>
    // eslint-disable-next-line react/display-name
    ({ focused }: { focused: boolean; color: string; size: number }) => (
      <View
        style={{
          width: focused ? 44 : 38,
          height: 32,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? '#f1e5da' : 'transparent',
        }}
      >
        <Ionicons
          name={focused ? focusedName : name}
          size={focused ? 22 : 21}
          color={focused ? THEME_COLORS.primary[700] : THEME_COLORS.primary[400]}
        />
        {badgeCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -5,
              right: -7,
              minWidth: badgeCount > 99 ? 25 : 19,
              height: 19,
              paddingHorizontal: 5,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#e64646',
              borderWidth: 2,
              borderColor: focused ? '#f1e5da' : THEME_COLORS.surface.raised,
              shadowColor: '#7f1d1d',
              shadowOpacity: 0.2,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', lineHeight: 13 }}>
              {name.includes('chatbubble') ? badgeLabels.messages : badgeLabels.notifications}
            </Text>
          </View>
        )}
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME_COLORS.primary[700],
        tabBarInactiveTintColor: THEME_COLORS.primary[400],
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: THEME_COLORS.surface.raised,
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingBottom: bottomInset,
          paddingTop: 9,
          shadowColor: '#111827',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginTop: 3,
        },
        tabBarItemStyle: {
          borderRadius: 22,
          marginHorizontal: 3,
          paddingTop: 3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: renderTabIcon(
            'chatbubble-ellipses-outline',
            'chatbubble-ellipses',
            messageUnreadCount,
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Thông báo',
          tabBarIcon: renderTabIcon(
            'notifications-outline',
            'notifications',
            notificationUnreadCount,
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Khám phá',
          tabBarIcon: renderTabIcon('compass-outline', 'compass'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: renderTabIcon('person-outline', 'person'),
        }}
      />
    </Tabs>
  );
}
