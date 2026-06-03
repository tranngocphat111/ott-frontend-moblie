import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { ChatMessage } from '@/types/entities/chat';
import { getOptimizedImageUrl, resolveMediaUrl } from '@/utils/chat';
import { isMessageMediaFlagged } from '@/utils/chatModeration';

type Props = {
  message: ChatMessage;
  onImagePress?: (index: number) => void;
  onLongPress?: (event: any) => void;
  onMediaReady?: (messageId: string) => void;
};

const BLUR_HASH_PLACEHOLDER = '|rF?hV%2WCj[ayj[a|j[aybgF-jswaWbxaf8ayfbqsj[ayj[j[ayj[ayj[ayj[ayj[ayj[ayj[ay';
const CLUSTER_WIDTH = 260;

// Hàm hỗ trợ tính tỉ lệ khung hình (Aspect Ratio) an toàn
const calculateAspectRatio = (width?: number | string, height?: number | string) => {
  const w = Number(width);
  const h = Number(height);
  if (!w || !h || isNaN(w) || isNaN(h)) return null;
  return Math.min(Math.max(w / h, 0.7), 1.5); // Giới hạn tỷ lệ từ 0.7 đến 1.5 để ảnh không bị quá dài hoặc quá dẹt
};

const ChatImageMessageBase: React.FC<Props> = ({ message, onImagePress, onLongPress, onMediaReady }) => {
  const readyRef = useRef(false);
  const messageId = String(message.msg_id || message._id || '');

  // Trích xuất width và height từ message để cố định layout ngay từ mili-giây đầu tiên
  const initialAspectRatio = useMemo(() => {
    const firstContentItem = Array.isArray(message.content) ? message.content[0] : null;
    const initialImageWidth = (message as any).image_width || (firstContentItem as any)?.width;
    const initialImageHeight = (message as any).image_height || (firstContentItem as any)?.height;

    return calculateAspectRatio(initialImageWidth, initialImageHeight);
  }, [message.content, (message as any).image_width, (message as any).image_height]);

  // Nếu không có kích thước lúc gửi, ta set mặc định tỷ lệ là 1 (hình vuông) để giữ chỗ, tránh bị nhảy chiều cao
  const [aspectRatio, setAspectRatio] = useState<number>(initialAspectRatio || 1);
  const [revealedIndexes, setRevealedIndexes] = useState<Set<number>>(() => new Set());

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

  const isLocalFile = useMemo(() => {
    return imageUrls.some(url => /^(file:|content:|blob:|data:)/i.test(url));
  }, [imageUrls]);

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onMediaReady?.(messageId);
  }, [messageId, onMediaReady]);

  const count = imageUrls.length;
  const GAP = 2;
  const localStatus = message.local_status;
  const localProgress = Number(message.local_upload_progress || 0);

  const renderFlaggedOverlay = useCallback((index: number) => (
    <View className="absolute inset-0 items-center justify-center bg-black/35 px-3">
      <View className="items-center rounded-2xl bg-black/55 px-3 py-2">
        <Text className="text-center text-[12px] font-bold text-white">Ảnh nhạy cảm</Text>
        <Pressable
          className="mt-2 rounded-full bg-white px-3 py-1.5"
          onPress={(event) => {
            event.stopPropagation?.();
            setRevealedIndexes((current) => {
              const next = new Set(current);
              next.add(index);
              return next;
            });
          }}
        >
          <Text className="text-[12px] font-bold text-slate-900">Xem ảnh</Text>
        </Pressable>
      </View>
    </View>
  ), []);

  const renderImageTile = useCallback((
    index: number,
    className?: string,
    style?: any,
  ) => {
    const uri = optimizedUrls[index] || imageUrls[index];
    const flagged = isMessageMediaFlagged(message, index);
    const revealed = revealedIndexes.has(index);
    const hiddenByModeration = flagged && !revealed;

    return (
      <Pressable
        onPress={() => {
          if (hiddenByModeration) return;
          onImagePress?.(index);
        }}
        onLongPress={onLongPress}
        className={`relative overflow-hidden ${className || ''}`}
        style={style}
      >
        <Image
          source={{ uri }}
          recyclingKey={uri}
          style={{ width: '100%', height: '100%', backgroundColor: '#eee' }}
          contentFit="cover"
          cachePolicy={isLocalFile ? "none" : "memory-disk"}
          transition={0}
          placeholder={BLUR_HASH_PLACEHOLDER}
          blurRadius={hiddenByModeration ? 16 : 0}
          onLoad={index === 0 ? markReady : undefined}
          onError={index === 0 ? markReady : undefined}
        />
        {hiddenByModeration ? renderFlaggedOverlay(index) : null}
        {index === 5 && count > 6 && (
          <View className="absolute inset-0 bg-black/45 items-center justify-center pointer-events-none">
            <Text className="text-white font-bold text-lg">+{count - 6}</Text>
          </View>
        )}
      </Pressable>
    );
  }, [
    count,
    imageUrls,
    isLocalFile,
    markReady,
    message,
    onImagePress,
    onLongPress,
    optimizedUrls,
    renderFlaggedOverlay,
    revealedIndexes,
  ]);

  if (!imageUrls.length) return null;

  return (
    <View style={{ width: CLUSTER_WIDTH }} className="overflow-hidden rounded-2xl border border-black/5 bg-white/95">
      {count === 1 && (
        <Pressable
          onPress={() => {
            if (isMessageMediaFlagged(message, 0) && !revealedIndexes.has(0)) return;
            onImagePress?.(0);
          }}
          onLongPress={onLongPress}
        >
          <Image
            source={{ uri: optimizedUrls[0] || imageUrls[0] }}
            recyclingKey={optimizedUrls[0] || imageUrls[0]}
            style={{
              width: CLUSTER_WIDTH,
              aspectRatio: aspectRatio, // Đã có fallback an toàn, không dùng height tĩnh nữa
              maxHeight: 350,
              backgroundColor: '#f0e6dc',
            }}
            contentFit="cover"
            cachePolicy={isLocalFile ? "none" : "memory-disk"}
            transition={0}
            placeholder={BLUR_HASH_PLACEHOLDER}
            blurRadius={isMessageMediaFlagged(message, 0) && !revealedIndexes.has(0) ? 16 : 0}
            onLoad={(e) => {
              // Nếu ban đầu server/app không có truyền width/height vào message, cập nhật lại sau khi load xong
              if (!initialAspectRatio) {
                const width = e.source?.width || 1;
                const height = e.source?.height || 1;
                const newRatio = calculateAspectRatio(width, height);
                if (newRatio) setAspectRatio(newRatio);
              }
              markReady();
            }}
            onError={markReady}
          />
          {isMessageMediaFlagged(message, 0) && !revealedIndexes.has(0) ? renderFlaggedOverlay(0) : null}
        </Pressable>
      )}
      {count === 2 && (
        <View className="flex-row h-[180px]" style={{ gap: GAP }}>
          {renderImageTile(0, "flex-1")}
          {renderImageTile(1, "flex-1")}
        </View>
      )}
      {count === 3 && (
        <View className="flex-row h-[210px]" style={{ gap: GAP }}>
          {renderImageTile(0, "flex-[1.4]")}
          <View className="flex-1" style={{ gap: GAP }}>
            {renderImageTile(1, "flex-1")}
            {renderImageTile(2, "flex-1")}
          </View>
        </View>
      )}
      {count === 4 && (
        <View className="h-[260px]" style={{ gap: GAP }}>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            {renderImageTile(0, "flex-1")}
            {renderImageTile(1, "flex-1")}
          </View>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            {renderImageTile(2, "flex-1")}
            {renderImageTile(3, "flex-1")}
          </View>
        </View>
      )}
      {count === 5 && (
        <View style={{ gap: GAP }}>
          <View className="flex-row h-[160px]" style={{ gap: GAP }}>
            {renderImageTile(0, "flex-1")}
            {renderImageTile(1, "flex-1")}
          </View>
          <View className="flex-row h-[102px]" style={{ gap: GAP }}>
            {renderImageTile(2, "flex-1")}
            {renderImageTile(3, "flex-1")}
            {renderImageTile(4, "flex-1")}
          </View>
        </View>
      )}
      {count >= 6 && (
        <View className="h-[260px]" style={{ gap: GAP }}>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            {renderImageTile(0, "flex-1")}
            {renderImageTile(1, "flex-1")}
          </View>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            {renderImageTile(2, "flex-1")}
            {renderImageTile(3, "flex-1")}
          </View>
          <View className="flex-row flex-1" style={{ gap: GAP }}>
            {renderImageTile(4, "flex-1")}
            {renderImageTile(5, "flex-1")}
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
