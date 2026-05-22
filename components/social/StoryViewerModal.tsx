import { MediaApi, resolveMediaUrl, type StoryContentItem, type StoryItem, type StoryUserGroup } from '@/services/api/media.api';
import { Feather, Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from './SocialAvatar';

export function StoryViewerModal({
  group,
  groups = [],
  currentUserId,
  onGroupChange,
  onDeleted,
  onEditStory,
  onClose,
}: {
  group: StoryUserGroup | null;
  groups?: StoryUserGroup[];
  currentUserId?: string;
  onGroupChange?: (group: StoryUserGroup) => void;
  onDeleted?: (storyId: string) => void;
  onEditStory?: (story: StoryItem) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [viewersVisible, setViewersVisible] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
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
    if (!story?.id || !currentUserId) return;
    void MediaApi.viewStory(story.id, currentUserId);
    void MediaApi.recordViewHistory(story.id);
    let mounted = true;
    MediaApi.checkIsSaved(story.id).then((saved) => {
      if (mounted) setIsSaved(saved);
    });
    return () => {
      mounted = false;
    };
  }, [currentUserId, story?.id]);

  const isOwner = Boolean(story?.userId && currentUserId && story.userId === currentUserId);

  const toggleSave = async () => {
    if (!story?.id || saveBusy) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setSaveBusy(true);
    const ok = await MediaApi.toggleSaveContent(story.id, nextSaved);
    setSaveBusy(false);
    if (!ok) {
      setIsSaved(!nextSaved);
      Alert.alert('Không cập nhật được', 'Vui lòng thử lại sau.');
    }
  };

  const openViewers = async () => {
    if (!story?.id) return;
    setViewersVisible(true);
    setViewersLoading(true);
    try {
      setViewers(await MediaApi.fetchStoryViewers(story.id));
    } finally {
      setViewersLoading(false);
    }
  };

  const deleteStory = () => {
    if (!story?.id) return;
    Alert.alert('Xóa tin?', 'Tin này sẽ bị xóa và không thể hoàn tác.', [
      { text: 'Giữ lại', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          if (!story?.id) return;
          const ok = await MediaApi.deleteStory(story.id);
          if (!ok) {
            Alert.alert('Không xóa được', 'Vui lòng thử lại sau.');
            return;
          }
          onDeleted?.(story.id);
          closeViewer();
        },
      },
    ]);
  };

  const viewerName = (viewer: any) =>
    viewer?.accountDisplayName || viewer?.displayName || viewer?.accountUsername || viewer?.username || viewer?.name || 'Người dùng';

  const viewerAvatar = (viewer: any) =>
    resolveMediaUrl(viewer?.accountAvatarUrl || viewer?.avatarUrl || viewer?.avatar) || undefined;

  const closeViewer = () => {
    setViewersVisible(false);
    closeViewer();
  };

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
    <Modal visible={!!group} animationType="fade" transparent onRequestClose={closeViewer}>
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
            <View className="flex-row items-center gap-2">
              <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white/15" disabled={saveBusy} onPress={toggleSave}>
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color="#fff" />
              </TouchableOpacity>
              {isOwner ? (
                <>
                  <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white/15" onPress={openViewers}>
                    <Feather name="eye" size={19} color="#fff" />
                  </TouchableOpacity>
                  {onEditStory ? (
                    <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white/15" onPress={() => story && onEditStory(story)}>
                      <Feather name="edit-2" size={18} color="#fff" />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white/15" onPress={deleteStory}>
                    <Feather name="trash-2" size={18} color="#fff" />
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
            <TouchableOpacity className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white/15" onPress={closeViewer}>
              <Feather name="x" size={21} color="#fff" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 items-center justify-center">
            {storyKind === 'IMAGE' && imageUrl ? (
              <ExpoImage source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            ) : storyKind === 'VIDEO' && videoUrl ? (
              <Video
                key={videoUrl}
                source={{ uri: videoUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
              />
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

        <Modal visible={viewersVisible} animationType="slide" transparent onRequestClose={() => setViewersVisible(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="max-h-[70%] rounded-t-[28px] bg-white px-4 pb-6 pt-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-black text-slate-900">Người đã xem</Text>
                <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full bg-slate-100" onPress={() => setViewersVisible(false)}>
                  <Feather name="x" size={19} color="#0f172a" />
                </TouchableOpacity>
              </View>
              {viewersLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator color="#0f172a" />
                </View>
              ) : (
                <ScrollView>
                  {viewers.length ? (
                    viewers.map((viewer, viewerIndex) => (
                      <View key={viewer?.id || viewer?.accountId || viewerIndex} className="flex-row items-center border-b border-slate-100 py-3">
                        <Avatar uri={viewerAvatar(viewer)} name={viewerName(viewer)} size={42} />
                        <Text className="ml-3 flex-1 text-[15px] font-bold text-slate-900" numberOfLines={1}>
                          {viewerName(viewer)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="py-8 text-center text-sm font-semibold text-slate-500">Chưa có lượt xem</Text>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
