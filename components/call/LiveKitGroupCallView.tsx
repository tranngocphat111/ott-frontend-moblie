import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  useLocalParticipant,
  useTracks,
  VideoTrack,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME_COLORS } from '@/constants/theme';
import { getAvatarFallbackLabel, resolveMediaUrl } from '@/utils/chat';

type ParticipantDisplay = {
  name: string;
  avatar?: string;
};

type LiveKitGroupCallViewProps = {
  token: string;
  serverUrl: string;
  title: string;
  avatarUrl?: string;
  elapsedLabel: string;
  participantCount: number;
  participantDisplayById: Record<string, ParticipantDisplay>;
  onLeave: () => void;
  onOpenInvite?: () => void;
};

const getInitial = (value?: string | null) => {
  return getAvatarFallbackLabel(value);
};

const getTrackKey = (trackRef: TrackReferenceOrPlaceholder) =>
  `${trackRef.participant.identity}:${trackRef.source}`;

const getParticipantMetadata = (participant: any): ParticipantDisplay | null => {
  const rawMetadata = String(participant?.metadata || '').trim();
  if (!rawMetadata) return null;

  try {
    const parsed = JSON.parse(rawMetadata);
    const name = String(parsed?.name || '').trim();
    const avatar = String(parsed?.avatar || '').trim();
    if (!name && !avatar) return null;
    return { name, avatar };
  } catch {
    return null;
  }
};

const ParticipantAvatar = ({
  display,
  fallback,
  size = 70,
}: {
  display?: ParticipantDisplay;
  fallback: string;
  size?: number;
}) => {
  const [broken, setBroken] = useState(false);
  const avatar = resolveMediaUrl(String(display?.avatar || '').trim());
  const showAvatar = !!avatar && !broken;

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[#5b422f]"
      style={{ width: size, height: size }}
    >
      {showAvatar ? (
        <Image
          source={{ uri: avatar }}
          className="h-full w-full"
          resizeMode="cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <Text className="text-2xl font-bold text-white">
          {getInitial(display?.name || fallback)}
        </Text>
      )}
    </View>
  );
};

const LiveKitControls = ({
  onLeave,
  onOpenInvite,
}: {
  onLeave: () => void;
  onOpenInvite?: () => void;
}) => {
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
  } = useLocalParticipant();
  const [busyControl, setBusyControl] = useState<'mic' | 'camera' | null>(null);
  const [displayMicEnabled, setDisplayMicEnabled] = useState(true);
  const [displayCameraEnabled, setDisplayCameraEnabled] = useState(true);
  const micSettledRef = useRef(false);
  const cameraSettledRef = useRef(false);

  useEffect(() => {
    if (isMicrophoneEnabled) {
      micSettledRef.current = true;
      setDisplayMicEnabled(true);
      return;
    }

    if (micSettledRef.current) {
      setDisplayMicEnabled(false);
    }
  }, [isMicrophoneEnabled]);

  useEffect(() => {
    if (isCameraEnabled) {
      cameraSettledRef.current = true;
      setDisplayCameraEnabled(true);
      return;
    }

    if (cameraSettledRef.current) {
      setDisplayCameraEnabled(false);
    }
  }, [isCameraEnabled]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isMicrophoneEnabled) {
        micSettledRef.current = true;
        setDisplayMicEnabled(false);
      }
      if (!isCameraEnabled) {
        cameraSettledRef.current = true;
        setDisplayCameraEnabled(false);
      }
    }, 4500);

    return () => clearTimeout(timeoutId);
  }, [isCameraEnabled, isMicrophoneEnabled]);

  const toggleMic = async () => {
    if (busyControl) return;
    const nextEnabled = !displayMicEnabled;
    micSettledRef.current = true;
    setDisplayMicEnabled(nextEnabled);
    setBusyControl('mic');
    try {
      await localParticipant.setMicrophoneEnabled(nextEnabled);
    } catch {
      setDisplayMicEnabled(!nextEnabled);
    } finally {
      setBusyControl(null);
    }
  };

  const toggleCamera = async () => {
    if (busyControl) return;
    const nextEnabled = !displayCameraEnabled;
    cameraSettledRef.current = true;
    setDisplayCameraEnabled(nextEnabled);
    setBusyControl('camera');
    try {
      await localParticipant.setCameraEnabled(nextEnabled);
    } catch {
      setDisplayCameraEnabled(!nextEnabled);
    } finally {
      setBusyControl(null);
    }
  };

  const buttonBase = 'h-14 w-14 items-center justify-center rounded-full';
  const labelBase = 'mt-1.5 text-[11px] font-semibold text-white/80';

  return (
    <View className="flex-row items-start gap-4 rounded-[32px] border border-[#8b6642]/40 bg-[#1c120c]/88 px-5 py-4">
      <View className="items-center">
        <Pressable
          onPress={() => void toggleMic()}
          className={`${buttonBase} ${displayMicEnabled ? 'bg-[#5b422f]' : 'bg-[#ef4444]'}`}
        >
          <Feather
            name={displayMicEnabled ? 'mic' : 'mic-off'}
            size={23}
            color="#fff"
          />
        </Pressable>
        <Text className={labelBase}>{displayMicEnabled ? 'Tắt mic' : 'Bật mic'}</Text>
      </View>

      <View className="items-center">
        <Pressable
          onPress={() => void toggleCamera()}
          className={`${buttonBase} ${displayCameraEnabled ? 'bg-[#5b422f]' : 'bg-[#ef4444]'}`}
        >
          <Feather
            name={displayCameraEnabled ? 'video' : 'video-off'}
            size={23}
            color="#fff"
          />
        </Pressable>
        <Text className={labelBase}>{displayCameraEnabled ? 'Tắt cam' : 'Bật cam'}</Text>
      </View>

      {onOpenInvite && (
        <View className="items-center">
          <Pressable onPress={onOpenInvite} className={`${buttonBase} bg-[#b78457]`}>
            <Feather name="user-plus" size={23} color="#fff" />
          </Pressable>
          <Text className={labelBase}>Thêm</Text>
        </View>
      )}

      <View className="items-center">
        <Pressable onPress={onLeave} className={`${buttonBase} bg-[#ef4444]`}>
          <Feather name="phone-off" size={23} color="#fff" />
        </Pressable>
        <Text className={labelBase}>Kết thúc</Text>
      </View>
    </View>
  );
};

