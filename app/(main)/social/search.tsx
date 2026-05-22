import { CommentsModal, CreatePostModal, PostCard, ReactionsListModal, SharePostModal, SOCIAL_COLORS, SocialConfirmModal } from '@/components/social';
import { useAuth } from '@/contexts/Authcontext';
import { MediaApi, type Post } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View, type ViewToken } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGE_SIZE = 10;

export default function SocialSearchScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = user?.id;
  const displayName = user?.fullName || 'Người dùng';
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactionByPost, setReactionByPost] = useState<Record<string, string>>({});
  const [reactionCountsByPost, setReactionCountsByPost] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [reactionPickerPost, setReactionPickerPost] = useState<Post | null>(null);
  const [reactionsListPost, setReactionsListPost] = useState<Post | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [pendingDeletePost, setPendingDeletePost] = useState<Post | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const recordedViewIdsRef = useRef(new Set<string>());

  const refreshReactionCounts = useCallback(async (items: Post[], replace = false) => {
    if (!items.length) {
      if (replace) setReactionCountsByPost({});
      return;
    }
    const entries = await Promise.all(items.map(async (post) => [post.id, await MediaApi.fetchPostReactions(post.id)] as const));
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

  const runSearch = useCallback(
    async (nextPage = 0, replace = true, text = query) => {
      if (!currentUserId) return;
      const trimmed = text.trim();
      setHasSearched(Boolean(trimmed));
      if (!trimmed) {
        setPosts([]);
        setHasMore(false);
        setPage(0);
        setReactionCountsByPost({});
        return;
      }

      if (replace) setLoading(true);
      try {
        const data = await MediaApi.searchPosts(trimmed, currentUserId, nextPage, PAGE_SIZE);
        if (!data) {
          Alert.alert('Không tìm kiếm được', 'Vui lòng thử lại sau.');
          return;
        }
        setPosts((prev) => {
          if (replace) return data.posts;
          const ids = new Set(prev.map((post) => post.id));
          return [...prev, ...data.posts.filter((post) => !ids.has(post.id))];
        });
        setPage(nextPage);
        setHasMore(data.hasMore);
        void refreshReactionCounts(data.posts, replace);
        void hydrateUserReactions();
      } finally {
        if (replace) setLoading(false);
      }
    },
    [currentUserId, hydrateUserReactions, query, refreshReactionCounts],
  );

  useEffect(() => {
    if (!query.trim()) {
      setPosts([]);
      setHasSearched(false);
      setHasMore(false);
      return;
    }
    const timer = setTimeout(() => {
      void runSearch(0, true, query);
    }, 420);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await runSearch(0, true);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await runSearch(page + 1, false);
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
    setPosts((prev) => prev.map((item) => (item.id === post.id ? { ...item, likes: result.totalReactions } : item)));
    setReactionByPost((prev) => {
      const next = { ...prev };
      if (result.liked) next[post.id] = result.reactionType || reactionType;
      else delete next[post.id];
      return next;
    });
    void refreshReactionCounts([post]);
  };

  const handleCommentCountChange = (postId: string, delta: number) => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, comments: Math.max(0, post.comments + delta) } : post)));
  };

  const handleUpdatedPost = (post: Post) => {
    setPosts((prev) => prev.map((item) => (item.id === post.id ? post : item)));
    void refreshReactionCounts([post]);
    setEditingPost(null);
  };

  const confirmDeletePost = async () => {
    if (!pendingDeletePost) return;
    const post = pendingDeletePost;
    const previous = posts;
    setPosts((prev) => prev.filter((item) => item.id !== post.id));
    const ok = await MediaApi.deletePost(post.id);
    if (!ok) {
      setPosts(previous);
      Alert.alert('Không xóa được', 'Vui lòng thử lại sau.');
    }
  };

  const handleSharedPost = (shared: Post) => {
    setPosts((prev) => prev.map((post) => (post.id === sharePost?.id ? { ...post, shares: post.shares + 1 } : post)));
    void refreshReactionCounts([shared]);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<Post>[] }) => {
    viewableItems.forEach(({ item }) => {
      if (!item?.id || recordedViewIdsRef.current.has(item.id)) return;
      recordedViewIdsRef.current.add(item.id);
      void MediaApi.recordViewHistory(item.id);
    });
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 45, minimumViewTime: 600 }).current;

  const header = (
    <View style={{ paddingTop: insets.top + 12, backgroundColor: SOCIAL_COLORS.page }} className="px-4 pb-4">
      <View className="rounded-2xl border p-3" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
      <View className="flex-row items-center">
        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chip }} onPress={() => router.back()}>
          <Feather name="arrow-left" size={21} color={SOCIAL_COLORS.primaryDark} />
        </TouchableOpacity>
        <Text className="ml-3 flex-1 text-[22px] font-black" style={{ color: SOCIAL_COLORS.text }}>
          Tìm kiếm
        </Text>
      </View>
      <View className="mt-4 h-12 flex-row items-center rounded-full px-4" style={{ backgroundColor: SOCIAL_COLORS.chipLight }}>
        <Feather name="search" size={18} color={SOCIAL_COLORS.primaryDark} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runSearch(0, true)}
          returnKeyType="search"
          autoFocus
          placeholder="Tìm bài viết"
          placeholderTextColor={SOCIAL_COLORS.textSoft}
          className="ml-3 flex-1 text-[15px] font-semibold"
          style={{ color: SOCIAL_COLORS.text }}
        />
      </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" edges={['left', 'right']} style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <StatusBar style="dark" translucent backgroundColor={SOCIAL_COLORS.page} />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
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
            {loading ? <ActivityIndicator color={SOCIAL_COLORS.primary} /> : <Feather name={hasSearched ? 'search' : 'compass'} size={30} color={SOCIAL_COLORS.textSoft} />}
            <Text className="mt-3 text-center text-base font-bold" style={{ color: SOCIAL_COLORS.text }}>
              {loading ? 'Đang tìm...' : hasSearched ? 'Không có kết quả' : 'Nhập từ khóa để tìm bài viết'}
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
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={currentUserId}
            reaction={reactionByPost[item.id]}
            reactionCounts={reactionCountsByPost[item.id]}
            showReactionPicker={reactionPickerPost?.id === item.id}
            onReact={handleReact}
            onPickReaction={setReactionPickerPost}
            onComment={setCommentPost}
            onShowReactions={setReactionsListPost}
            onEdit={setEditingPost}
            onDelete={setPendingDeletePost}
            onShare={setSharePost}
          />
        )}
      />

      <CreatePostModal
        visible={Boolean(editingPost)}
        userId={currentUserId}
        avatarUrl={user?.avatarUrl}
        userName={displayName}
        initialPost={editingPost}
        onClose={() => setEditingPost(null)}
        onCreated={(post) => setPosts((prev) => [post, ...prev])}
        onUpdated={handleUpdatedPost}
      />
      <CommentsModal visible={!!commentPost} post={commentPost} currentUserId={currentUserId} onClose={() => setCommentPost(null)} onCountChange={handleCommentCountChange} />
      <ReactionsListModal visible={!!reactionsListPost} post={reactionsListPost} onClose={() => setReactionsListPost(null)} />
      <SharePostModal visible={!!sharePost} post={sharePost} currentUserId={currentUserId} currentUserName={displayName} currentUserAvatar={user?.avatarUrl} onClose={() => setSharePost(null)} onShared={handleSharedPost} />
      <SocialConfirmModal
        visible={!!pendingDeletePost}
        title="Xóa bài viết?"
        message="Bài viết này sẽ bị xóa khỏi kết quả hiển thị của bạn."
        icon="trash-2"
        onClose={() => setPendingDeletePost(null)}
        actions={[
          { label: 'Giữ lại', variant: 'secondary' },
          { label: 'Xóa bài viết', variant: 'danger', onPress: confirmDeletePost },
        ]}
      />
    </SafeAreaView>
  );
}
