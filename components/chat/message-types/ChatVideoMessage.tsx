import React, { memo, useCallback, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { Video, ResizeMode, type VideoReadyForDisplayEvent } from 'expo-av';
import { Play } from 'lucide-react-native';
import type { ChatMessage } from '@/types';
import { resolveMediaUrl } from '@/utils/chat';

type Props = {
  message: ChatMessage;
  onPress?: () => void;
  onLongPress?: (event: any) => void;
  onMediaReady?: (messageId: string) => void;
};

const getVideoUrl = (message: ChatMessage) => {
  const firstContent = Array.isArray(message.content) ? message.content[0] : message.content;
  const raw =
    typeof firstContent === 'string'
      ? firstContent
      : firstContent && typeof firstContent === 'object'
        ? firstContent.url || firstContent.text || firstContent.name || ''
        : '';
  return resolveMediaUrl(String(raw || ''));
};

const ChatVideoMessageBase: React.FC<Props> = ({ message, onPress, onLongPress, onMediaReady }) => {
  const uri = getVideoUrl(message);
  const readyRef = useRef(false);
  const stableMessageId = String(message.msg_id || message._id || '');

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    if (stableMessageId) {
      onMediaReady?.(stableMessageId);
    }
  }, [onMediaReady, stableMessageId]);

  if (!uri) return null;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={150} className="relative overflow-hidden rounded-xl">
      <Video
        source={{ uri }}
        style={{ width: 260, height: 200 }}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping={false}
        isMuted
        useNativeControls={false}
        onReadyForDisplay={(_event: VideoReadyForDisplayEvent) => {
          markReady();
        }}
        onError={() => {
          markReady();
        }}
      />
      <View className="absolute inset-0 items-center justify-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-black/40">
          <Play size={20} color="#fff" fill="#fff" />
        </View>
      </View>
    </Pressable>
  );
};

export const ChatVideoMessage = memo(ChatVideoMessageBase);
