import React, { memo, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ChatMessage } from '@/types';
import { resolveMediaUrl } from '@/utils/chat';

type Props = {
  message: ChatMessage;
  onImagePress?: (index: number) => void;
};

type MediaItem = {
  url: string;
};

const getMediaValue = (item: unknown) => {
  if (typeof item === 'string') return item;
  const candidate = (item || {}) as { url?: string; text?: string; name?: string };
  return candidate.url || candidate.text || candidate.name || '';
};

const getImageUrls = (message: ChatMessage): string[] => {
  if (!Array.isArray(message.content)) return [];
  return message.content
    .map((item) => getMediaValue(item))
    .filter(Boolean)
    .map((url) => resolveMediaUrl(url));
};

const fitSize = (sourceWidth: number, sourceHeight: number) => {
  const maxWidth = 260;
  const maxHeight = 340;
  const minWidth = 140;
  const minHeight = 120;

  if (!sourceWidth || !sourceHeight) {
    return { width: maxWidth, height: 200 };
  }

  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
  const width = Math.max(minWidth, Math.round(sourceWidth * scale));
  const height = Math.max(minHeight, Math.round(sourceHeight * scale));

  return { width, height };
};

const ChatImageMessageBase: React.FC<Props> = ({ message, onImagePress }) => {
  const imageUrls = useMemo(() => getImageUrls(message), [message]);
  const [singleSize, setSingleSize] = useState({ width: 260, height: 200 });

  if (!imageUrls.length) {
    return null;
  }

  if (imageUrls.length === 1) {
    return (
      <Pressable onPress={() => onImagePress?.(0)} className="overflow-hidden rounded-xl">
          <Image source={{ uri: imageUrls[0] }} style={singleSize} contentFit="cover" transition={120} onLoad={(event) => {
            const width = event.source?.width || 0;
            const height = event.source?.height || 0;
            setSingleSize(fitSize(width, height));
          }} />
      </Pressable>
    );
  }

  if (imageUrls.length === 2) {
    return (
      <View className="w-[260px] flex-row overflow-hidden rounded-xl">
        {imageUrls.map((url, index) => (
          <Pressable key={`${message._id}-${index}`} onPress={() => onImagePress?.(index)} className="h-[150px] flex-1 overflow-hidden border-r border-white">
            <Image source={{ uri: url }} className="h-full w-full" contentFit="cover" transition={120} />
          </Pressable>
        ))}
      </View>
    );
  }

  if (imageUrls.length === 3) {
    return (
      <View className="h-[300px] w-[260px] flex-row overflow-hidden rounded-xl">
        <Pressable onPress={() => onImagePress?.(0)} className="h-full w-[58%] overflow-hidden border-r border-white">
          <Image source={{ uri: imageUrls[0] }} className="h-full w-full" contentFit="cover" transition={120} />
        </Pressable>
        <View className="w-[42%]">
          {imageUrls.slice(1, 3).map((url, index) => (
            <Pressable
              key={`${message._id}-${index + 1}`}
              onPress={() => onImagePress?.(index + 1)}
              className={`h-1/2 overflow-hidden ${index === 0 ? 'border-b border-white' : ''}`}
            >
              <Image source={{ uri: url }} className="h-full w-full" contentFit="cover" transition={120} />
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  const visible = imageUrls.slice(0, 6);
  const remaining = imageUrls.length - visible.length;

  return (
    <View className="w-[260px] flex-row flex-wrap overflow-hidden rounded-2xl">
      {visible.map((url, index) => {
        const isLastVisible = index === visible.length - 1 && remaining > 0;
        return (
          <Pressable
            key={`${message._id}-${index}`}
            onPress={() => onImagePress?.(index)}
            className="relative h-[86px] w-1/3 overflow-hidden border-b border-r border-white"
          >
            <Image source={{ uri: url }} className="h-full w-full" contentFit="cover" transition={120} />
            {isLastVisible && (
              <View className="absolute inset-0 items-center justify-center bg-black/45">
                <Text className="text-[18px] font-bold text-white">+{remaining}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

export const ChatImageMessage = memo(ChatImageMessageBase);
