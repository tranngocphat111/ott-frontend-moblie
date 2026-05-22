import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image as RNImage, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react-native';
import type { ChatMessage } from '@/types';
import { resolveMediaUrl } from '@/utils/chat';

const MEDIA_WINDOW_SIZE = 40;
const MEDIA_WINDOW_STEP = 20;
const THUMB_ITEM_WIDTH = 72;

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

const resolveSelectedUri = (value?: string | null) => resolveMediaUrl(String(value || '').trim());

const normalizeUriForCompare = (value?: string | null) => {
  const resolved = resolveSelectedUri(value);
  if (!resolved) return '';

  const noQuery = resolved.split('?')[0] || '';
  try {
    return decodeURIComponent(noQuery).toLowerCase();
  } catch {
    return noQuery.toLowerCase();
  }
};

const getMessageMediaItems = (message: ChatMessage) => {
  const items: MediaItem[] = [];

  if (message.is_deleted || message.is_revoked) return items;

  if (message.type === 'image') {
    const imageContents = Array.isArray(message.content)
      ? message.content
      : [message.content];

    imageContents.forEach((content, index) => {
      const url = resolveMediaUrl(String(getRawValue(content) || ''));
      if (!url) return;
      items.push({
        id: `${message.msg_id || message._id}-image-${index}`,
        url,
        type: 'image',
        label: 'Ảnh',
      });
    });

    return items;
  }

  if (message.type === 'video') {
    const first = Array.isArray(message.content) ? message.content[0] : message.content;
    const url = resolveMediaUrl(String(getRawValue(first) || ''));
    if (!url) return items;

    items.push({
      id: `${message.msg_id || message._id}-${message.type}`,
      url,
      type: 'video',
      label: 'Video',
    });
  }

  return items;
};

const buildMediaItems = (messages: ChatMessage[]) => {
  const items: MediaItem[] = [];
  messages.forEach((message) => {
    items.push(...getMessageMediaItems(message));
  });
  return items;
};

const ensureCurrentVisible = (
  listRef: React.RefObject<FlatList<MediaItem> | null>,
  targetIndex: number,
  animated: boolean,
) => {
  requestAnimationFrame(() => {
    listRef.current?.scrollToIndex({ index: targetIndex, animated });
  });
};

