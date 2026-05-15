import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type DimensionValue,
  Image,
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
import { resolveMediaUrl } from '@/utils/chat';

const normalizeCallType = (value?: string | string[]): CallType =>
  value === 'voice' ? 'voice' : 'video';

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60).toString().padStart(2, '0');
  const secs = (safe % 60).toString().padStart(2, '0');
  if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes}:${secs}`;
  return `${minutes}:${secs}`;
};

const percent = (value: number): DimensionValue => `${value}%` as DimensionValue;

const isUsableAvatar = (value?: string | null) => {
  const normalized = String(value || '').trim();
  return !!normalized && normalized !== 'null' && normalized !== 'undefined';
};

const getInitial = (value?: string | null) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, 1).toUpperCase() : 'U';
};

type AvatarCircleProps = {
  name: string;
  avatarUrl?: string;
  size?: number;
  textSize?: string;
};

const AvatarCircle: React.FC<AvatarCircleProps> = ({
  name,
  avatarUrl,
  size = 112,
  textSize = 'text-4xl',
}) => {
  const [broken, setBroken] = useState(false);
  const showAvatar = isUsableAvatar(avatarUrl) && !broken;

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full border border-white/20 bg-slate-700"
      style={{ width: size, height: size }}
    >
      {showAvatar ? (
        <Image
          source={{ uri: avatarUrl }}
          className="h-full w-full"
          resizeMode="cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <Text className={`${textSize} font-bold text-white`}>
          {getInitial(name)}
        </Text>
      )}
    </View>
  );
};

type CallControlButtonProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
};

const CallControlButton: React.FC<CallControlButtonProps> = ({
  icon,
  label,
  active = false,
  danger = false,
  onPress,
}) => (
  <View className="items-center">
    <Pressable
      onPress={onPress}
      className={`h-14 w-14 items-center justify-center rounded-full ${
        danger ? 'bg-[#ef4444]' : active ? 'bg-white' : 'bg-white/16'
      }`}
    >
      <Feather name={icon} color={danger ? '#fff' : active ? '#0f172a' : '#fff'} size={23} />
    </Pressable>
    <Text className="mt-1.5 text-[11px] font-semibold text-white/80">{label}</Text>
  </View>
);

export default function CallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    conversationId?: string;
    type?: string;
    action?: string;
    callId?: string;
    name?: string;
    avatar?: string;
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
  const remoteAvatarUrl = resolveMediaUrl(String(params.avatar || '').trim());
  const myDisplayName = String(user?.fullName || 'Tôi').trim();
  const myAvatarUrl = resolveMediaUrl(String(user?.avatarUrl || '').trim());
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
  const [isLocalPreviewCollapsed, setIsLocalPreviewCollapsed] = useState(false);

  const {
    isInCall,
    isConnecting,
    localStream,
    remoteStreams,
    participants,
    isMuted,
    isCameraOff,
    remoteCameraStates,
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

  const primaryRemoteItem = remoteStreams[0];
  const primaryRemote = primaryRemoteItem?.stream;
  const isPrimaryRemoteCameraOff = primaryRemoteItem
    ? remoteCameraStates[primaryRemoteItem.userId] === true
    : false;
  const shouldUseGroupVideoGrid = isGroup && callType === 'video' && remoteStreams.length > 1;
  const participantCount = Math.max(
    participants.length,
    remoteStreams.length + (isInCall || isConnecting ? 1 : 0),
  );
  const localStreamUrl = localStream?.toURL();
  const remoteStreamUrl = primaryRemote?.toURL();
  const groupVideoTileStyle = useMemo<ViewStyle>(() => {
    const count = remoteStreams.length + (localStreamUrl ? 1 : 0);
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
  }, [localStreamUrl, remoteStreams.length]);
  const shouldShowPrimaryRemoteVideo =
    !!remoteStreamUrl && callType === 'video' && !isPrimaryRemoteCameraOff;

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
          <View className="flex-1 flex-row flex-wrap bg-[#05070c] p-1">
            {localStreamUrl && (
              <View className="p-1" style={groupVideoTileStyle}>
                <View className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
                  {isCameraOff ? (
                    <View className="flex-1 items-center justify-center">
                      <AvatarCircle name={myDisplayName} avatarUrl={myAvatarUrl} size={76} textSize="text-2xl" />
                      <Text className="mt-2 text-xs font-semibold text-white/75">Bạn</Text>
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
              </View>
            )}
            {remoteStreams.map((item, index) => {
              const streamUrl = item.stream.toURL();
              const isRemoteCameraOff = remoteCameraStates[item.userId] === true;
              return (
                <View
                  key={item.userId}
                  className="p-1"
                  style={groupVideoTileStyle}
                >
                  <View className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
                    {streamUrl && !isRemoteCameraOff ? (
                      <RTCView
                        streamURL={streamUrl}
                        objectFit="cover"
                        mirror={false}
                        style={{ flex: 1 }}
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <AvatarCircle name={`${index + 1}`} size={76} textSize="text-2xl" />
                        <Text className="mt-2 text-xs font-semibold text-white/75">
                          Camera đang tắt
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : shouldShowPrimaryRemoteVideo ? (
          <RTCView
            streamURL={remoteStreamUrl}
            objectFit="cover"
            mirror={false}
            style={{ flex: 1 }}
          />
        ) : (
          <LinearGradient
            colors={['#182033', '#0b1020', '#020617']}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <View className="rounded-full border border-white/10 bg-white/5 p-2">
              <AvatarCircle name={displayName} avatarUrl={remoteAvatarUrl} size={148} textSize="text-5xl" />
            </View>
            <Text className="mt-5 text-2xl font-bold text-white">{displayName}</Text>
            <Text className="mt-1 text-sm text-white/70">
              {hasRemoteAnswered
                ? isGroup
                  ? `${participantCount} người trong cuộc gọi`
                  : callType === 'video' && isPrimaryRemoteCameraOff
                    ? 'Camera đối phương đang tắt'
                    : 'Đang kết nối âm thanh'
                : 'Đang chờ trả lời...'}
            </Text>
          </LinearGradient>
        )}
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(2,6,23,0.78)', 'rgba(2,6,23,0.08)', 'rgba(2,6,23,0.92)']}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      />

      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-5"
        style={{ top: Math.max(insets.top, 18) + 10 }}
      >
        <View className="min-w-0 flex-1 flex-row items-center">
          <AvatarCircle name={displayName} avatarUrl={remoteAvatarUrl} size={42} textSize="text-base" />
          <View className="ml-3 min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text className="max-w-[70%] text-xl font-bold text-white" numberOfLines={1}>
                {displayName}
              </Text>
              {hasRemoteAnswered && (
                <View className="ml-3 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1">
                  <Text className="text-xs font-bold text-[#00ff7f]">
                    {formatDuration(elapsedSeconds)}
                  </Text>
                </View>
              )}
            </View>
            <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">
              {hasRemoteAnswered
                ? isGroup
                  ? `${participantCount} người tham gia`
                  : 'Đã kết nối'
                : isConnecting
                  ? 'Đang kết nối...'
                  : action === 'join'
                    ? 'Đang tham gia...'
                    : 'Đang đổ chuông...'}
            </Text>
          </View>
        </View>

        {callType === 'video' && localStreamUrl && !shouldUseGroupVideoGrid && (
          <View
            className="ml-3 flex-row items-center"
            style={{
              transform: [{ translateX: isLocalPreviewCollapsed ? 86 : 0 }],
            }}
          >
            <Pressable
              onPress={() => setIsLocalPreviewCollapsed((current) => !current)}
              className="z-10 h-20 w-7 items-center justify-center"
            >
              <Feather
                name={isLocalPreviewCollapsed ? 'chevron-left' : 'chevron-right'}
                color="#fff"
                size={20}
              />
            </Pressable>
            <View className="h-28 w-24 overflow-hidden rounded-2xl border border-white/20 bg-[#111827] shadow-lg">
              {isCameraOff ? (
                <View className="flex-1 items-center justify-center">
                  <AvatarCircle name={myDisplayName} avatarUrl={myAvatarUrl} size={48} textSize="text-lg" />
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
        <View className="mb-5 items-center px-6">
          <View className="flex-row items-start gap-5 rounded-[32px] border border-white/10 bg-black/55 px-5 py-4">
            <CallControlButton
              icon={isMuted ? 'mic-off' : 'mic'}
              label={isMuted ? 'Bật mic' : 'Tắt mic'}
              active={isMuted}
              onPress={toggleMic}
            />

            {callType === 'video' && (
              <CallControlButton
                icon={isCameraOff ? 'video-off' : 'video'}
                label={isCameraOff ? 'Bật cam' : 'Tắt cam'}
                active={isCameraOff}
                onPress={toggleCamera}
              />
            )}

            <CallControlButton
              icon="phone-off"
              label="Kết thúc"
              danger
              onPress={() => void handleLeave()}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
