import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationApi } from '@/services/api/notification.api';

const PUSH_TOKEN_KEY = 'expoPushToken';
const ANDROID_CHANNEL_ID = 'riff-notifications';
const ANDROID_CHANNEL_NAME = 'Tin nhắn và thông báo Riff';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: false,
  } as Notifications.NotificationBehavior),
});

const getProjectId = () => {
  const constants = Constants as typeof Constants & {
    easConfig?: { projectId?: string };
  };

  return (
    constants.easConfig?.projectId ||
    constants.expoConfig?.extra?.eas?.projectId ||
    constants.manifest2?.extra?.eas?.projectId
  );
};

export const registerNativePushNotifications = async (userId: string) => {
  if (!Device.isDevice) {
    console.log('[Notifications] Push notifications require a physical device');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: ANDROID_CHANNEL_NAME,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ae7f53',
      sound: 'default',
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const permission = await Notifications.getPermissionsAsync();
  let finalStatus = permission.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Push permission not granted');
    return null;
  }

  const projectId = getProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenResponse.data;
  const deviceId = await AsyncStorage.getItem('deviceId');

  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  const registered = await NotificationApi.registerPushToken({
    userId,
    token,
    platform: Platform.OS,
    deviceId,
  });

  if (registered) {
    console.log('[Notifications] Registered Expo push token', token.slice(0, 24));
  } else {
    console.warn('[Notifications] Failed to register Expo push token with backend');
  }

  return registered ? token : null;
};

export const unregisterNativePushNotifications = async (userId?: string | null) => {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!userId) {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    return;
  }

  await NotificationApi.unregisterPushToken({
    userId,
    token: token || undefined,
    platform: Platform.OS,
    deviceId: await AsyncStorage.getItem('deviceId'),
  });
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
};
