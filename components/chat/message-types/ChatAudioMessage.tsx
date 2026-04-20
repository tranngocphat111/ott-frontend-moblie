import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Pause, Play } from 'lucide-react-native';
import type { ChatMessage } from '@/types';
import { resolveMediaUrl } from '@/utils/chat';
import { registerAudioPlaybackHandler, resetOtherAudioPlaybacks } from './audioPlaybackManager';

type Props = {
  message: ChatMessage;
  isMine: boolean;
  accentColor?: string;
  fullWidth?: boolean;
};

type AudioSource = {
  url: string;
  durationMs: number;
  mimeType?: string;
};

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const looksLikeAudioPath = (value: string) => {
  const lower = String(value || '').toLowerCase();
  return /\.(m4a|mp3|wav|aac|caf|oga|ogg|opus|webm)(\?|$)/.test(lower);
};

const inferMimeType = (url: string) => {
  const lower = String(url || '').toLowerCase();
  if (lower.includes('.m4a')) return 'audio/mp4';
  if (lower.includes('.mp3')) return 'audio/mpeg';
  if (lower.includes('.wav')) return 'audio/wav';
  if (lower.includes('.aac')) return 'audio/aac';
  if (lower.includes('.caf')) return 'audio/x-caf';
  if (lower.includes('.ogg') || lower.includes('.oga')) return 'audio/ogg';
  if (lower.includes('.opus')) return 'audio/opus';
  if (lower.includes('.webm')) return 'audio/webm';
  return undefined;
};

const isLikelyUnsupportedIOSAudio = (url: string) => {
  const lower = String(url || '').toLowerCase();
  return /\.webm(\?|$)/.test(lower) || /\.opus(\?|$)/.test(lower);
};

const getAudioSource = (message: ChatMessage): AudioSource => {
  const firstContent = Array.isArray(message.content) ? message.content[0] : message.content;
  const candidate = firstContent && typeof firstContent === 'object' ? firstContent : undefined;

  const contentValue = typeof firstContent === 'string' ? firstContent : '';
  const candidateUrl = String(candidate?.url || '');
  const candidateText = String(candidate?.text || '');
  const attachmentUrl = String(message.attachments?.[0]?.url || '');

  const rawUrl =
    (candidateUrl && looksLikeAudioPath(candidateUrl) ? candidateUrl : '') ||
    (candidateText && looksLikeAudioPath(candidateText) ? candidateText : '') ||
    (contentValue && looksLikeAudioPath(contentValue) ? contentValue : '') ||
    candidateUrl ||
    candidateText ||
    contentValue ||
    attachmentUrl;

  const url = resolveMediaUrl(String(rawUrl || ''));
  const durationMs =
    Number((candidate as { durationMs?: number; duration?: number } | undefined)?.durationMs) ||
    Number((candidate as { durationMs?: number; duration?: number } | undefined)?.duration) ||
    Number(message.size || 0);

  return {
    url,
    durationMs: Number.isFinite(durationMs) ? durationMs : 0,
    mimeType: inferMimeType(url),
  };
};

const Waveform = ({ isPlaying }: { isPlaying: boolean }) => {
  const bars = useMemo(() => Array.from({ length: 18 }, (_, index) => index), []);

  return (
    <View className="flex-1 flex-row items-center gap-0.5">
      {bars.map((barIndex) => (
        <View
          key={barIndex}
          style={{
            height: isPlaying ? 8 + ((barIndex * 7) % 14) : 8,
            opacity: isPlaying ? 1 : 0.55,
          }}
          className="w-0.5 rounded-full bg-[#cfb08d]"
        />
      ))}
    </View>
  );
};

