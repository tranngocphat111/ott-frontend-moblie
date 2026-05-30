import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type DimensionValue,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/Authcontext';
import { THEME_COLORS } from '@/constants/theme';
import { useMobileCall } from '@/hooks/useMobileCall';
import { chatSocket, type CallType } from '@/services/socket/chatSocket';
import { getAvatarFallbackLabel, resolveMediaUrl } from '@/utils/chat';
import { ChatApi } from '@/services/api';
import { LIVEKIT_CONFIG } from '@/configuration/api';
import { DEFAULT_SYSTEM_BACKGROUND, useSystemBackground } from '@/utils/useSystemBackground';

declare const require: any;

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

type SafeRTCViewProps = {
  streamURL?: string;
  objectFit?: 'contain' | 'cover';
  mirror?: boolean;
  zOrder?: number;
  style?: ViewStyle;
};

let cachedRTCView: React.ComponentType<any> | null | false = null;

const getRTCViewComponent = () => {
  if (cachedRTCView === false) return null;
  if (cachedRTCView) return cachedRTCView;

  try {
    cachedRTCView = require('@livekit/react-native-webrtc').RTCView;
    return cachedRTCView;
  } catch (error) {
    console.warn('Không thể tải RTCView native:', error);
    cachedRTCView = false;
    return null;
  }
};

const SafeRTCView: React.FC<SafeRTCViewProps> = (props) => {
  const RTCViewComponent = useMemo(() => getRTCViewComponent(), []);
  if (!RTCViewComponent || !props.streamURL) {
    return <View style={props.style} />;
  }

  return <RTCViewComponent {...props} />;
};

const isUsableAvatar = (value?: string | null) => {
  const normalized = String(value || '').trim();
  return !!normalized && normalized !== 'null' && normalized !== 'undefined';
};

