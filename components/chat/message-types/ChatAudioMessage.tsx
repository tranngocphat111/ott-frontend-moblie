import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Pause, Play } from 'lucide-react-native';
import type { ChatMessage } from '@/types';
import { resolveMediaUrl } from '@/utils/chat';
import { registerAudioPlaybackHandler, resetOtherAudioPlaybacks } from './audioPlaybackManager';

type Props = {
  message: ChatMessage;
  isMine: boolean;
  accentColor?: string;
};

type AudioSource = {
  url: string;
  durationMs: number;
};

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const getAudioSource = (message: ChatMessage): AudioSource => {
  const firstContent = Array.isArray(message.content) ? message.content[0] : message.content;
  const candidate = firstContent && typeof firstContent === 'object' ? firstContent : undefined;
  const rawUrl = typeof firstContent === 'string'
    ? firstContent
    : candidate?.url || candidate?.text || candidate?.name || '';
  const url = resolveMediaUrl(String(rawUrl));
  const durationMs =
    Number((candidate as { durationMs?: number; duration?: number } | undefined)?.durationMs) ||
    Number((candidate as { durationMs?: number; duration?: number } | undefined)?.duration) ||
    Number(message.size || 0);

  return {
    url,
    durationMs: Number.isFinite(durationMs) ? durationMs : 0,
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

export const ChatAudioMessage: React.FC<Props> = ({ message, isMine, accentColor = '#d2a177' }) => {
  const audioId = useMemo(() => message.msg_id || message._id, [message._id, message.msg_id]);
  const source = useMemo(() => getAudioSource(message), [message]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(source.durationMs);
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => {
    setDuration(source.durationMs);
  }, [source.durationMs]);

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
      clearTimer();
      if (soundRef.current) {
        void soundRef.current.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (!audioId) return undefined;

    return registerAudioPlaybackHandler(audioId, async () => {
      clearTimer();
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);
      try {
        if (soundRef.current) {
          await soundRef.current.stopAsync().catch(() => undefined);
          await soundRef.current.setPositionAsync(0).catch(() => undefined);
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
      { uri: source.url },
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
          clearTimer();
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
      setIsLoading(true);
      await resetOtherAudioPlaybacks(audioId);
      const sound = await ensureSound();
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        return;
      }

      if (status.isPlaying) {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        setIsPlaying(false);
        setCurrentTime(0);
        clearTimer();
        return;
      }

      await sound.playAsync();
      setIsPlaying(true);
      clearTimer();
      progressTimerRef.current = setInterval(async () => {
        const playStatus = await sound.getStatusAsync();
        if (!playStatus.isLoaded) return;
        setCurrentTime(playStatus.positionMillis || 0);
        if (playStatus.didJustFinish) {
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(source.durationMs || 0);
          clearTimer();
          void sound.stopAsync().catch(() => undefined);
          void sound.setPositionAsync(0).catch(() => undefined);
        }
      }, 200);
    } catch (error) {
      console.log('Failed to play audio:', error);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(source.durationMs || 0);
      clearTimer();
    } finally {
      setIsLoading(false);
    }
  };

  const totalDuration = duration || source.durationMs;
  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;
  const displayCurrentTime = formatDuration(currentTime);
  const displayTotalDuration = formatDuration(totalDuration);

  return (
    <View className={`flex-row items-center gap-3.5 rounded-xl border px-3 py-3 shadow-sm ${isMine ? 'border-[#e6cdb3] bg-[#efdccb]' : 'border-[#eadfd3] bg-white'}`} style={{ minWidth: 220 }}>
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
