import type { PostMediaItem } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PostMediaViewerProps = {
  visible: boolean;
  media: PostMediaItem[];
  initialIndex: number;
  onClose: () => void;
};

export function PostMediaViewer({ visible, media, initialIndex, onClose }: PostMediaViewerProps) {
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<PostMediaItem>>(null);

  useEffect(() => {
    if (visible) setActiveIndex(Math.min(Math.max(initialIndex, 0), Math.max(media.length - 1, 0)));
  }, [initialIndex, media.length, visible]);

  const activeMedia = media[activeIndex];
  const hasMultiple = media.length > 1;
  const dots = useMemo(() => media.map((_, index) => index), [media]);
  const showPrev = hasMultiple && activeIndex > 0;
  const showNext = hasMultiple && activeIndex < media.length - 1;

  useEffect(() => {
    if (!visible || !media.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: Math.min(Math.max(initialIndex, 0), media.length - 1),
        animated: false,
      });
    });
  }, [initialIndex, media.length, visible]);

  const goPrev = () => {
    if (!showPrev) return;
    const nextIndex = activeIndex - 1;
    setActiveIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  const goNext = () => {
    if (!showNext) return;
    const nextIndex = activeIndex + 1;
    setActiveIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    setActiveIndex(Math.min(Math.max(nextIndex, 0), media.length - 1));
  };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          <View className="h-14 flex-row items-center justify-between px-4">
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white/15" onPress={onClose}>
              <Feather name="x" size={22} color="#fff" />
            </Pressable>
            <Text className="text-sm font-bold text-white/90">
              {media.length ? `${activeIndex + 1}/${media.length}` : 'Media'}
            </Text>
            <View className="h-10 w-10" />
          </View>

          <View className="flex-1 items-center justify-center">
            <FlatList
              ref={listRef}
              data={media}
              keyExtractor={(item, index) => item.id || `${item.url}-${index}`}
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              onMomentumScrollEnd={onMomentumScrollEnd}
              renderItem={({ item, index }) => (
                <View className="items-center justify-center" style={{ width, height: height * 0.78 }}>
                  {item.type === 'video' ? (
                    <Video
                      key={`${item.url}-${index}`}
                      source={{ uri: item.url }}
                      style={{ width, height: height * 0.74 }}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={index === activeIndex}
                      useNativeControls
                    />
                  ) : (
                    <ExpoImage
                      source={{ uri: item.url }}
                      style={{ width, height: height * 0.78 }}
                      contentFit="contain"
                      transition={120}
                    />
                  )}
                </View>
              )}
            />

            {showPrev ? (
                <Pressable
                  className="absolute left-3 h-11 w-11 items-center justify-center rounded-full bg-black/45"
                  style={{ top: '50%', transform: [{ translateY: -22 }] }}
                  onPress={goPrev}
                >
                  <Feather name="chevron-left" size={28} color="#fff" />
                </Pressable>
            ) : null}
            {showNext ? (
                <Pressable
                  className="absolute right-3 h-11 w-11 items-center justify-center rounded-full bg-black/45"
                  style={{ top: '50%', transform: [{ translateY: -22 }] }}
                  onPress={goNext}
                >
                  <Feather name="chevron-right" size={28} color="#fff" />
                </Pressable>
            ) : null}
          </View>

          {activeMedia?.caption ? (
            <Text className="px-5 pb-3 text-center text-sm font-semibold text-white/80" numberOfLines={2}>
              {activeMedia.caption}
            </Text>
          ) : null}

          {hasMultiple ? (
            <View className="flex-row items-center justify-center gap-1.5 pb-5">
              {dots.map((dot) => (
                <Pressable
                  key={dot}
                  className="h-2 rounded-full"
                  style={{
                    width: dot === activeIndex ? 20 : 8,
                    backgroundColor: dot === activeIndex ? '#fff' : 'rgba(255,255,255,0.48)',
                  }}
                  onPress={() => {
                    setActiveIndex(dot);
                    listRef.current?.scrollToIndex({ index: dot, animated: true });
                  }}
                />
              ))}
            </View>
          ) : (
            <View className="h-5" />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
