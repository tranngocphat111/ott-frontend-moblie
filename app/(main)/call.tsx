import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type DimensionValue,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/Authcontext';
import { THEME_COLORS } from '@/constants/theme';
import { useMobileCall } from '@/hooks/useMobileCall';
import type { CallType } from '@/services/socket/chatSocket';

const normalizeCallType = (value?: string | string[]): CallType =>
  value === 'voice' ? 'voice' : 'video';

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const secs = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
};

const percent = (value: number): DimensionValue => `${value}%` as DimensionValue;

export default function CallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    conversationId?: string;
    type?: string;
    action?: string;
    callId?: string;
    name?: string;
    isGroup?: string;
    invitedUserIds?: string;
  }>();
  const { user, chatUserId } = useAuth();
  const userId = chatUserId || user?.id || '';
  const conversationId = String(params.conversationId || '');
  const callType = normalizeCallType(params.type);
  const action = String(params.action || 'start');
  const callId = String(params.callId || '');
  const displayName = String(params.name || 'Cuộc gọi').trim();
  const isGroup = String(params.isGroup || '') === 'true';
  const invitedUserIds = useMemo(
    () =>
      String(params.invitedUserIds || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    [params.invitedUserIds],
  );

  const startedRef = useRef(false);
  const connectedAtRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const {
    isInCall,
    isConnecting,
    localStream,
    remoteStreams,
    participants,
    isMuted,
    isCameraOff,
    busyUserIds,
    startCall,
    joinExistingCall,
    endCall,
    toggleMic,
    toggleCamera,
  } = useMobileCall({ conversationId, userId });

  const hasRemoteAnswered =
    remoteStreams.length > 0 ||
    participants.some((participantId) => String(participantId) !== String(userId));

  useEffect(() => {
    if (!conversationId || !userId || startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        if (action === 'join') {
          await joinExistingCall(callType, isGroup, callId || undefined);
          return;
        }

        await startCall(
          callType,
          invitedUserIds.length > 0 ? invitedUserIds : undefined,
          isGroup,
        );
      } catch (error) {
        console.error('Không thể mở cuộc gọi:', error);
        Alert.alert('Không thể gọi', 'Vui lòng kiểm tra quyền camera/micro và thử lại.');
      }
    };

    void run();
  }, [
    action,
    callId,
    callType,
    conversationId,
    invitedUserIds,
    isGroup,
    joinExistingCall,
    startCall,
    userId,
  ]);

  useEffect(() => {
    if (busyUserIds.length === 0) return;
    Alert.alert('Không thể kết nối', 'Người nhận đang trong một cuộc gọi khác.', [
      {
        text: 'Đóng',
        onPress: () => {
          void endCall(false);
          router.back();
        },
      },
    ]);
  }, [busyUserIds.length, endCall, router]);

  useEffect(() => {
    if (isInCall && hasRemoteAnswered) {
      if (!connectedAtRef.current) {
        connectedAtRef.current = Date.now();
      }
      return;
    }

    connectedAtRef.current = null;
    setElapsedSeconds(0);
  }, [hasRemoteAnswered, isInCall]);

  useEffect(() => {
    if (!connectedAtRef.current) return;

    const timer = setInterval(() => {
      if (!connectedAtRef.current) return;
      setElapsedSeconds(Math.floor((Date.now() - connectedAtRef.current) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [hasRemoteAnswered]);

  const primaryRemote = remoteStreams[0]?.stream;
  const shouldUseGroupVideoGrid = isGroup && callType === 'video' && remoteStreams.length > 1;
  const participantCount = Math.max(
    participants.length,
    remoteStreams.length + (isInCall || isConnecting ? 1 : 0),
  );
  const groupVideoTileStyle = useMemo<ViewStyle>(() => {
    const count = remoteStreams.length;
    if (count <= 2) {
      return { width: percent(100), height: percent(100 / Math.max(count, 1)) };
    }
    if (count <= 4) {
      return { width: percent(50), height: percent(50) };
    }
    if (count <= 6) {
      return { width: percent(33.3333), height: percent(50) };
    }
    return { width: percent(33.3333), height: percent(33.3333) };
  }, [remoteStreams.length]);
  const localStreamUrl = localStream?.toURL();
  const remoteStreamUrl = primaryRemote?.toURL();

  const handleLeave = async () => {
    await endCall(true);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(main)/(tabs)/home');
  };

  if (!conversationId || !userId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-950 px-6">
        <Text className="text-center text-base font-semibold text-white">
          Không tìm thấy thông tin cuộc gọi
        </Text>
        <Pressable
          onPress={() => router.replace('/(main)/(tabs)/home')}
          className="mt-5 rounded-xl bg-white px-5 py-3"
        >
          <Text className="font-bold text-slate-900">Quay lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View className="absolute inset-0">
        {shouldUseGroupVideoGrid ? (
          <View className="flex-1 flex-row flex-wrap bg-slate-950 p-1">
            {remoteStreams.map((item, index) => {
              const streamUrl = item.stream.toURL();
              return (
                <View
                  key={item.userId}
                  className="p-1"
                  style={groupVideoTileStyle}
                >
                  <View className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                    {streamUrl ? (
                      <RTCView
                        streamURL={streamUrl}
                        objectFit="cover"
                        mirror={false}
                        style={{ flex: 1 }}
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Text className="text-2xl font-bold text-white">
                          {index + 1}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : remoteStreamUrl && callType === 'video' ? (
          <RTCView
            streamURL={remoteStreamUrl}
            objectFit="cover"
            mirror={false}
            style={{ flex: 1 }}
          />
        ) : (
          <LinearGradient
            colors={['#1f2937', '#0f172a', '#020617']}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <View className="h-28 w-28 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
              <Text className="text-4xl font-bold text-white">
                {(displayName || 'U').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text className="mt-4 text-lg font-bold text-white">{displayName}</Text>
            <Text className="mt-1 text-sm text-white/70">
              {hasRemoteAnswered
                ? isGroup
                  ? `${participantCount} người trong cuộc gọi`
                  : 'Đang kết nối âm thanh'
                : 'Đang chờ trả lời...'}
            </Text>
          </LinearGradient>
        )}
      </View>

      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-5"
        style={{ top: Math.max(insets.top, 18) + 10 }}
      >
        <View className="min-w-0 flex-1">
          <Text className="text-xl font-bold text-white" numberOfLines={1}>
            {displayName}
          </Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">
            {hasRemoteAnswered
              ? formatDuration(elapsedSeconds)
              : isConnecting
                ? 'Đang kết nối...'
                : action === 'join'
                  ? 'Đang tham gia...'
                  : 'Đang đổ chuông...'}
          </Text>
        </View>

        {callType === 'video' && localStreamUrl && (
          <View className="ml-3 h-32 w-24 overflow-hidden rounded-2xl border border-white/20 bg-slate-800">
            {isCameraOff ? (
              <View className="flex-1 items-center justify-center">
                <Feather name="video-off" color="#fff" size={22} />
              </View>
            ) : (
              <RTCView
                streamURL={localStreamUrl}
                objectFit="cover"
                mirror
                style={{ flex: 1 }}
              />
            )}
          </View>
        )}
      </View>

      {!isInCall && !isConnecting && (
        <View className="absolute inset-0 items-center justify-center bg-slate-950/80 px-6">
          <Text className="text-center text-xl font-bold text-white">
            Cuộc gọi đã kết thúc
          </Text>
        </View>
      )}

      {isConnecting && (
        <View className="absolute inset-x-0 items-center" style={{ top: '48%' }}>
          <ActivityIndicator color={THEME_COLORS.primary[300]} size="large" />
        </View>
      )}

      <SafeAreaView className="absolute bottom-0 left-0 right-0">
        <View className="mb-4 flex-row items-center justify-center gap-5 px-6">
          <Pressable
            onPress={toggleMic}
            className={`h-14 w-14 items-center justify-center rounded-full ${
              isMuted ? 'bg-red-500' : 'bg-white/15'
            }`}
          >
            <Feather name={isMuted ? 'mic-off' : 'mic'} color="#fff" size={22} />
          </Pressable>

          {callType === 'video' && (
            <Pressable
              onPress={toggleCamera}
              className={`h-14 w-14 items-center justify-center rounded-full ${
                isCameraOff ? 'bg-red-500' : 'bg-white/15'
              }`}
            >
              <Feather name={isCameraOff ? 'video-off' : 'video'} color="#fff" size={22} />
            </Pressable>
          )}

          <Pressable
            onPress={() => void handleLeave()}
            className="h-16 w-16 items-center justify-center rounded-2xl bg-red-600"
          >
            <Feather name="phone-off" color="#fff" size={26} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
