import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ChatMessage } from '@/types';
import { getOptimizedImageUrl, resolveMediaUrl } from '@/utils/chat';

type Props = {
  message: ChatMessage;
  onImagePress?: (index: number) => void;
  onLongPress?: (event: any) => void;
  onMediaReady?: (messageId: string) => void;
};

const BLUR_HASH_PLACEHOLDER = '|rF?hV%2WCj[ayj[a|j[aybgF-jswaWbxaf8ayfbqsj[ayj[j[ayj[ayj[ayj[ayj[ayj[ayj[ay';
const CLUSTER_WIDTH = 260;

const ChatImageMessageBase: React.FC<Props> = ({ message, onImagePress, onLongPress, onMediaReady }) => {
  const [aspectRatio, setAspectRatio] = useState(1);
  const readyRef = useRef(false);

  const imageUrls = useMemo(() => {
    if (!Array.isArray(message.content)) return [];
    return message.content
      .map(item => typeof item === 'string' ? item : (item as any)?.url)
      .filter(Boolean)
      .map(url => resolveMediaUrl(url));
  }, [message.content]);

  const optimizedUrls = useMemo(() => {
    return imageUrls.map((url) => getOptimizedImageUrl(url, 'message') || url);
  }, [imageUrls]);

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onMediaReady?.(String(message.msg_id || message._id));
  }, [onMediaReady, message]);

  if (!imageUrls.length) return null;

  const count = imageUrls.length;
  const GAP = 2;
  const localStatus = message.local_status;
  const localProgress = Number(message.local_upload_progress || 0);

  const RenderItem = ({ index, className, style }: { index: number; className?: string; style?: any }) => {
    return (
      <Pressable
        onPress={() => onImagePress?.(index)}
        onLongPress={onLongPress}
        className={`relative overflow-hidden ${className}`}
        style={style}
      >
        <Image
          source={{ uri: optimizedUrls[index] || imageUrls[index] }}
          style={{ width: '100%', height: '100%', backgroundColor: '#eee' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          placeholder={BLUR_HASH_PLACEHOLDER}
          onLoad={index === 0 ? markReady : undefined}
          onError={index === 0 ? markReady : undefined}
        />
        {index === 5 && count > 6 && (
          <View className="absolute inset-0 bg-black/45 items-center justify-center pointer-events-none">
            <Text className="text-white font-bold text-lg">+{count - 6}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ width: CLUSTER_WIDTH }} className="overflow-hidden rounded-2xl border border-black/5 bg-white/95">
      {count === 1 && (
        <Pressable onPress={() => onImagePress?.(0)} onLongPress={onLongPress}>
          <Image
            source={{ uri: optimizedUrls[0] || imageUrls[0] }}
            style={{ width: CLUSTER_WIDTH, aspectRatio, maxHeight: 350 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
            placeholder={BLUR_HASH_PLACEHOLDER}
            onLoad={(e) => {
              const width = e.source?.width || 1;
              const height = e.source?.height || 1;
              setAspectRatio(Math.min(Math.max(width / height, 0.7), 1.5));
              markReady();
            }}
            onError={markReady}
          />
        </Pressable>
      )}
      {count === 2 && (
        <View className="flex-row h-[180px]" style={{ gap: GAP }}>
          <RenderItem index={0} className="flex-1" />
          <RenderItem index={1} className="flex-1" />
        </View>
      )}
      {count === 3 && (
        <View className="flex-row h-[210px]" style={{ gap: GAP }}>
          <RenderItem index={0} className="flex-[1.4]" />
          <View className="flex-1" style={{ gap: GAP }}>
            <RenderItem index={1} className="flex-1" />
            <RenderItem index={2} className="flex-1" />
          </View>
        </View>
      )}
      {count === 4 && (
        <View className="h-[260px]" style={{ gap: GAP }}>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            <RenderItem index={0} className="flex-1" />
            <RenderItem index={1} className="flex-1" />
          </View>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            <RenderItem index={2} className="flex-1" />
            <RenderItem index={3} className="flex-1" />
          </View>
        </View>
      )}
      {count === 5 && (
        <View style={{ gap: GAP }}>
          <View className="flex-row h-[160px]" style={{ gap: GAP }}>
            <RenderItem index={0} className="flex-1" />
            <RenderItem index={1} className="flex-1" />
          </View>
          <View className="flex-row h-[102px]" style={{ gap: GAP }}>
            <RenderItem index={2} className="flex-1" />
            <RenderItem index={3} className="flex-1" />
            <RenderItem index={4} className="flex-1" />
          </View>
        </View>
      )}
      {count >= 6 && (
        <View className="h-[260px]" style={{ gap: GAP }}>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            <RenderItem index={0} className="flex-1" />
            <RenderItem index={1} className="flex-1" />
          </View>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            <RenderItem index={2} className="flex-1" />
            <RenderItem index={3} className="flex-1" />
          </View>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            <RenderItem index={4} className="flex-1" />
            <RenderItem index={5} className="flex-1" />
          </View>
        </View>
      )}

      {localStatus === 'uploading' && (
        <View className="absolute inset-0 items-center justify-center bg-black/35">
          <View className="rounded-2xl bg-black/55 px-3 py-2">
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#fff" />
              <Text className="text-[12px] font-semibold text-white">Đang gửi {Math.min(99, Math.max(0, Math.round(localProgress)))}%</Text>
            </View>
          </View>
        </View>
      )}

      {localStatus === 'error' && (
        <View className="absolute inset-0 items-center justify-center bg-black/45 px-3">
          <View className="rounded-2xl bg-black/55 px-3 py-2">
            <Text className="text-center text-[12px] font-semibold text-white">Gửi ảnh thất bại</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export const ChatImageMessage = memo(ChatImageMessageBase);