const FallbackControls = ({
  onLeave,
  onOpenInvite,
}: {
  onLeave: () => void;
  onOpenInvite?: () => void;
}) => {
  const buttonBase = 'h-14 w-14 items-center justify-center rounded-full';
  const labelBase = 'mt-1.5 text-[11px] font-semibold text-white/80';

  return (
    <View className="flex-row items-start gap-4 rounded-[32px] border border-[#8b6642]/40 bg-[#1c120c]/88 px-5 py-4">
      {onOpenInvite && (
        <View className="items-center">
          <Pressable onPress={onOpenInvite} className={`${buttonBase} bg-[#b78457]`}>
            <Feather name="user-plus" size={23} color="#fff" />
          </Pressable>
          <Text className={labelBase}>Thêm</Text>
        </View>
      )}

      <View className="items-center">
        <Pressable onPress={onLeave} className={`${buttonBase} bg-[#ef4444]`}>
          <Feather name="phone-off" size={23} color="#fff" />
        </Pressable>
        <Text className={labelBase}>Kết thúc</Text>
      </View>
    </View>
  );
};

const LiveKitConnectingFallback = ({
  title,
  avatarUrl,
  elapsedLabel,
  participantCount,
  notice,
  onLeave,
  onOpenInvite,
}: Omit<LiveKitGroupCallViewProps, 'token' | 'serverUrl' | 'participantDisplayById'> & {
  notice?: string | null;
}) => {
  const insets = useSafeAreaInsets();
  const controlsBottomPadding = Math.max(insets.bottom + 12, 20);

  return (
    <View className="absolute inset-0 bg-[#160f0a]">
      <LinearGradient
        colors={['#3b2718', '#1d130c', '#100b07']}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View className="absolute left-5 right-5 top-12 flex-row items-center justify-between">
        <View className="min-w-0 flex-1 flex-row items-center">
          <ParticipantAvatar
            display={{ name: title, avatar: avatarUrl }}
            fallback={title}
            size={42}
          />
          <View className="ml-3 min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text className="max-w-[70%] text-xl font-bold text-white" numberOfLines={1}>
                {title}
              </Text>
              <View className="ml-3 rounded-lg border border-[#d0a97e]/20 bg-black/45 px-2.5 py-1">
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
        <ParticipantAvatar display={{ name: title, avatar: avatarUrl }} fallback={title} size={148} />
        <Text className="mt-5 text-center text-2xl font-bold text-white">{title}</Text>
        <View className="mt-4 flex-row items-center rounded-2xl border border-[#d0a97e]/20 bg-black/35 px-4 py-3">
          {!notice && <ActivityIndicator color={THEME_COLORS.primary[300]} size="small" />}
          <Text className={`${notice ? '' : 'ml-3'} flex-1 text-center text-sm font-semibold text-white/80`}>
            {notice || 'Đang kết nối phòng gọi...'}
          </Text>
        </View>
      </View>

      <View
        className="absolute bottom-0 left-0 right-0 items-center px-5"
        style={{ paddingBottom: controlsBottomPadding }}
      >
        <FallbackControls onLeave={onLeave} onOpenInvite={onOpenInvite} />
      </View>
    </View>
  );
};

class LiveKitRenderBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error) => void;
  },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

const LiveKitRoomContent = ({
  title,
  avatarUrl,
  elapsedLabel,
  participantCount,
  participantDisplayById,
  onLeave,
  onOpenInvite,
}: Omit<LiveKitGroupCallViewProps, 'token' | 'serverUrl'>) => {
  const insets = useSafeAreaInsets();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });
  const controlsBottomPadding = Math.max(insets.bottom + 12, 20);

  useEffect(() => {
    const enableInitialMedia = async () => {
      await Promise.allSettled([
        localParticipant.setMicrophoneEnabled(true),
        localParticipant.setCameraEnabled(true),
      ]);
    };

    const retryIds = [0, 650, 1800].map((delay) =>
      setTimeout(() => {
        void enableInitialMedia();
      }, delay),
    );

    return () => {
      retryIds.forEach((retryId) => clearTimeout(retryId));
    };
  }, [localParticipant]);

  const sortedTracks = useMemo(() => {
    return [...tracks].sort((left, right) => {
      const leftLocal = left.participant.isLocal ? 0 : 1;
      const rightLocal = right.participant.isLocal ? 0 : 1;
      if (leftLocal !== rightLocal) return leftLocal - rightLocal;
      return String(left.participant.identity).localeCompare(String(right.participant.identity));
    });
  }, [tracks]);

  const tileStyle = useMemo(() => {
    const count = Math.max(sortedTracks.length, 1);
    if (count <= 1) return { width: '100%' as const, height: '100%' as const };
    if (count <= 2) return { width: '100%' as const, height: '50%' as const };
    if (count <= 4) return { width: '50%' as const, height: '50%' as const };
    if (count <= 6) return { width: '50%' as const, height: '33.3333%' as const };
    return { width: '50%' as const, height: '25%' as const };
  }, [sortedTracks.length]);

  const renderTile = (item: TrackReferenceOrPlaceholder, index: number) => {
    return renderCallTile(item, index, {
      compact: false,
      style: tileStyle,
    });
  };

  const renderCallTile = (
    item: TrackReferenceOrPlaceholder,
    index: number,
    options: { compact?: boolean; style: any },
  ) => {
    const compact = Boolean(options.compact);
    const identity = String(item.participant.identity || '');
    const metadata = getParticipantMetadata(item.participant);
    const display =
      participantDisplayById[identity] ||
      (metadata?.name || metadata?.avatar ? metadata : undefined);
    const label = item.participant.isLocal
      ? 'Bạn'
      : display?.name || String(item.participant.name || '').trim() || `Thành viên ${index + 1}`;
    const trackRef = isTrackReference(item) ? item : undefined;
    const hasVideo = !!trackRef && !trackRef.publication?.isMuted;

    return (
      <View
        key={`${item.participant.identity}:${item.source}`}
        className={compact ? '' : 'p-1.5'}
        style={options.style}
      >
        <View className="flex-1 overflow-hidden rounded-2xl border border-[#d0a97e]/25 bg-[#2b1d13]">
          {hasVideo ? (
            <VideoTrack
              trackRef={trackRef}
              objectFit="cover"
              mirror={item.participant.isLocal}
              style={{ flex: 1 }}
            />
          ) : (
            <LinearGradient
              colors={['#4a3323', '#2b1d13']}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <ParticipantAvatar display={display} fallback={label} size={compact ? 48 : 76} />
              {!compact && (
                <View className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/55">
                  <Feather name="video-off" size={15} color="#fff" />
                </View>
              )}
            </LinearGradient>
          )}

          <View className={`absolute bottom-0 left-0 right-0 bg-black/48 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
            <Text className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-white`} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  const isTwoPersonLayout = sortedTracks.length === 2;
  const twoPersonPrimaryTrack = isTwoPersonLayout
    ? sortedTracks.find((trackRef) => !trackRef.participant.isLocal) || sortedTracks[0]
    : null;
  const twoPersonSecondaryTrack =
    isTwoPersonLayout && twoPersonPrimaryTrack
      ? sortedTracks.find((trackRef) => getTrackKey(trackRef) !== getTrackKey(twoPersonPrimaryTrack)) || null
      : null;

  return (
    <View className="flex-1 bg-[#160f0a]">
      <LinearGradient
        colors={['#3b2718', '#1d130c', '#100b07']}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View className="absolute left-5 right-5 top-12 z-10 flex-row items-center justify-between">
        <View className="min-w-0 flex-1 flex-row items-center">
          <ParticipantAvatar
            display={{ name: title, avatar: avatarUrl }}
            fallback={title}
            size={42}
          />
          <View className="ml-3 min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text className="max-w-[70%] text-xl font-bold text-white" numberOfLines={1}>
                {title}
              </Text>
              <View className="ml-3 rounded-lg border border-[#d0a97e]/20 bg-black/45 px-2.5 py-1">
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

      {isTwoPersonLayout && twoPersonPrimaryTrack ? (
        <View
          className="flex-1 px-1.5 pt-28"
          style={{ paddingBottom: controlsBottomPadding + 124 }}
        >
          <View className="flex-1">
            {renderCallTile(twoPersonPrimaryTrack, 0, {
              style: { width: '100%', height: '100%' },
            })}
          </View>
          {twoPersonSecondaryTrack && (
            <View className="absolute right-5 top-36 z-20 h-40 w-28">
              {renderCallTile(twoPersonSecondaryTrack, 1, {
                compact: true,
                style: { width: '100%', height: '100%' },
              })}
            </View>
          )}
        </View>
      ) : sortedTracks.length > 0 ? (
        <View
          className="flex-1 flex-row flex-wrap px-1.5 pt-28"
          style={{ paddingBottom: controlsBottomPadding + 124 }}
        >
          {sortedTracks.map(renderTile)}
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <ParticipantAvatar display={{ name: title, avatar: avatarUrl }} fallback={title} size={148} />
          <Text className="mt-5 text-center text-2xl font-bold text-white">{title}</Text>
          <Text className="mt-2 text-center text-sm text-white/70">
            Đang kết nối phòng gọi...
          </Text>
        </View>
      )}

      <View
        className="absolute bottom-0 left-0 right-0 items-center px-5"
        style={{ paddingBottom: controlsBottomPadding }}
      >
        <LiveKitControls
          onLeave={onLeave}
          onOpenInvite={onOpenInvite}
        />
      </View>
    </View>
  );
};

export const LiveKitGroupCallView: React.FC<LiveKitGroupCallViewProps> = ({
  token,
  serverUrl,
  title,
  avatarUrl,
  elapsedLabel,
  participantCount,
  participantDisplayById,
  onLeave,
  onOpenInvite,
}) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setNotice(null);
    setIsConnected(false);
  }, [token, serverUrl]);

  useEffect(() => {
    if (isConnected) return;

    const timeoutId = setTimeout(() => {
      setNotice((current) =>
        current || 'LiveKit native chưa kết nối được. Hãy kiểm tra APK mới đã cài đúng cấu hình native.',
      );
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [isConnected, token, serverUrl]);

  useEffect(() => {
    void AudioSession.startAudioSession().catch((error) => {
      console.warn('Không thể khởi động audio session LiveKit:', error);
      setNotice('Không thể khởi động âm thanh cuộc gọi. Bạn vẫn có thể thử kết nối lại.');
    });

    return () => {
      void AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, []);

  return (
    <View className="flex-1 bg-[#160f0a]">
      <LiveKitRenderBoundary
        onError={(error) => {
          console.error('LiveKit mobile render error:', error);
          setIsConnected(false);
          setNotice('Không thể mở giao diện phòng gọi. Vui lòng thoát ra và tham gia lại.');
        }}
      >
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          audio
          video
          options={{ adaptiveStream: { pixelDensity: 'screen' }, dynacast: true }}
          onConnected={() => {
            setIsConnected(true);
            setNotice(null);
          }}
          onDisconnected={() => {
            setIsConnected(false);
          }}
          onError={(error) => {
            console.error('LiveKit mobile room error:', error);
            setIsConnected(false);
            setNotice('Không thể kết nối phòng gọi. Vui lòng thử lại.');
          }}
          onMediaDeviceFailure={() => {
            setNotice('Camera hoặc micro đang bị chặn hay bị ứng dụng khác dùng.');
          }}
        >
          <LiveKitRoomContent
            title={title}
            avatarUrl={avatarUrl}
            elapsedLabel={elapsedLabel}
            participantCount={participantCount}
            participantDisplayById={participantDisplayById}
            onLeave={onLeave}
            onOpenInvite={onOpenInvite}
          />

          {notice && isConnected && (
            <View className="absolute left-5 right-5 top-24 rounded-2xl border border-[#d0a97e]/25 bg-[#2b1d13]/95 px-4 py-3">
              <View className="flex-row items-center">
                <ActivityIndicator color={THEME_COLORS.primary[300]} size="small" />
                <Text className="ml-3 flex-1 text-sm font-semibold text-white">{notice}</Text>
              </View>
            </View>
          )}
        </LiveKitRoom>
      </LiveKitRenderBoundary>

      {!isConnected && (
        <LiveKitConnectingFallback
          title={title}
          avatarUrl={avatarUrl}
          elapsedLabel={elapsedLabel}
          participantCount={participantCount}
          notice={notice}
          onLeave={onLeave}
          onOpenInvite={onOpenInvite}
        />
      )}
    </View>
  );
};
