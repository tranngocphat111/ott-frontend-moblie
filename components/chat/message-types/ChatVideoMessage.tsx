import React, { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Video, ResizeMode, type VideoReadyForDisplayEvent } from 'expo-av';
import { Play } from 'lucide-react-native';
import type { ChatMessage } from '@/types';
import { resolveMediaUrl } from '@/utils/chat';

type Props = {
  message: ChatMessage;
  onPress?: () => void;
  onLongPress?: (event: any) => void;
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

const fitVideoSize = (sourceWidth: number, sourceHeight: number) => {
  const maxWidth = 260;
  const maxHeight = 320;
  const minWidth = 180;
  const minHeight = 120;

  if (!sourceWidth || !sourceHeight) {
    return { width: maxWidth, height: 200 };
  }

  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
  return {
    width: Math.max(minWidth, Math.round(sourceWidth * scale)),
    height: Math.max(minHeight, Math.round(sourceHeight * scale)),
  };
};

const ChatVideoMessageBase: React.FC<Props> = ({ message, onPress, onLongPress }) => {
  const uri = getVideoUrl(message);
  const [size, setSize] = useState({ width: 260, height: 200 });

  if (!uri) return null;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={150} className="relative overflow-hidden rounded-xl">
      <Video
        source={{ uri }}
        style={size}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping={false}
        isMuted
        useNativeControls={false}
        onReadyForDisplay={(event: VideoReadyForDisplayEvent) => {
          const width = Number(event.naturalSize?.width || 0);
          const height = Number(event.naturalSize?.height || 0);
          if (width > 0 && height > 0) setSize(fitVideoSize(width, height));
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