export const ChatImagePreviewModal: React.FC<Props> = ({ selectedImage, messages, onClose }) => {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<MediaItem>>(null);
  const thumbListRef = useRef<FlatList<MediaItem>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingImageIds, setLoadingImageIds] = useState<Record<string, boolean>>({});
  const [failedImageIds, setFailedImageIds] = useState<Record<string, string>>({});
  const [windowRange, setWindowRange] = useState<{ start: number; end: number }>({ start: 0, end: -1 });

  const resolvedSelected = useMemo(() => resolveSelectedUri(selectedImage), [selectedImage]);
  const selectedCompareKey = useMemo(() => normalizeUriForCompare(selectedImage), [selectedImage]);

  const mediaItems = useMemo(() => buildMediaItems(messages), [messages]);

  const displayRange = useMemo(() => {
    if (mediaItems.length === 0) return { start: 0, end: -1 };
    const safeStart = Math.max(0, Math.min(windowRange.start, mediaItems.length - 1));
    const safeEnd = Math.max(safeStart, Math.min(windowRange.end, mediaItems.length - 1));
    return { start: safeStart, end: safeEnd };
  }, [mediaItems.length, windowRange.end, windowRange.start]);

  const displayedMediaItems = useMemo(() => {
    if (displayRange.end < displayRange.start) return [];
    return mediaItems.slice(displayRange.start, displayRange.end + 1);
  }, [displayRange.end, displayRange.start, mediaItems]);

  const currentDisplayIndex = useMemo(() => {
    return Math.max(0, currentIndex - displayRange.start);
  }, [currentIndex, displayRange.start]);

  const initialIndex = useMemo(() => {
    if (!resolvedSelected || mediaItems.length === 0) return 0;

    const exactIndex = mediaItems.findIndex((item) => item.url === resolvedSelected);
    if (exactIndex >= 0) return exactIndex;

    const normalizedIndex = mediaItems.findIndex(
      (item) => normalizeUriForCompare(item.url) === selectedCompareKey,
    );
    return normalizedIndex >= 0 ? normalizedIndex : 0;
  }, [mediaItems, resolvedSelected, selectedCompareKey]);

  useEffect(() => {
    if (!selectedImage) return;

    const half = Math.floor(MEDIA_WINDOW_SIZE / 2);
    const start = Math.max(0, initialIndex - half);
    const end = Math.min(mediaItems.length - 1, start + MEDIA_WINDOW_SIZE - 1);

    setCurrentIndex(initialIndex);
    setWindowRange({ start, end });
    setLoadingImageIds({});
    setFailedImageIds({});

    requestAnimationFrame(() => {
      if (displayedMediaItems.length > 0) {
        const localInitialIndex = Math.max(0, initialIndex - start);
        ensureCurrentVisible(listRef, localInitialIndex, false);
      }
    });

  }, [displayedMediaItems.length, initialIndex, mediaItems, messages.length, resolvedSelected, selectedCompareKey, selectedImage]);

  useEffect(() => {
    if (!selectedImage || mediaItems.length === 0) return;

    if (currentIndex <= displayRange.start + 2 && displayRange.start > 0) {
      setWindowRange((prev) => {
        const nextStart = Math.max(0, prev.start - MEDIA_WINDOW_STEP);
        return { start: nextStart, end: prev.end };
      });
      return;
    }

    if (currentIndex >= displayRange.end - 2 && displayRange.end < mediaItems.length - 1) {
      setWindowRange((prev) => {
        const nextEnd = Math.min(mediaItems.length - 1, prev.end + MEDIA_WINDOW_STEP);
        return { start: prev.start, end: nextEnd };
      });
    }
  }, [currentIndex, displayRange.end, displayRange.start, mediaItems.length, selectedImage]);

  useEffect(() => {
    if (!selectedImage || mediaItems.length === 0) return;
    requestAnimationFrame(() => {
      try {
        thumbListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (error) {
        console.warn('[ChatImagePreviewModal] thumb scroll fallback', {
          currentIndex,
          mediaItemsCount: mediaItems.length,
          error,
        });
        thumbListRef.current?.scrollToOffset({
          offset: Math.max(0, currentIndex * THUMB_ITEM_WIDTH - width / 2 + THUMB_ITEM_WIDTH),
          animated: true,
        });
      }
    });
  }, [currentIndex, mediaItems.length, selectedImage, width]);

  if (!selectedImage) return null;

  if (mediaItems.length === 0) {
    console.warn('[ChatImagePreviewModal] no media items found for current message list', {
      selectedImage,
      messagesCount: messages.length,
    });

    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 items-center justify-center bg-black/95 px-6">
          <Pressable onPress={onClose} className="absolute right-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
          <Text className="text-center text-[14px] text-white/90">Không tìm thấy dữ liệu ảnh/video để hiển thị</Text>
        </View>
      </Modal>
    );
  }

  const currentItem = mediaItems[currentIndex] || mediaItems[0];

  const handleGoPrev = () => {
    if (currentIndex <= 0) return;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    const nextDisplayIndex = Math.max(0, prevIndex - displayRange.start);
    listRef.current?.scrollToIndex({ index: nextDisplayIndex, animated: true });
  };

  const handleGoNext = () => {
    if (currentIndex >= mediaItems.length - 1) return;
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    const nextDisplayIndex = Math.max(0, nextIndex - displayRange.start);
    listRef.current?.scrollToIndex({ index: nextDisplayIndex, animated: true });
  };

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < mediaItems.length - 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/95">
        <View className="absolute left-0 right-0 top-0 z-20 flex-row items-center justify-between px-4 pt-14">
          <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
        </View>

        {canGoPrev && (
          <Pressable
            onPress={handleGoPrev}
            className="absolute left-3 top-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            <ChevronLeft size={22} color="#fff" />
          </Pressable>
        )}

        {canGoNext && (
          <Pressable
            onPress={handleGoNext}
            className="absolute right-3 top-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            <ChevronRight size={22} color="#fff" />
          </Pressable>
        )}

        <FlatList
          ref={listRef}
          data={displayedMediaItems}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
            const clampedLocal = Math.max(0, Math.min(displayedMediaItems.length - 1, nextIndex));
            setCurrentIndex(displayRange.start + clampedLocal);
          }}
          renderItem={({ item }) => (
            <View style={{ width, height }} className="items-center justify-center px-4 pt-20 pb-28">
              <View className="h-full w-full items-center justify-center">
                {item.type === 'image' ? (
                  <>
                    <RNImage
                      source={{ uri: item.url }}
                      style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                      onLoadStart={() => {
                        setLoadingImageIds((prev) => ({ ...prev, [item.id]: true }));
                      }}
                      onLoad={() => {
                        setLoadingImageIds((prev) => ({ ...prev, [item.id]: false }));
                        setFailedImageIds((prev) => {
                          if (!prev[item.id]) return prev;
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        });
                      }}
                      onError={(event) => {
                        setLoadingImageIds((prev) => ({ ...prev, [item.id]: false }));
                        const errorText = JSON.stringify(event?.nativeEvent || {});
                        setFailedImageIds((prev) => ({ ...prev, [item.id]: errorText }));
                        console.error('[ChatImagePreviewModal] image load error', {
                          id: item.id,
                          url: item.url,
                          error: event?.nativeEvent,
                        });
                      }}
                    />
                    {loadingImageIds[item.id] && (
                      <View className="absolute inset-0 items-center justify-center">
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                    {failedImageIds[item.id] && (
                      <View className="absolute bottom-6 left-4 right-4 rounded-xl bg-red-900/60 px-3 py-2">
                        <Text className="text-[12px] text-white">Lỗi tải ảnh. Xem log console với tag [ChatImagePreviewModal].</Text>
                      </View>
                    )}
                  </>
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
                    
                  </View>
                )}
              </View>
            </View>
          )}
        />

        <View className="absolute bottom-0 left-0 right-0 bg-black/72 px-3 pb-5 pt-3">
          <Text className="mb-3 text-center text-[13px] font-medium text-white/90">{currentItem?.label || 'Media'}</Text>
          <FlatList
            ref={thumbListRef}
            data={mediaItems}
            keyExtractor={(item) => `${item.id}-thumb`}
            horizontal
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({ length: THUMB_ITEM_WIDTH, offset: THUMB_ITEM_WIDTH * index, index })}
            onScrollToIndexFailed={(info) => {
              thumbListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
            }}
            renderItem={({ item, index }) => {
                const isActive = index === currentIndex;
              return (
                <Pressable
                  onPress={() => {
                      setCurrentIndex(index);
                    if (index >= displayRange.start && index <= displayRange.end) {
                      listRef.current?.scrollToIndex({ index: index - displayRange.start, animated: true });
                      return;
                    }

                    const half = Math.floor(MEDIA_WINDOW_SIZE / 2);
                    const nextStart = Math.max(0, index - half);
                    const nextEnd = Math.min(mediaItems.length - 1, nextStart + MEDIA_WINDOW_SIZE - 1);
                    setWindowRange({ start: nextStart, end: nextEnd });

                    requestAnimationFrame(() => {
                      listRef.current?.scrollToIndex({
                        index: Math.max(0, index - nextStart),
                        animated: false,
                      });
                    });
                  }}
                  className={`mr-2 h-16 w-16 overflow-hidden rounded-xl border-2 ${isActive ? 'border-white' : 'border-transparent'}`}
                >
                    <RNImage source={{ uri: item.url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
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
