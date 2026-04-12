import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image'; // Đổi sang thư viện siêu tốc của Expo
import type { ChatMessage } from '@/types';
import { resolveMediaUrl } from '@/utils/chat';

type Props = {
  message: ChatMessage;
  onImagePress?: (index: number) => void;
  onLongPress?: (event: any) => void;
  onMediaReady?: (messageId: string) => void;
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

const ChatImageMessageBase: React.FC<Props> = ({ message, onImagePress, onLongPress, onMediaReady }) => {
  const imageUrls = useMemo(() => getImageUrls(message), [message]);
  const readyRef = useRef(false);
  const stableMessageId = String(message.msg_id || message._id || '');
  
  // State lưu tỷ lệ khung hình cho ảnh đơn (mặc định là 1 - hình vuông)
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    if (stableMessageId) {
      onMediaReady?.(stableMessageId);
    }
  }, [onMediaReady, stableMessageId]);

  if (!imageUrls.length) {
    return null;
  }

  // --- TRƯỜNG HỢP 1 ẢNH: TỰ CO DÃN THEO TỶ LỆ ---
  if (imageUrls.length === 1) {
    return (
      <Pressable 
        onPress={() => onImagePress?.(0)} 
        onLongPress={onLongPress} 
        delayLongPress={150} 
        className="overflow-hidden rounded-xl border border-black/5"
      >
        <Image
          source={{ uri: imageUrls[0] }}
          // Chiều ngang cố định 260, chiều cao tự chạy theo aspectRatio, giới hạn max 350 để không bị dài quá
          style={{ width: 260, aspectRatio: aspectRatio, maxHeight: 350, backgroundColor: '#f8f4ee' }}
          contentFit="cover" // Dùng contentFit của expo-image
          cachePolicy="memory-disk" // Kích hoạt cache bộ nhớ & ổ cứng siêu nhanh
          transition={150} // Hiệu ứng mờ dần vào cực mượt
          onLoad={(e) => {
            // Lấy kích thước thật của ảnh để tính tỷ lệ co dãn
            const ratio = e.source.width / e.source.height;
            // Giới hạn tỷ lệ để ảnh không bị dẹp lép (ví dụ panorama) hoặc hẹp téo
            setAspectRatio(Math.min(Math.max(ratio, 0.5), 2));
            markReady();
          }}
          onError={markReady}
        />
      </Pressable>
    );
  }

  // --- TRƯỜNG HỢP 2 ẢNH ---
  if (imageUrls.length === 2) {
    return (
      <View className="w-[260px] flex-row overflow-hidden rounded-xl border border-black/5">
        {imageUrls.map((url, index) => (
          <Pressable key={`${message._id}-${index}`} onPress={() => onImagePress?.(index)} onLongPress={onLongPress} delayLongPress={150} className="h-[150px] flex-1 overflow-hidden border-r border-white">
            <Image 
              source={{ uri: url }} 
              style={{ width: '100%', height: '100%', backgroundColor: '#f8f4ee' }} 
              contentFit="cover" 
              cachePolicy="memory-disk"
              transition={150}
              onLoad={index === 0 ? markReady : undefined} 
              onError={index === 0 ? markReady : undefined} 
            />
          </Pressable>
        ))}
      </View>
    );
  }

  // --- TRƯỜNG HỢP 3 ẢNH ---
  if (imageUrls.length === 3) {
    return (
      <View className="h-[260px] w-[260px] flex-row overflow-hidden rounded-xl border border-black/5">
        <Pressable onPress={() => onImagePress?.(0)} onLongPress={onLongPress} delayLongPress={150} className="h-full w-[58%] overflow-hidden border-r border-white">
          <Image 
            source={{ uri: imageUrls[0] }} 
            style={{ width: '100%', height: '100%', backgroundColor: '#f8f4ee' }} 
            contentFit="cover" 
            cachePolicy="memory-disk"
            transition={150}
            onLoad={markReady} 
            onError={markReady} 
          />
        </Pressable>
        <View className="w-[42%]">
          {imageUrls.slice(1, 3).map((url, index) => (
            <Pressable
              key={`${message._id}-${index + 1}`}
              onPress={() => onImagePress?.(index + 1)}
              onLongPress={onLongPress}
              delayLongPress={150}
              className={`h-1/2 overflow-hidden ${index === 0 ? 'border-b border-white' : ''}`}
            >
              <Image 
                source={{ uri: url }} 
                style={{ width: '100%', height: '100%', backgroundColor: '#f8f4ee' }} 
                contentFit="cover" 
                cachePolicy="memory-disk"
                transition={150}
              />
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  // --- TRƯỜNG HỢP TỪ 4 ẢNH TRỞ LÊN ---
  const visible = imageUrls.slice(0, 6);
  const remaining = imageUrls.length - visible.length;

  return (
    <View className="w-[260px] flex-row flex-wrap overflow-hidden rounded-2xl border border-black/5">
      {visible.map((url, index) => {
        const isLastVisible = index === visible.length - 1 && remaining > 0;
        return (
          <Pressable
            key={`${message._id}-${index}`}
            onPress={() => onImagePress?.(index)}
            onLongPress={onLongPress}
            delayLongPress={150}
            className="relative h-[86px] w-1/3 overflow-hidden border-b border-r border-white"
          >
            <Image 
              source={{ uri: url }} 
              style={{ width: '100%', height: '100%', backgroundColor: '#f8f4ee' }} 
              contentFit="cover" 
              cachePolicy="memory-disk"
              transition={150}
              onLoad={index === 0 ? markReady : undefined} 
              onError={index === 0 ? markReady : undefined} 
            />
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