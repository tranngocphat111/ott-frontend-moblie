import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react-native';
import type { ChatMessage } from '@/types';
import { resolveMediaUrl } from '@/utils/chat';

type Props = {
  selectedImage: string | null;
  messages: ChatMessage[];
  onClose: () => void;
};

type MediaItem = {
  id: string;
  url: string;
  type: 'image' | 'video';
  label: string;
};

const getRawValue = (item: unknown) => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  const candidate = item as { url?: string; text?: string; name?: string };
  return candidate.url || candidate.text || candidate.name || '';
};

const buildMediaItems = (messages: ChatMessage[]) => {
  const items: MediaItem[] = [];

  messages.forEach((message) => {
    if (message.is_deleted || message.is_revoked) return;

    if (message.type === 'image' && Array.isArray(message.content)) {
      message.content.forEach((content, index) => {
        const url = resolveMediaUrl(String(getRawValue(content) || ''));
        if (!url) return;
        items.push({
          id: `${message.msg_id || message._id}-image-${index}`,
          url,
          type: 'image',
          label: 'Ảnh',
        });
      });
      return;
    }

    if (message.type === 'video' || message.type === 'audio') {
      const first = Array.isArray(message.content) ? message.content[0] : message.content;
      const url = resolveMediaUrl(String(getRawValue(first) || ''));
      if (!url) return;
      items.push({
        id: `${message.msg_id || message._id}-${message.type}`,
        url,
        type: 'video',
        label: message.type === 'video' ? 'Video' : 'Âm thanh',
      });
    }
  });

  return items;
};

export const ChatImagePreviewModal: React.FC<Props> = ({ selectedImage, messages, onClose }) => {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<MediaItem>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const mediaItems = useMemo(() => buildMediaItems(messages), [messages]);

  useEffect(() => {
    if (!selectedImage || mediaItems.length === 0) return;
    const nextIndex = mediaItems.findIndex((item) => item.url === selectedImage);
    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: nextIndex, animated: false });
      });
    }
  }, [mediaItems, selectedImage]);

  if (!selectedImage || mediaItems.length === 0) return null;

  const currentItem = mediaItems[currentIndex] || mediaItems[0];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/95">
        <View className="absolute left-0 right-0 top-0 z-20 flex-row items-center justify-between px-4 pt-14">
          <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
          <View className="rounded-full bg-white/10 px-3 py-1">
            <Text className="text-[13px] font-medium text-white">{currentIndex + 1} / {mediaItems.length}</Text>
          </View>
        </View>

        {currentIndex > 0 && (
          <Pressable
            onPress={() => {
              const next = Math.max(currentIndex - 1, 0);
              setCurrentIndex(next);
              listRef.current?.scrollToIndex({ index: next, animated: true });
            }}
            className="absolute left-3 top-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            <ChevronLeft size={22} color="#fff" />
          </Pressable>
        )}

        {currentIndex < mediaItems.length - 1 && (
          <Pressable
            onPress={() => {
              const next = Math.min(currentIndex + 1, mediaItems.length - 1);
              setCurrentIndex(next);
              listRef.current?.scrollToIndex({ index: next, animated: true });
            }}
            className="absolute right-3 top-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            <ChevronRight size={22} color="#fff" />
          </Pressable>
        )}

        <FlatList
          ref={listRef}
          data={mediaItems}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentIndex(Math.max(0, Math.min(mediaItems.length - 1, nextIndex)));
          }}
          renderItem={({ item }) => (
            <View style={{ width, height }} className="items-center justify-center px-4 pt-20 pb-28">
              <View className="h-full w-full items-center justify-center">
                {item.type === 'image' ? (
                  <Image source={{ uri: item.url }} className="h-full w-full"  />
                ) : (
                  <View className="h-full w-full overflow-hidden rounded-2xl bg-black">
                    <Video
                      source={{ uri: item.url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode={ResizeMode.CONTAIN}
                      useNativeControls
                      shouldPlay={false}
                      isLooping={false}
                    />
                    <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
                      <View className="h-14 w-14 items-center justify-center rounded-full bg-black/30">
                        <Play size={22} color="#fff" fill="#fff" />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        />

        <View className="absolute bottom-0 left-0 right-0 bg-black/72 px-3 pb-5 pt-3">
          <Text className="mb-3 text-center text-[13px] font-medium text-white/90">{currentItem?.label || 'Media'}</Text>
          <FlatList
            data={mediaItems}
            keyExtractor={(item) => `${item.id}-thumb`}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isActive = index === currentIndex;
              return (
                <Pressable
                  onPress={() => {
                    setCurrentIndex(index);
                    listRef.current?.scrollToIndex({ index, animated: true });
                  }}
                  className={`mr-2 h-16 w-16 overflow-hidden rounded-xl border-2 ${isActive ? 'border-white' : 'border-transparent'}`}
                >
                  <Image source={{ uri: item.url }} className="h-full w-full object-cover"  />
                  {item.type === 'video' && (
                    <View className="absolute inset-0 items-center justify-center bg-black/25">
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-black/45">
                        <Play size={12} color="#fff" fill="#fff" />
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};
