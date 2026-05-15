import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/context/Authcontext';
import { NotificationApi, InAppNotification } from '@/services/api/notification.api';
import { THEME_COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { chatSocket } from '@/services/api';

export default function NotificationsScreen() {
  const { chatUserId } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chatUserId) {
      loadNotifications();
    }

    const handleNewNotification = (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
    };

    chatSocket.on("thong_bao_moi", handleNewNotification);

    return () => {
      chatSocket.off("thong_bao_moi", handleNewNotification);
    };
  }, [chatUserId]);

  const loadNotifications = async () => {
    if (!chatUserId) return;
    try {
      const data = await NotificationApi.getNotifications(chatUserId);
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(sorted);
    } catch (e) {
      console.log('Error loading notifications', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const success = await NotificationApi.markAsRead(id);
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const renderItem = ({ item }: { item: InAppNotification }) => (
    <Pressable 
      style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
      onPress={() => !item.isRead && handleMarkAsRead(item.id)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="notifications" size={24} color={THEME_COLORS.primary[500]} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.contentText, !item.isRead && styles.unreadText]}>
          {item.content}
        </Text>
        <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
      </View>
      {!item.isRead && (
        <View style={styles.unreadDot} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Thông báo', headerBackTitle: 'Trở lại', headerShown: true }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME_COLORS.primary[500]} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Bạn chưa có thông báo nào.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.surface.DEFAULT,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: THEME_COLORS.neutral.slate500,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  unreadItem: {
    backgroundColor: '#F0F9FF',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME_COLORS.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  contentText: {
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: THEME_COLORS.neutral.slate500,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME_COLORS.primary[500],
    marginLeft: 8,
  }
});
