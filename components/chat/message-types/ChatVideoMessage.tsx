import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type { ChatMessage } from '@/types';
import { resolveMediaUrl } from '@/utils/chat';

type Props = {
  message: ChatMessage;
  onPress?: () => void;
  onLongPress?: (event: any) => void;
  onMediaReady?: (messageId: string) => void;
};

const VIDEO_WIDTH = 260;
const VIDEO_HEIGHT = 200;

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

/**
 * Build a lightweight thumbnail URL from the video key.
 * If the backend provides a thumbnail endpoint, we use it;
 * otherwise we show a placeholder gradient.
 */
const getVideoThumbnailUrl = (videoUrl: string) => {
  // Try to derive a thumbnail from the S3 key
  // Most video hosting services provide a poster frame
  // For now just return the video url itself - the Image component will show
  // the first frame if possible, otherwise show placeholder
  if (!videoUrl) return null;
  // If the URL ends with a video extension, we can't use it as an image
  // so return null to show placeholder
  return null;
};

const ChatVideoMessageBase: React.FC<Props> = ({ message, onPress, onLongPress, onMediaReady }) => {
  const uri = getVideoUrl(message);
  const readyRef = useRef(false);
  const stableMessageId = String(message.msg_id || message._id || '');
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    if (stableMessageId) {
      onMediaReady?.(stableMessageId);
    }
  }, [onMediaReady, stableMessageId]);

  useEffect(() => {
    if (!uri) {
      markReady();
      return;
    }

    // Generate a thumb to avoid "gray/black box"
    // expo-image can sometimes handle remote video URLs as posters, 
    // but generating a local thumb with VideoThumbnails is more reliable.
    setIsGeneratingThumb(true);
    VideoThumbnails.getThumbnailAsync(uri, {
        time: 100, // Use a small offset to support short videos
        quality: 0.6,
    })
    .then(result => {
        setThumbnailUri(result.uri);
    })
    .catch(err => {
        console.warn("Failed to generate video thumb in chat:", err);
        // Fallback: If it's remote, we can try to use the URI directly as a poster
        if (uri.startsWith('http')) {
            setThumbnailUri(uri);
        }
    })
    .finally(() => {
        setIsGeneratingThumb(false);
        markReady();
    });
  }, [uri, markReady]);

  if (!uri) return null;

  return (
    <Pressable
      onPress={() => {
        onPress?.();
      }}
      onLongPress={onLongPress}
      delayLongPress={150}
      className="relative overflow-hidden rounded-xl"
      style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, backgroundColor: '#1a1a2e' }}
    >
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onLoad={markReady}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
            {isGeneratingThumb ? <ActivityIndicator color="#fff" /> : <View className="w-full h-full bg-slate-800" />}
        </View>
      )}
      {/* Play button overlay */}
      <View className="absolute inset-0 items-center justify-center bg-black/20 pointer-events-none">
        <View className="w-14 h-14 rounded-full bg-black/40 items-center justify-center border-2 border-white/40 pl-1">
          <Play size={24} color="#fff" fill="#fff" />
        </View>
      </View>
    </Pressable>
  );
};

export const ChatVideoMessage = memo(ChatVideoMessageBase);
