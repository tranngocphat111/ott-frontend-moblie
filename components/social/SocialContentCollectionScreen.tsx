import { useAuth } from '@/contexts/Authcontext';
import { MediaApi, type Post, type SocialContentItem, type StoryItem, type StoryUserGroup } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View, type ViewToken } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommentsModal } from './CommentsModal';
import { CreatePostModal } from './CreatePostModal';
import { PostCard } from './PostCard';
import { ReactionsListModal } from './ReactionsListModal';
import { SharePostModal } from './SharePostModal';
import { SocialConfirmModal } from './SocialConfirmModal';
import { SocialStoryCard } from './SocialStoryCard';
import { StoryViewerModal } from './StoryViewerModal';
import { SOCIAL_COLORS } from './socialTheme';

const PAGE_SIZE = 12;

type ContentCollectionMode = 'saved' | 'history';

export function SocialContentCollectionScreen({
  title,
  subtitle,
  emptyTitle,
  emptySubtitle,
  icon,
  mode,
  loadPage,
  onClearAll,
}: {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptySubtitle: string;
  icon: keyof typeof Feather.glyphMap;
  mode: ContentCollectionMode;
  loadPage: (page: number, size: number, currentUserId?: string) => Promise<SocialContentItem[]>;
  onClearAll?: () => Promise<boolean>;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = user?.id;
  const displayName = user?.fullName || 'Người dùng';
  const [items, setItems] = useState<SocialContentItem[]>([]);
  const [storySavedById, setStorySavedById] = useState<Record<string, boolean>>({});
  const [storySaveBusyById, setStorySaveBusyById] = useState<Record<string, boolean>>({});
  const [reactionByPost, setReactionByPost] = useState<Record<string, string>>({});
  const [reactionCountsByPost, setReactionCountsByPost] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [reactionPickerPost, setReactionPickerPost] = useState<Post | null>(null);
  const [reactionsListPost, setReactionsListPost] = useState<Post | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [pendingDeletePost, setPendingDeletePost] = useState<Post | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [storyGroup, setStoryGroup] = useState<StoryUserGroup | null>(null);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const recordedViewIdsRef = useRef(new Set<string>());

  const refreshReactionCounts = useCallback(async (posts: Post[], replace = false) => {
    if (!posts.length) {
      if (replace) setReactionCountsByPost({});
      return;
    }
    const entries = await Promise.all(posts.map(async (post) => [post.id, await MediaApi.fetchPostReactions(post.id)] as const));
    setReactionCountsByPost((prev) => ({
      ...(replace ? {} : prev),
      ...Object.fromEntries(entries),
    }));
  }, []);

  const hydrateUserReactions = useCallback(async () => {
    if (!currentUserId) return;
    const reactions = await MediaApi.fetchUserReactions(currentUserId);
    const next: Record<string, string> = {};
    reactions.forEach((reaction) => {
      if (reaction.targetId) next[reaction.targetId] = reaction.reactionType;
    });
    setReactionByPost(next);
  }, [currentUserId]);

  const hydrateStorySaved = useCallback(
    async (nextItems: SocialContentItem[], replace = false) => {
      const stories = nextItems.filter((item) => item.kind === 'story').map((item) => item.story);
      if (!stories.length) {
        if (replace) setStorySavedById({});
        return;
      }
      if (mode === 'saved') {
        setStorySavedById((prev) => ({
          ...(replace ? {} : prev),
          ...Object.fromEntries(stories.map((story) => [story.id, true])),
        }));
        return;
      }
      const entries = await Promise.all(stories.map(async (story) => [story.id, await MediaApi.checkIsSaved(story.id)] as const));
      setStorySavedById((prev) => ({
        ...(replace ? {} : prev),
        ...Object.fromEntries(entries),
      }));
    },
    [mode],
  );

  const load = useCallback(
    async (nextPage = 0, replace = true) => {
      if (!currentUserId) {
        setLoading(false);
        return;
      }
      if (replace) setLoading(true);
      try {
        const data = await loadPage(nextPage, PAGE_SIZE, currentUserId);
        setItems((prev) => {
          if (replace) return data;
          const ids = new Set(prev.map((item) => `${item.kind}:${item.id}`));
          return [...prev, ...data.filter((item) => !ids.has(`${item.kind}:${item.id}`))];
        });
        setPage(nextPage);
        setHasMore(data.length >= PAGE_SIZE);
        const posts = data.filter((item) => item.kind === 'post').map((item) => item.post);
        void refreshReactionCounts(posts, replace);
        void hydrateStorySaved(data, replace);
        void hydrateUserReactions();
      } finally {
        if (replace) setLoading(false);
      }
    },
    [currentUserId, hydrateStorySaved, hydrateUserReactions, loadPage, refreshReactionCounts],
  );

  useEffect(() => {
    void load(0, true);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(0, true);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await load(page + 1, false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReact = async (post: Post, reactionType: string) => {
    if (!currentUserId) return;
    setReactionPickerPost(null);
    const result = await MediaApi.toggleLike(post.id, currentUserId, reactionType);
    if (!result) {
      Alert.alert('Không thể bày tỏ cảm xúc', 'Vui lòng thử lại sau.');
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.kind === 'post' && item.post.id === post.id
          ? { ...item, post: { ...item.post, likes: result.totalReactions } }
          : item,
      ),
    );
    setReactionByPost((prev) => {
      const next = { ...prev };
      if (result.liked) next[post.id] = result.reactionType || reactionType;
      else delete next[post.id];
      return next;
    });
    void refreshReactionCounts([post]);
  };

  const handleCommentCountChange = (postId: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.kind === 'post' && item.post.id === postId
          ? { ...item, post: { ...item.post, comments: Math.max(0, item.post.comments + delta) } }
          : item,
      ),
    );
  };

  const handleUpdatedPost = (post: Post) => {
    setItems((prev) => prev.map((item) => (item.kind === 'post' && item.post.id === post.id ? { ...item, post } : item)));
    void refreshReactionCounts([post]);
    setEditingPost(null);
  };

  const confirmDeletePost = async () => {
    if (!pendingDeletePost) return;
    const post = pendingDeletePost;
    const previous = items;
    setItems((prev) => prev.filter((item) => !(item.kind === 'post' && item.post.id === post.id)));
    const ok = await MediaApi.deletePost(post.id);
    if (!ok) {
      setItems(previous);
      Alert.alert('Không xóa được', 'Vui lòng thử lại sau.');
    }
  };

  const handlePostSaveChange = (postId: string, isSaved: boolean) => {
    if (mode !== 'saved' || isSaved) return;
    setItems((prev) => prev.filter((item) => !(item.kind === 'post' && item.post.id === postId)));
  };

  const handleToggleStorySave = async (story: StoryItem) => {
    if (storySaveBusyById[story.id]) return;
    const nextSaved = !storySavedById[story.id];
    setStorySavedById((prev) => ({ ...prev, [story.id]: nextSaved }));
    setStorySaveBusyById((prev) => ({ ...prev, [story.id]: true }));
    const ok = await MediaApi.toggleSaveContent(story.id, nextSaved);
    setStorySaveBusyById((prev) => ({ ...prev, [story.id]: false }));
    if (!ok) {
      setStorySavedById((prev) => ({ ...prev, [story.id]: !nextSaved }));
      Alert.alert('Không cập nhật được', 'Vui lòng thử lại sau.');
      return;
    }
    if (mode === 'saved' && !nextSaved) {
      setItems((prev) => prev.filter((item) => !(item.kind === 'story' && item.story.id === story.id)));
    }
  };

  const handleOpenStory = (story: StoryItem) => {
    setStoryGroup({
      userId: story.userId || story.id,
      name: story.name,
      avatarUrl: story.avatarUrl,
      stories: [story],
    });
  };

  const handleSharedPost = (shared: Post) => {
    setItems((prev) =>
      prev.map((item) =>
        item.kind === 'post' && item.post.id === sharePost?.id
          ? { ...item, post: { ...item.post, shares: item.post.shares + 1 } }
          : item,
      ),
    );
    void refreshReactionCounts([shared]);
  };

  const confirmClearAll = async () => {
    if (!onClearAll) return;
    const previous = items;
    setItems([]);
    const ok = await onClearAll();
    if (!ok) {
      setItems(previous);
      Alert.alert('Không xóa được', 'Vui lòng thử lại sau.');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<SocialContentItem>[] }) => {
    viewableItems.forEach(({ item }) => {
      if (!item || item.kind !== 'post' || recordedViewIdsRef.current.has(item.post.id)) return;
      recordedViewIdsRef.current.add(item.post.id);
      void MediaApi.recordViewHistory(item.post.id);
    });
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 45, minimumViewTime: 600 }).current;

  const header = (
    <View style={{ paddingTop: insets.top + 10, backgroundColor: SOCIAL_COLORS.card, borderBottomColor: SOCIAL_COLORS.border }} className="border-b px-4 pb-4">
      <View className="flex-row items-center">
        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chip }} onPress={() => router.back()}>
          <Feather name="arrow-left" size={21} color={SOCIAL_COLORS.primaryDark} />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="text-[22px] font-black" style={{ color: SOCIAL_COLORS.text }}>
            {title}
          </Text>
          <Text className="mt-0.5 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>
            {subtitle}
          </Text>
        </View>
        {onClearAll && items.length ? (
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chip }} onPress={() => setClearConfirmVisible(true)}>
            <Feather name="trash-2" size={18} color={SOCIAL_COLORS.primaryDark} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" edges={['left', 'right']} style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <StatusBar style="dark" translucent backgroundColor={SOCIAL_COLORS.page} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={SOCIAL_COLORS.primary} size="large" />
          <Text className="mt-3 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>
            Đang tải...
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}:${item.id}`}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SOCIAL_COLORS.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          onScrollBeginDrag={() => setReactionPickerPost(null)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            <View className="mx-4 mt-8 items-center rounded-2xl border px-6 py-10" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
              <Feather name={icon} size={30} color={SOCIAL_COLORS.textSoft} />
              <Text className="mt-3 text-center text-base font-bold" style={{ color: SOCIAL_COLORS.text }}>
                {emptyTitle}
              </Text>
              <Text className="mt-1 text-center text-sm" style={{ color: SOCIAL_COLORS.textMuted }}>
                {emptySubtitle}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator color={SOCIAL_COLORS.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item.kind === 'post' ? (
              <PostCard
                post={item.post}
                currentUserId={currentUserId}
                reaction={reactionByPost[item.post.id]}
                reactionCounts={reactionCountsByPost[item.post.id]}
                showReactionPicker={reactionPickerPost?.id === item.post.id}
                onReact={handleReact}
                onPickReaction={setReactionPickerPost}
                onComment={setCommentPost}
                onShowReactions={setReactionsListPost}
                onEdit={setEditingPost}
                onDelete={setPendingDeletePost}
                onShare={setSharePost}
                onSaveChange={handlePostSaveChange}
              />
            ) : (
              <SocialStoryCard
                story={item.story}
                saved={Boolean(storySavedById[item.story.id])}
                busy={Boolean(storySaveBusyById[item.story.id])}
                actionLabel={mode === 'saved' ? 'Bỏ lưu' : undefined}
                onOpen={handleOpenStory}
                onOpenProfile={(story) =>
                  story.userId
                    ? router.push({
                        pathname: '/(main)/social/profile/[userId]',
                        params: { userId: story.userId },
                      })
                    : undefined
                }
                onToggleSave={handleToggleStorySave}
              />
            )
          }
        />
      )}

      <CreatePostModal
        visible={Boolean(editingPost)}
        userId={currentUserId}
        avatarUrl={user?.avatarUrl}
        userName={displayName}
        initialPost={editingPost}
        onClose={() => setEditingPost(null)}
        onCreated={(post) => setItems((prev) => [{ id: post.id, kind: 'post', post, raw: post } as SocialContentItem, ...prev])}
        onUpdated={handleUpdatedPost}
      />
      <CommentsModal visible={!!commentPost} post={commentPost} currentUserId={currentUserId} onClose={() => setCommentPost(null)} onCountChange={handleCommentCountChange} />
      <ReactionsListModal visible={!!reactionsListPost} post={reactionsListPost} onClose={() => setReactionsListPost(null)} />
      <SharePostModal visible={!!sharePost} post={sharePost} currentUserId={currentUserId} currentUserName={displayName} currentUserAvatar={user?.avatarUrl} onClose={() => setSharePost(null)} onShared={handleSharedPost} />
      <StoryViewerModal
        group={storyGroup}
        groups={storyGroup ? [storyGroup] : []}
        currentUserId={currentUserId}
        onClose={() => setStoryGroup(null)}
        onDeleted={(storyId) => {
          setStoryGroup(null);
          setItems((prev) => prev.filter((item) => !(item.kind === 'story' && item.story.id === storyId)));
        }}
      />
      <SocialConfirmModal
        visible={!!pendingDeletePost}
        title="Xóa bài viết?"
        message="Bài viết này sẽ bị xóa khỏi danh sách hiển thị của bạn."
        icon="trash-2"
        onClose={() => setPendingDeletePost(null)}
        actions={[
          { label: 'Giữ lại', variant: 'secondary' },
          { label: 'Xóa bài viết', variant: 'danger', onPress: confirmDeletePost },
        ]}
      />
      <SocialConfirmModal
        visible={clearConfirmVisible}
        title="Xóa lịch sử?"
        message="Toàn bộ lịch sử xem hiện tại sẽ bị xóa khỏi tài khoản của bạn."
        icon="trash-2"
        onClose={() => setClearConfirmVisible(false)}
        actions={[
          { label: 'Giữ lại', variant: 'secondary' },
          { label: 'Xóa lịch sử', variant: 'danger', onPress: confirmClearAll },
        ]}
      />
    </SafeAreaView>
  );
}