const getInitial = (value?: string | null) => {
  return getAvatarFallbackLabel(value || 'U');
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

type CallMemberOption = {
  id: string;
  name: string;
  avatarUrl: string;
};

const getMemberId = (member: any) =>
  String(member?.user_id || member?.user?.user_id || member?._id || '').trim();

const getMemberName = (member: any, fallback: string) =>
  String(
    member?.nickname ||
      member?.display_name ||
      member?.name ||
      member?.user?.name ||
      member?.user?.fullName ||
      fallback,
  ).trim();

const getMemberAvatar = (member: any) =>
  resolveMediaUrl(
    String(member?.avatar || member?.user?.avatar || member?.user?.avatarUrl || '').trim(),
  );

const getCallErrorMessage = (error: unknown) => {
  const reason = String((error as any)?.message || '').trim();

  if (/busy|caller_busy/i.test(reason)) {
    return 'Bạn hoặc người nhận đang ở trong một cuộc gọi khác.';
  }

  if (/call_not_found|ended/i.test(reason)) {
    return 'Cuộc gọi này đã kết thúc hoặc không còn tồn tại.';
  }

  if (/already_joined_elsewhere|stale_device_ignored/i.test(reason)) {
    return 'Cuộc gọi này đã được nhận trên thiết bị khác.';
  }

  if (/already_active/i.test(reason)) {
    return 'Cuộc gọi nhóm đang diễn ra. Hãy bấm tham gia lại sau vài giây.';
  }

  if (/permission|not.?allowed|denied/i.test(reason)) {
    return 'Không thể mở camera hoặc micro. Hãy kiểm tra quyền truy cập của ứng dụng.';
  }

  return 'Không thể kết nối cuộc gọi. Vui lòng thử lại.';
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
        danger ? 'bg-[#ef4444]' : active ? 'bg-[#ef4444]' : 'bg-[#5b422f]'
      }`}
    >
      <Feather name={icon} color="#fff" size={23} />
    </Pressable>
    <Text className="mt-1.5 text-[11px] font-semibold text-white/80">{label}</Text>
  </View>
);

type SafeLiveKitGroupCallViewProps = {
  token: string;
  serverUrl: string;
  title: string;
  avatarUrl?: string;
  elapsedLabel: string;
  participantCount: number;
  participantDisplayById: Record<string, { name: string; avatar?: string }>;
  onLeave: () => void;
  onOpenInvite?: () => void;
};

const LiveKitFallbackCallView: React.FC<SafeLiveKitGroupCallViewProps> = ({
  title,
  avatarUrl,
  elapsedLabel,
  participantCount,
  onLeave,
  onOpenInvite,
}) => {
  const insets = useSafeAreaInsets();
  const controlsBottomPadding = Math.max(insets.bottom + 12, 20);

  return (
    <View className="flex-1 bg-[#160f0a]">
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#3b2718', '#1d130c', '#100b07']}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View className="absolute left-5 right-5 top-12 z-10 flex-row items-center justify-between">
        <View className="min-w-0 flex-1 flex-row items-center">
          <AvatarCircle name={title} avatarUrl={avatarUrl} size={42} textSize="text-base" />
          <View className="ml-3 min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text className="max-w-[70%] text-xl font-bold text-white" numberOfLines={1}>
                {title}
              </Text>
              <View className="ml-3 rounded-lg bg-black/50 px-2.5 py-1">
                <Text className="text-xs font-bold text-[#7CFFB2]">{elapsedLabel}</Text>
              </View>
            </View>
            <Text
              className="mt-1 text-xs font-semibold uppercase"
              style={{ color: 'rgba(255,255,255,0.72)' }}
            >
              {participantCount} người tham gia
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <AvatarCircle name={title} avatarUrl={avatarUrl} size={148} textSize="text-5xl" />
        <Text className="mt-5 text-center text-2xl font-bold text-white">{title}</Text>
        <View className="mt-4 flex-row items-center rounded-2xl bg-black/40 px-4 py-3">
          <ActivityIndicator color={THEME_COLORS.primary[300]} size="small" />
          <Text className="ml-3 flex-1 text-center text-sm font-semibold text-white/80">
            Đang giữ kết nối cuộc gọi...
          </Text>
        </View>
      </View>

      <View
        className="absolute bottom-0 left-0 right-0 items-center px-6"
        style={{ paddingBottom: controlsBottomPadding }}
      >
        <View className="flex-row items-start gap-5 rounded-[30px] bg-[#1c120c]/92 px-4 py-3 shadow-lg">
          {onOpenInvite && (
            <CallControlButton icon="user-plus" label="Thêm" onPress={onOpenInvite} />
          )}
          <CallControlButton icon="phone-off" label="Kết thúc" danger onPress={onLeave} />
        </View>
      </View>
    </View>
  );
};

const SafeLiveKitGroupCallView: React.FC<SafeLiveKitGroupCallViewProps> = (props) => {
  const [LiveKitView, setLiveKitView] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    try {
      const livekitNative = require('@livekit/react-native');
      livekitNative?.registerGlobals?.();
      const module = require('../../components/call/LiveKitGroupCallView');
      if (mounted && module?.LiveKitGroupCallView) {
        setLiveKitView(() => module.LiveKitGroupCallView);
      }
    } catch (error) {
      console.warn('Không thể tải giao diện LiveKit native:', error);
    }

    return () => {
      mounted = false;
    };
  }, []);

  if (!LiveKitView) {
    return <LiveKitFallbackCallView {...props} />;
  }

  return <LiveKitView {...props} />;
};

export default function CallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const controlsBottomPadding = Math.max(insets.bottom + 12, 20);
  useSystemBackground('#160f0a', DEFAULT_SYSTEM_BACKGROUND, 'light');
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
    currentCallId,
    livekitToken,
    startCall,
    joinExistingCall,
    endCall,
    toggleMic,
    toggleCamera,
  } = useMobileCall({ conversationId, userId });

  const hasRemoteAnswered =
    remoteStreams.length > 0 ||
    participants.some((participantId) => String(participantId) !== String(userId));
  const [callError, setCallError] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<CallMemberOption[]>([]);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

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
        setCallError(getCallErrorMessage(error));
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
    if (!isGroup || !conversationId) return;

    let cancelled = false;
    ChatApi.getConversationMembers(conversationId)
      .then((members) => {
        if (cancelled) return;
        const mapped = (members || [])
          .map((member: any) => {
            const id = getMemberId(member);
            if (!id) return null;
            return {
              id,
              name: getMemberName(member, id),
              avatarUrl: getMemberAvatar(member),
            };
          })
          .filter((member): member is CallMemberOption => !!member);
        setGroupMembers(mapped);
      })
      .catch((error) => {
        console.warn('Không thể tải thành viên cuộc gọi:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, isGroup]);

  useEffect(() => {
    if (busyUserIds.length === 0) return;
    const isCallerBusy = busyUserIds.some((id) => String(id) === String(userId));
    Alert.alert(
      isCallerBusy ? 'Đang trong cuộc gọi' : 'Không thể kết nối',
      isCallerBusy
        ? 'Bạn đang trong một cuộc gọi khác. Vui lòng kết thúc cuộc gọi hiện tại trước khi gọi mới.'
        : 'Người nhận đang trong một cuộc gọi khác.',
      [
      {
        text: 'Đóng',
        onPress: () => {
          void endCall(false);
          router.back();
        },
      },
      ],
    );
  }, [busyUserIds, endCall, router, userId]);

  useEffect(() => {
    const handleAnsweredElsewhere = (payload: {
      conversationId?: string;
      callId?: string;
      userId?: string;
    }) => {
      if (String(payload?.userId || '') !== String(userId || '')) return;
      if (String(payload?.conversationId || '') !== String(conversationId || '')) return;
      const activeCallId = currentCallId || callId;
      if (
        activeCallId &&
        payload?.callId &&
        String(payload.callId) !== String(activeCallId)
      ) {
        return;
      }

      void endCall(false);
      setCallError('Cuộc gọi này đã được nhận trên thiết bị khác.');
    };

    chatSocket.on('cuoc_goi_da_nhan_o_thiet_bi_khac', handleAnsweredElsewhere as any);
    return () => {
      chatSocket.off('cuoc_goi_da_nhan_o_thiet_bi_khac', handleAnsweredElsewhere as any);
    };
  }, [callId, conversationId, currentCallId, endCall, userId]);

  const shouldRunTimer = isInCall && (hasRemoteAnswered || isGroup);

  useEffect(() => {
    if (shouldRunTimer) {
      if (!connectedAtRef.current) {
        connectedAtRef.current = Date.now();
      }
      return;
    }

    connectedAtRef.current = null;
    setElapsedSeconds(0);
  }, [shouldRunTimer]);

  useEffect(() => {
    if (!connectedAtRef.current) return;

    const timer = setInterval(() => {
      if (!connectedAtRef.current) return;
      setElapsedSeconds(Math.floor((Date.now() - connectedAtRef.current) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [shouldRunTimer]);

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
  const livekitServerUrl = LIVEKIT_CONFIG.URL.trim();
  const shouldUseLiveKitGroup = isGroup && !!livekitToken && !!livekitServerUrl;
  const participantDisplayById = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string }> = {};
    groupMembers.forEach((member) => {
      map[member.id] = { name: member.name, avatar: member.avatarUrl };
    });
    if (userId) {
      map[userId] = { name: myDisplayName || 'Bạn', avatar: myAvatarUrl };
    }
    return map;
  }, [groupMembers, myAvatarUrl, myDisplayName, userId]);
  const participantIdSet = useMemo(
    () => new Set(participants.map((id) => String(id || ''))),
    [participants],
  );
  const inviteCandidates = useMemo(
    () =>
      groupMembers.filter(
        (member) =>
          member.id &&
          member.id !== String(userId) &&
          !participantIdSet.has(member.id),
      ),
    [groupMembers, participantIdSet, userId],
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

  const toggleInvitee = (memberId: string) => {
    setSelectedInviteeIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const handleOpenInviteModal = () => {
    setSelectedInviteeIds([]);
    setInviteModalVisible(true);
  };

  const handleInviteMembers = async () => {
    if (!conversationId || !userId || selectedInviteeIds.length === 0) return;

    setInviteSubmitting(true);
    try {
      chatSocket.inviteCallMembers(
        conversationId,
        currentCallId,
        selectedInviteeIds,
        userId,
      );
      setInviteModalVisible(false);
      setSelectedInviteeIds([]);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const inviteMembersModal = (
    <Modal
      visible={inviteModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setInviteModalVisible(false)}
    >
      <View className="flex-1 justify-end bg-black/55">
        <View className="max-h-[70%] rounded-t-[28px] border border-[#ead8c7] bg-[#fffaf6] px-5 pb-6 pt-5">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-[#231a10]">Thêm vào cuộc gọi</Text>
              <Text className="mt-1 text-xs font-medium text-[#8b6642]">
                Mời thành viên nhóm đang chưa tham gia
              </Text>
            </View>
            <Pressable
              onPress={() => setInviteModalVisible(false)}
              className="h-10 w-10 items-center justify-center rounded-full bg-[#efe7e0]"
            >
              <Feather name="x" size={20} color="#694d31" />
            </Pressable>
          </View>

          {inviteCandidates.length === 0 ? (
            <View className="items-center rounded-2xl border border-[#ead8c7] bg-white px-4 py-8">
              <Feather name="users" size={28} color="#b78457" />
              <Text className="mt-3 text-center text-sm font-semibold text-[#694d31]">
                Tất cả thành viên khả dụng đã ở trong cuộc gọi.
              </Text>
            </View>
          ) : (
            <FlatList
              data={inviteCandidates}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = selectedInviteeIds.includes(item.id);
                return (
                  <Pressable
                    onPress={() => toggleInvitee(item.id)}
                    className={`mb-2 flex-row items-center rounded-2xl border px-3 py-3 ${
                      selected
                        ? 'border-[#b78457] bg-[#f5e8dc]'
                        : 'border-[#ead8c7] bg-white'
                    }`}
                  >
                    <AvatarCircle
                      name={item.name}
                      avatarUrl={item.avatarUrl}
                      size={42}
                      textSize="text-base"
                    />
                    <Text className="ml-3 flex-1 text-[14px] font-bold text-[#231a10]" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full ${
                        selected ? 'bg-[#b78457]' : 'border border-[#d8b79a] bg-white'
                      }`}
                    >
                      {selected && <Feather name="check" size={15} color="#fff" />}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          <Pressable
            disabled={selectedInviteeIds.length === 0 || inviteSubmitting}
            onPress={() => void handleInviteMembers()}
            className={`mt-4 h-12 items-center justify-center rounded-2xl ${
              selectedInviteeIds.length === 0 || inviteSubmitting
                ? 'bg-[#d8c8b8]'
                : 'bg-[#8b6642]'
            }`}
          >
            <Text className="text-sm font-bold text-white">
              {inviteSubmitting ? 'Đang mời...' : `Mời ${selectedInviteeIds.length || ''}`.trim()}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  if (!conversationId || !userId) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        className="flex-1 items-center justify-center bg-[#160f0a] px-6"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
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

  if (callError) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        className="flex-1 items-center justify-center bg-[#160f0a] px-6"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="w-full rounded-[28px] border border-[#d0a97e]/30 bg-[#fffaf6] px-5 py-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#f5e8dc]">
            <Feather name="video-off" size={24} color="#8b6642" />
          </View>
          <Text className="mt-4 text-xl font-bold text-[#231a10]">Không thể tham gia cuộc gọi</Text>
          <Text className="mt-2 text-sm leading-5 text-[#694d31]">{callError}</Text>
          <Pressable
            onPress={() => {
              void endCall(false);
              if (router.canGoBack()) router.back();
              else router.replace('/(main)/(tabs)/home');
            }}
            className="mt-5 h-12 items-center justify-center rounded-2xl bg-[#8b6642]"
          >
            <Text className="font-bold text-white">Quay lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (shouldUseLiveKitGroup) {
    return (
      <>
        <SafeLiveKitGroupCallView
          token={livekitToken}
          serverUrl={livekitServerUrl}
          title={displayName}
          avatarUrl={remoteAvatarUrl}
          elapsedLabel={formatDuration(elapsedSeconds)}
          participantCount={participantCount}
          participantDisplayById={participantDisplayById}
          onLeave={() => void handleLeave()}
          onOpenInvite={handleOpenInviteModal}
        />
        {inviteMembersModal}
      </>
    );
  }

  return (
    <View className="flex-1 bg-[#160f0a]">
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View className="absolute inset-0">
        {shouldUseGroupVideoGrid ? (
          <View className="flex-1 flex-row flex-wrap bg-[#100b07] p-1">
            {localStreamUrl && (
              <View className="p-1" style={groupVideoTileStyle}>
                <View className="flex-1 overflow-hidden rounded-2xl bg-[#2b1d13]">
                  {isCameraOff ? (
                    <View className="flex-1 items-center justify-center">
                      <AvatarCircle name={myDisplayName} avatarUrl={myAvatarUrl} size={76} textSize="text-2xl" />
                      <View className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/60">
                        <Feather name="video-off" size={15} color="#fff" />
                      </View>
                      <View className="absolute bottom-0 left-0 right-0 bg-black/55 px-3 py-2">
                        <Text className="text-xs font-bold text-white" numberOfLines={1}>Bạn</Text>
                      </View>
                    </View>
                  ) : (
                    <SafeRTCView
                      streamURL={localStreamUrl}
                      objectFit="cover"
                      mirror
                      zOrder={1}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </View>
            )}
            {remoteStreams.map((item, index) => {
              const streamUrl = item.stream.toURL();
              const isRemoteCameraOff = remoteCameraStates[item.userId] === true;
              const remoteLabel = `Thành viên ${index + 1}`;
              return (
                <View
                  key={item.userId}
                  className="p-1"
                  style={groupVideoTileStyle}
                >
                  <View className="flex-1 overflow-hidden rounded-2xl bg-[#2b1d13]">
                    {streamUrl && !isRemoteCameraOff ? (
                      <SafeRTCView
                        streamURL={streamUrl}
                        objectFit="cover"
                        mirror={false}
                        zOrder={0}
                        style={{ flex: 1 }}
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <AvatarCircle name={remoteLabel} size={76} textSize="text-2xl" />
                        <View className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/60">
                          <Feather name="video-off" size={15} color="#fff" />
                        </View>
                        <View className="absolute bottom-0 left-0 right-0 bg-black/55 px-3 py-2">
                          <Text className="text-xs font-bold text-white" numberOfLines={1}>
                            {remoteLabel}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : shouldShowPrimaryRemoteVideo ? (
          <SafeRTCView
            streamURL={remoteStreamUrl}
            objectFit="cover"
            mirror={false}
            zOrder={0}
            style={{ flex: 1 }}
          />
        ) : (
          <LinearGradient
            colors={['#3b2718', '#1d130c', '#100b07']}
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
        colors={['rgba(35,26,16,0.78)', 'rgba(35,26,16,0.08)', 'rgba(16,11,7,0.92)']}
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
                <View className="ml-3 rounded-lg bg-black/60 px-2.5 py-1">
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
            <View className="h-28 w-24 overflow-hidden rounded-[22px] bg-[#2b1d13] shadow-lg">
              {isCameraOff ? (
                <View className="flex-1 items-center justify-center">
                  <AvatarCircle name={myDisplayName} avatarUrl={myAvatarUrl} size={48} textSize="text-lg" />
                </View>
              ) : (
                <SafeRTCView
                  streamURL={localStreamUrl}
                  objectFit="cover"
                  mirror
                  zOrder={1}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </View>
        )}
      </View>

      {!isInCall && !isConnecting && (
        <View className="absolute inset-0 items-center justify-center bg-[#160f0a]/80 px-6">
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

      <View
        className="absolute bottom-0 left-0 right-0 items-center px-6"
        style={{ paddingBottom: controlsBottomPadding }}
      >
        <View className="flex-row items-start gap-5 rounded-[30px] bg-[#1c120c]/92 px-4 py-3 shadow-lg">
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

          {isGroup && (
            <CallControlButton
              icon="user-plus"
              label="Thêm"
              onPress={handleOpenInviteModal}
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
      {inviteMembersModal}
    </View>
  );
}
