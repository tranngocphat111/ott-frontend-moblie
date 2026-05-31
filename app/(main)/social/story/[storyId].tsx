import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/Authcontext';
import { MediaApi, type Post, type StoryUserGroup } from '@/services/api/media.api';
import { SOCIAL_COLORS, StoryViewerModal } from '@/components/social';
import { resolveMediaUrl } from '@/utils/chat';

export default function StandaloneStoryScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [fakeGroup, setFakeGroup] = useState<StoryUserGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storyId || !currentUserId) return;

    const loadStory = async () => {
      setLoading(true);
      try {
        const fetchedStory = await MediaApi.fetchStoryById(storyId);
        if (!fetchedStory) {
          setError(true);
          return;
        }

        const group: StoryUserGroup = {
          user: {
            id: fetchedStory.authorId || '',
            name: fetchedStory.authorName || 'Người dùng',
            avatarUrl: resolveMediaUrl(fetchedStory.authorAvatar),
          },
          stories: [
            {
              id: fetchedStory.id,
              userId: fetchedStory.authorId || '',
              media: fetchedStory.media.map((m: any) => ({
                id: m.id,
                url: resolveMediaUrl(m.url),
                type: m.type,
              })),
              createdAt: fetchedStory.createdAt || new Date().toISOString(),
              expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
              viewCount: fetchedStory.views || 0,
              likes: fetchedStory.likes || 0,
              comments: fetchedStory.comments || 0,
              content: fetchedStory.content || '',
              privacy: fetchedStory.privacy || 'PUBLIC',
              hasViewed: false,
              isAuthor: fetchedStory.authorId === currentUserId,
            },
          ],
          hasUnviewed: true,
          lastUpdated: fetchedStory.createdAt || new Date().toISOString(),
        };
        setFakeGroup(group);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    void loadStory();
  }, [storyId, currentUserId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: SOCIAL_COLORS.page, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={SOCIAL_COLORS.primary} />
      </View>
    );
  }

  if (error || !fakeGroup) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: SOCIAL_COLORS.page, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="dark" translucent backgroundColor={SOCIAL_COLORS.page} />
        <Feather name="slash" size={64} color={SOCIAL_COLORS.textMuted} />
        <Text style={{ marginTop: 16, color: SOCIAL_COLORS.text, fontSize: 18, fontWeight: '600' }}>
          Story không khả dụng
        </Text>
        <Text style={{ marginTop: 8, color: SOCIAL_COLORS.textSoft, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 }}>
          Story này có thể đã hết hạn, bị xóa hoặc bạn không có quyền xem.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: SOCIAL_COLORS.primary, borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: SOCIAL_COLORS.page }}>
      <StoryViewerModal
        group={fakeGroup}
        groups={[fakeGroup]}
        currentUserId={currentUserId}
        onClose={() => router.back()}
      />
    </View>
  );
}