export const ChatAudioMessage: React.FC<Props> = ({ message, isMine, accentColor = '#d2a177', fullWidth }) => {
  const audioId = useMemo(() => message.msg_id || message._id, [message._id, message.msg_id]);
  const source = useMemo(() => getAudioSource(message), [message]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(source.durationMs);
  const soundRef = useRef<Audio.Sound | null>(null);
  const sourceUrlRef = useRef('');

  const resetToStart = async () => {
    const sound = soundRef.current;
    if (!sound) return;

    await sound.stopAsync().catch(() => undefined);
    await sound.setPositionAsync(0).catch(() => undefined);
  };

  useEffect(() => {
    setDuration(source.durationMs);
  }, [source.durationMs]);

  useEffect(() => {
    if (sourceUrlRef.current === source.url) return;

    sourceUrlRef.current = source.url;
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(source.durationMs);

    if (soundRef.current) {
      const currentSound = soundRef.current;
      soundRef.current = null;
      void currentSound.unloadAsync().catch(() => undefined);
    }
  }, [source.durationMs, source.url]);

  useEffect(() => {
    if (!source.url) return;
    let isMounted = true;

    const preload = async () => {
      try {
        const sound = await ensureSound();
        const status = await sound.getStatusAsync();
        if (!isMounted || !status.isLoaded) return;
        if (status.durationMillis) {
          setDuration(status.durationMillis);
        }
      } catch {
        return;
      }
    };

    void preload();

    return () => {
      isMounted = false;
    };
  }, [source.url]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (!audioId) return undefined;

    return registerAudioPlaybackHandler(audioId, async () => {
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);
      try {
        if (soundRef.current) {
          await resetToStart();
        }
      } catch {
        return;
      }
    });
  }, [audioId]);

  const ensureSound = async () => {
    if (!source.url) {
      throw new Error('Missing audio url');
    }

    if (soundRef.current) {
      return soundRef.current;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: source.url, ...(source.mimeType ? { overrideFileExtensionAndroid: source.mimeType.split('/')[1] } : {}) },
      { shouldPlay: false, progressUpdateIntervalMillis: 200 },
      (status) => {
        if (!status.isLoaded) return;
        setCurrentTime(status.positionMillis || 0);
        if (status.durationMillis) {
          setDuration(status.durationMillis);
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
          setCurrentTime(0);
          void resetToStart();
        }
      },
    );

    soundRef.current = sound;
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.durationMillis) {
      setDuration(status.durationMillis);
    }
    return sound;
  };

  const togglePlayback = async () => {
    try {
      if (!audioId) return;

      if (Platform.OS === 'ios' && isLikelyUnsupportedIOSAudio(source.url)) {
        Alert.alert('Không hỗ trợ định dạng', 'Voice từ PC hiện đang là WebM/Opus nên iPhone không phát được. Cần đổi sang m4a/mp3 ở phía gửi hoặc backend.');
        return;
      }

      setIsLoading(true);
      await resetOtherAudioPlaybacks(audioId);
      const sound = await ensureSound();
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        return;
      }

      if (status.isPlaying) {
        await resetToStart();
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }

      if (status.positionMillis && status.durationMillis && status.positionMillis >= status.durationMillis - 80) {
        await sound.setPositionAsync(0).catch(() => undefined);
      }

      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.log('Failed to play audio:', error);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(source.durationMs || 0);
    } finally {
      setIsLoading(false);
    }
  };

  const totalDuration = duration || source.durationMs;
  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;
  const displayCurrentTime = formatDuration(currentTime);
  const displayTotalDuration = formatDuration(totalDuration);

  return (
    <View className={`flex-row items-center gap-3.5 rounded-xl border px-3 py-3 shadow-sm ${fullWidth ? 'w-full' : ''} ${isMine ? 'border-[#e6cdb3] bg-[#efdccb]' : 'border-[#eadfd3] bg-white'}`} style={fullWidth ? undefined : { minWidth: 220 }}>
      <Pressable
        onPress={togglePlayback}
        className={`h-11 w-11 items-center justify-center rounded-full ${isMine ? 'bg-[#dfc0a4]' : 'bg-[#f7f3f0]'}`}
        disabled={isLoading || !source.url}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isMine ? '#694d31' : '#8b6642'} />
        ) : isPlaying ? (
          <Pause size={20} color={isMine ? '#694d31' : '#8b6642'} fill={isMine ? '#694d31' : '#8b6642'} />
        ) : (
          <Play size={20} color={isMine ? '#694d31' : '#8b6642'} fill={isMine ? '#694d31' : '#8b6642'} style={{ marginLeft: 2 }} />
        )}
      </Pressable>

      <View className="flex-1 justify-center">
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Mic size={12} color={isMine ? '#8b6642' : '#94a3b8'} />
            <Text className={`text-[13px] font-semibold ${isMine ? 'text-[#463421]' : 'text-[#374151]'}`}>Tin nhắn thoại</Text>
          </View>
          <Text className={`text-[11px] font-medium ${isMine ? 'text-[#494540]' : 'text-[#94a3b8]'}`}>{isPlaying || currentTime > 0 ? displayCurrentTime : displayTotalDuration}</Text>
        </View>

        <View className={`relative h-1.5  rounded-full ${isMine ? 'bg-[#dfc0a4]' : 'bg-[#e5e7eb]'}`}>
          <View style={{ width: `${progressPercent}%` }} className={`absolute left-0 top-0 h-full rounded-full ${isMine ? 'bg-[#694d31]' : 'bg-[#bc9166]'}`} />
          <View style={{ left: `${progressPercent}%`, transform: [{ translateX: -4 }] }} className={`absolute -top-[3px] h-3 w-3 rounded-full border-2 border-white shadow-sm ${isMine ? 'bg-[#694d31]' : 'bg-[#bc9166]'}`} />
        </View>

        <View className="mt-2 h-5">
          <Waveform isPlaying={isPlaying} />
        </View>
      </View>
    </View>
  );
};
