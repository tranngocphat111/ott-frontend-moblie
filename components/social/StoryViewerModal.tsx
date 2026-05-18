import { MediaApi, type StoryContentItem, type StoryUserGroup } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from './SocialAvatar';

export function StoryViewerModal({
  group,
  groups = [],
  currentUserId,
  onGroupChange,
  onClose,
}: {
  group: StoryUserGroup | null;
  groups?: StoryUserGroup[];
  currentUserId?: string;
  onGroupChange?: (group: StoryUserGroup) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const pendingIndexRef = useRef<number | null>(null);
  const stories = group?.stories || [];
  const story = stories[index];
  const groupIndex = group ? groups.findIndex((item) => item.userId === group.userId) : -1;
  const item: StoryContentItem | undefined = story?.items?.[0];
  const storyKind = item?.type || story?.contentType || 'UNKNOWN';
  const imageUrl = item?.type === 'IMAGE' ? item.url : story?.imageUrl;
  const videoUrl = item?.type === 'VIDEO' ? item.url : story?.videoUrl;
  const textContent = item?.type === 'TEXT' ? item.textContent : story?.textContent;
  const textBackground = item?.type === 'TEXT' ? item.textBackgroundColor : story?.textBackgroundColor;

  useEffect(() => {
    const pendingIndex = pendingIndexRef.current;
    pendingIndexRef.current = null;
    setIndex(Math.max(0, Math.min(pendingIndex ?? 0, Math.max(0, stories.length - 1))));
  }, [group?.userId, stories.length]);

  useEffect(() => {
    if (story?.id && currentUserId) void MediaApi.viewStory(story.id, currentUserId);
  }, [currentUserId, story?.id]);

  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }

    if (groupIndex >= 0 && groupIndex < groups.length - 1) {
      const nextGroup = groups[groupIndex + 1];
      pendingIndexRef.current = 0;
      onGroupChange?.(nextGroup);
      return;
    }

    onClose();
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
      return;
    }

    if (groupIndex > 0) {
      const previousGroup = groups[groupIndex - 1];
      pendingIndexRef.current = Math.max(0, previousGroup.stories.length - 1);
      onGroupChange?.(previousGroup);
    }
  };

  return (
    <Modal visible={!!group} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          <View className="absolute left-4 right-4 top-12 z-10 flex-row items-center">
            <Avatar uri={group?.avatarUrl} name={group?.name} size={38} />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-white">{group?.name}</Text>
              <Text className="text-xs text-white/70">
                {stories.length ? `${index + 1}/${stories.length}` : 'Tin'}
              </Text>
            </View>
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white/15" onPress={onClose}>
              <Feather name="x" size={21} color="#fff" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 items-center justify-center">
            {storyKind === 'IMAGE' && imageUrl ? (
              <ExpoImage source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            ) : storyKind === 'VIDEO' && videoUrl ? (
              <View className="h-full w-full items-center justify-center bg-slate-950">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-white/15">
                  <Feather name="play" size={34} color="#fff" />
                </View>
                <Text className="mt-4 px-8 text-center text-sm font-semibold text-white/80">Video story</Text>
              </View>
            ) : (
              <View
                className="h-full w-full items-center justify-center px-8"
                style={{ backgroundColor: textBackground || '#111827' }}
              >
                <Text className="text-center text-[28px] font-black leading-10 text-white">
                  {textContent || 'Tin đang được tải'}
                </Text>
              </View>
            )}
          </View>

          <Pressable className="absolute bottom-0 left-0 top-24 w-1/2" onPress={goPrev} />
          <Pressable className="absolute bottom-0 right-0 top-24 w-1/2" onPress={goNext} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
