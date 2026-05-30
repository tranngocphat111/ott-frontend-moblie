import { THEME_COLORS } from "@/constants/theme";
import { useAuth } from "@/contexts/Authcontext";
import {
  MediaApi,
  type Post,
  type StoryItem,
  type StorySuggestedUser,
  type StoryUserGroup,
} from "@/services/api/media.api";
import {
  mediaSocket,
  type MediaRealtimePayload,
  type PostActivityPayload,
} from "@/services/socket/mediaSocket";
import {
  relationshipSocket,
  type RelationshipRealtimePayload,
} from "@/services/socket/relationshipSocket";
import {
  CommentsModal,
  CreatePostModal,
  CreateStoryModal,
  DiscoverHeader,
  PostCard,
  ReactionsListModal,
  SharePostModal,
  SOCIAL_COLORS,
  SocialConfirmModal,
  StoryViewerModal,
} from "@/components/social";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  View,
  type ViewToken,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const PAGE_SIZE = 8;

export default function DiscoverScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = user?.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryUserGroup[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<StorySuggestedUser[]>(
    [],
  );
  const [reactionByPost, setReactionByPost] = useState<Record<string, string>>(
    {},
  );
  const [reactionCountsByPost, setReactionCountsByPost] = useState<
    Record<string, Record<string, number>>
  >({});
  const [feedError, setFeedError] = useState<string | null>(null);
  const [storyLoadError, setStoryLoadError] = useState<string | null>(null);

  const [pendingMap, setPendingMap] = useState<Record<string, string>>({});
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const pendingMapRef = useRef<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [createStoryVisible, setCreateStoryVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [reactionPickerPost, setReactionPickerPost] = useState<Post | null>(
    null,
  );
  const [reactionsListPost, setReactionsListPost] = useState<Post | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [storyGroup, setStoryGroup] = useState<StoryUserGroup | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [editingStory, setEditingStory] = useState<StoryItem | null>(null);
  const [pendingDeletePost, setPendingDeletePost] = useState<Post | null>(null);
  const recordedViewIdsRef = useRef(new Set<string>());

  const avatarUrl = user?.avatarUrl;
  const displayName = user?.fullName || "Người dùng";

  const refreshReactionCounts = useCallback(
    async (items: Post[], replace = false) => {
      if (!items.length) {
        if (replace) setReactionCountsByPost({});
        return;
      }
      const entries = await Promise.all(
        items.map(
          async (post) =>
            [post.id, await MediaApi.fetchPostReactions(post.id)] as const,
        ),
      );
      setReactionCountsByPost((prev) => ({
        ...(replace ? {} : prev),
        ...Object.fromEntries(entries),
      }));
    },
    [],
  );

  const loadInitial = useCallback(
    async (isRefresh = false) => {
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      if (!isRefresh) setLoading(true);
      setFeedError(null);
      setStoryLoadError(null);
      try {
        const [postsPage, stories, reactions, suggested] = await Promise.all([
          MediaApi.findPostsWithAuthorized(0, PAGE_SIZE, currentUserId),
          MediaApi.fetchStoryGroups(currentUserId),
          MediaApi.fetchUserReactions(currentUserId),
          MediaApi.fetchSuggestedUsers(currentUserId),
        ]);

        const nextPosts = postsPage?.posts || [];
        setPosts(nextPosts);
        setStoryGroups(stories);
        setSuggestedUsers(suggested);
        setPage(0);
        setHasMore(Boolean(postsPage?.hasMore));

        const nextReactions: Record<string, string> = {};
        reactions.forEach((reaction) => {
          if (reaction.targetId)
            nextReactions[reaction.targetId] = reaction.reactionType;
        });
        setReactionByPost(nextReactions);
        void refreshReactionCounts(nextPosts, true);
      } catch (error) {
        const message =
          error instanceof Error && error.message ?
            error.message
          : "Không tải được bài viết hoặc story. Vui lòng thử lại sau.";
        setFeedError(message);
        setStoryLoadError(message);
      } finally {
        setLoading(false);
      }
    },
    [currentUserId, refreshReactionCounts],
  );

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    pendingMapRef.current = pendingMap;
  }, [pendingMap]);

  useEffect(() => {
    if (!currentUserId) return;

    setPendingMap({});
    pendingMapRef.current = {};
    void relationshipSocket.connect();

    const handleRelationshipUpdate = (payload: RelationshipRealtimePayload) => {
      if (!payload) return;

      const targetUserId =
        payload.requesterId === currentUserId ? payload.receiverId
        : payload.receiverId === currentUserId ? payload.requesterId
        : null;

      const resolveTargetFromRelationship = (): string | null => {
        if (!payload.relationshipId) return null;
        const entries = Object.entries(pendingMapRef.current);
        const match = entries.find(
          ([, relId]) => relId === payload.relationshipId,
        );
        return match ? match[0] : null;
      };

      const effectiveTarget = targetUserId ?? resolveTargetFromRelationship();
      if (!effectiveTarget) return;

      if (
        payload.type === "REQUEST_SENT" &&
        payload.requesterId === currentUserId
      ) {
        setPendingMap((prev) => ({
          ...prev,
          [effectiveTarget]: payload.relationshipId,
        }));
        return;
      }

      if (payload.type === "REQUEST_ACCEPTED") {
        setPendingMap((prev) => {
          if (!prev[effectiveTarget]) return prev;
          const next = { ...prev };
          delete next[effectiveTarget];
          return next;
        });
        setHiddenIds((prev) => {
          if (prev.has(effectiveTarget)) return prev;
          const next = new Set(prev);
          next.add(effectiveTarget);
          return next;
        });
        return;
      }

      if (
        payload.type === "REQUEST_REJECTED" ||
        payload.type === "REQUEST_CANCELED" ||
        payload.type === "REQUEST_CANCELLED" ||
        payload.type === "UNFRIENDED" ||
        payload.type === "BLOCKED" ||
        payload.type === "USER_BLOCKED"
      ) {
        setPendingMap((prev) => {
          if (!prev[effectiveTarget]) return prev;
          const next = { ...prev };
          delete next[effectiveTarget];
          return next;
        });
        setHiddenIds((prev) => {
          if (!prev.has(effectiveTarget)) return prev;
          const next = new Set(prev);
          next.delete(effectiveTarget);
          return next;
        });
      }
    };

    void relationshipSocket.onRelationshipUpdate(handleRelationshipUpdate);
    return () => {
      relationshipSocket.offRelationshipUpdate(handleRelationshipUpdate);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      mediaSocket.disconnect();
      return;
    }

    void mediaSocket.connect();

    const refreshPostStats = async (
      postId: string,
      includeReactions = false,
    ) => {
      const freshPost = await MediaApi.fetchPostById(postId, currentUserId);
      if (!freshPost) return;
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, ...freshPost } : post,
        ),
      );
      if (includeReactions) void refreshReactionCounts([freshPost]);
    };

    const handleMediaUpdate = async (payload: MediaRealtimePayload) => {
      if (!payload?.contentId) return;

      if (payload.contentTargetType === "STORY") {
        void refreshStories();
        return;
      }

      if (payload.contentTargetType !== "POST") return;
      const postId = payload.contentId;

      if (String(payload.operation || "").toUpperCase() === "DELETE") {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
        setReactionByPost((prev) => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
        setReactionCountsByPost((prev) => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
        return;
      }

      const freshPost = await MediaApi.fetchPostById(postId, currentUserId);
      if (!freshPost) return;
      setPosts((prev) => {
        const exists = prev.some((post) => post.id === freshPost.id);
        if (exists)
          return prev.map((post) =>
            post.id === freshPost.id ? freshPost : post,
          );
        return [freshPost, ...prev];
      });
      void refreshReactionCounts([freshPost]);
    };

    const handleActivity = (payload: PostActivityPayload) => {
      if (!payload.postId) return;

      // Check if this activity belongs to a loaded post
      const isPost = posts.some((p) => p.id === payload.postId);

      if (isPost) {
        if (payload.activityType === "COMMENT") {
          void refreshPostStats(payload.postId);
          return;
        }

        if (
          payload.activityType === "REACTION" ||
          payload.activityType === "VIEW"
        ) {
          void refreshPostStats(payload.postId, true);
        }
      } else {
        // If not a post, it might be a story, refresh stories to update their stats
        void refreshStories();
      }
    };

    void mediaSocket.onMediaUpdate(handleMediaUpdate);
    void mediaSocket.onPostActivity(handleActivity);
    return () => {
      mediaSocket.offMediaUpdate(handleMediaUpdate);
      mediaSocket.offPostActivity(handleActivity);
    };
  }, [currentUserId, refreshReactionCounts]);

  const refreshStories = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setStoryLoadError(null);
      const [stories, suggested] = await Promise.all([
        MediaApi.fetchStoryGroups(currentUserId),
        MediaApi.fetchSuggestedUsers(currentUserId),
      ]);

      // Deduplicate stories by ID to prevent duplicates after edit (like web frontend)
      const seenIds = new Set<string>();
      const dedupedStories = stories
        .map((group) => ({
          ...group,
          stories: group.stories.filter((s) => {
            if (seenIds.has(s.id)) return false;
            seenIds.add(s.id);
            return true;
          }),
        }))
        .filter((group) => group.stories.length > 0);

      setStoryGroups(dedupedStories);
      setSuggestedUsers(suggested);
    } catch (error) {
      setStoryLoadError(
        error instanceof Error && error.message ?
          error.message
        : "Không tải được story. Vui lòng thử lại sau.",
      );
    }
  }, [currentUserId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitial(true);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!currentUserId || loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await MediaApi.findPostsWithAuthorized(
        nextPage,
        PAGE_SIZE,
        currentUserId,
      );
      if (!data) return;
      const newPosts = data.posts.filter(
        (post) => !posts.some((item) => item.id === post.id),
      );
      setPosts((prev) => {
        const ids = new Set(prev.map((post) => post.id));
        return [...prev, ...data.posts.filter((post) => !ids.has(post.id))];
      });
      void refreshReactionCounts(newPosts);
      setPage(nextPage);
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreatedPost = (post: Post) => {
    setPosts((prev) => [post, ...prev.filter((item) => item.id !== post.id)]);
    void refreshReactionCounts([post]);
  };

  const handleUpdatedPost = (post: Post) => {
    setPosts((prev) => prev.map((item) => (item.id === post.id ? post : item)));
    void refreshReactionCounts([post]);
    setEditingPost(null);
  };

  const handleCommentCountChange = (postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ?
          { ...post, comments: Math.max(0, post.comments + delta) }
        : post,
      ),
    );
  };

  const handleSharePost = (post: Post) => {
    setSharePost(post);
  };

  const handleSharedPost = (post: Post) => {
    setPosts((prev) => [
      post,
      ...prev
        .filter((item) => item.id !== post.id)
        .map((item) =>
          item.id === sharePost?.id ?
            { ...item, shares: item.shares + 1 }
          : item,
        ),
    ]);
    void refreshReactionCounts([post]);
  };

  const handleReact = async (post: Post, reactionType: string) => {
    if (!currentUserId) return;
    setReactionPickerPost(null);
    const result = await MediaApi.toggleLike(
      post.id,
      currentUserId,
      reactionType,
    );
    if (!result) {
      Alert.alert("Không thể bày tỏ cảm xúc", "Vui lòng thử lại sau.");
      return;
    }

    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id ? { ...item, likes: result.totalReactions } : item,
      ),
    );

    setReactionByPost((prev) => {
      const next = { ...prev };
      if (result.liked) {
        next[post.id] = result.reactionType || reactionType;
      } else {
        delete next[post.id];
      }
      return next;
    });
    void refreshReactionCounts([post]);
  };

  const handleAddFriend = useCallback(
    async (target: StorySuggestedUser) => {
      if (!currentUserId) return;
      const result = await MediaApi.sendFriendRequest(currentUserId, target.id);
      const relationshipId = result?.id as string | undefined;
      if (!relationshipId) {
        Alert.alert("Không gửi được lời mời", "Vui lòng thử lại sau.");
        return;
      }
      setPendingMap((prev) => ({ ...prev, [target.id]: relationshipId }));
    },
    [currentUserId],
  );

  const handleCancelFriend = useCallback(
    async (targetId: string) => {
      const relationshipId = pendingMap[targetId];
      if (!relationshipId) return;
      const ok = await MediaApi.cancelRelationship(relationshipId);
      if (!ok) {
        Alert.alert("Không hủy được lời mời", "Vui lòng thử lại sau.");
        return;
      }
      setPendingMap((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    },
    [pendingMap],
  );

  const handleDeletePost = (post: Post) => {
    setPendingDeletePost(post);
  };

  const confirmDeletePost = async () => {
    if (!pendingDeletePost) return;
    const post = pendingDeletePost;
    const previous = posts;
    const previousCounts = reactionCountsByPost;
    setPosts((prev) => prev.filter((item) => item.id !== post.id));
    setReactionCountsByPost((prev) => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });
    const ok = await MediaApi.deletePost(post.id);
    if (!ok) {
      setPosts(previous);
      setReactionCountsByPost(previousCounts);
      Alert.alert("Không xóa được", "Vui lòng thử lại sau.");
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Post>[] }) => {
      viewableItems.forEach(({ item }) => {
        if (!item?.id || recordedViewIdsRef.current.has(item.id)) return;
        recordedViewIdsRef.current.add(item.id);
        void MediaApi.recordViewHistory(item.id);
      });
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 45,
    minimumViewTime: 600,
  }).current;

  const header = useMemo(
    () => (
      <DiscoverHeader
        userName={displayName}
        avatarUrl={avatarUrl}
        storyGroups={storyGroups}
        suggestedUsers={suggestedUsers}
        topInset={insets.top}
        storyLoadError={storyLoadError}
        onCreatePost={() => {
          setEditingPost(null);
          setCreatePostVisible(true);
        }}
        onCreateStory={() => {
          setEditingStory(null);
          setCreateStoryVisible(true);
        }}
        onOpenStory={setStoryGroup}
        onAddFriend={handleAddFriend}
        onCancelFriend={handleCancelFriend}
        pendingMap={pendingMap}
        hiddenIds={hiddenIds}
        onOpenCurrentProfile={() => {
          if (!currentUserId) return;
          router.push({
            pathname: "/(main)/social/profile/[userId]",
            params: { userId: currentUserId },
          });
        }}
        onOpenSearch={() => router.push("/(main)/social/search" as any)}
        onOpenSaved={() => router.push("/(main)/social/saved" as any)}
        onOpenHistory={() => router.push("/(main)/social/history" as any)}
        onOpenRelationships={() =>
          router.push("/(main)/social/relationships" as any)
        }
      />
    ),
    [
      avatarUrl,
      currentUserId,
      displayName,
      handleAddFriend,
      handleCancelFriend,
      pendingMap,
      hiddenIds,
      insets.top,
      router,
      storyGroups,
      suggestedUsers,
    ],
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: SOCIAL_COLORS.page }}
      edges={["left", "right"]}>
      <StatusBar
        style="dark"
        translucent
        backgroundColor={SOCIAL_COLORS.page}
      />
      {feedError && posts.length > 0 && !loading ?
        <View
          className="mx-4 mb-3 rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: SOCIAL_COLORS.card,
            borderColor: SOCIAL_COLORS.border,
          }}>
          <View className="flex-row items-start gap-3">
            <View
              className="mt-0.5 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: SOCIAL_COLORS.chipLight }}>
              <Feather
                name="alert-triangle"
                size={16}
                color={SOCIAL_COLORS.primaryDark}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-sm font-bold"
                style={{ color: SOCIAL_COLORS.text }}>
                Không tải được bài viết
              </Text>
              <Text
                className="mt-1 text-xs"
                style={{ color: SOCIAL_COLORS.textMuted }}>
                {feedError}
              </Text>
            </View>
          </View>
        </View>
      : null}
      {loading ?
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={THEME_COLORS.primary[600]} size="large" />
          <Text
            className="mt-3 text-sm font-semibold"
            style={{ color: SOCIAL_COLORS.textMuted }}>
            Đang tải bảng tin...
          </Text>
        </View>
      : <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME_COLORS.primary[600]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          onScrollBeginDrag={() => setReactionPickerPost(null)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            <View
              className="mx-4 mt-6 items-center rounded-[28px] border px-6 py-10"
              style={{
                backgroundColor: SOCIAL_COLORS.card,
                borderColor: SOCIAL_COLORS.border,
              }}>
              <Feather name="coffee" size={34} color={SOCIAL_COLORS.textSoft} />
              <Text
                className="mt-3 text-center text-base font-bold"
                style={{ color: SOCIAL_COLORS.text }}>
                {feedError ? "Không tải được bài viết" : "Chưa có bài viết"}
              </Text>
              <Text
                className="mt-1 text-center text-sm"
                style={{ color: SOCIAL_COLORS.textMuted }}>
                {feedError ?
                  feedError
                : "Hãy tạo bài viết đầu tiên trên mobile."}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ?
              <View className="py-4">
                <ActivityIndicator color={THEME_COLORS.primary[600]} />
              </View>
            : null
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
              onDelete={handleDeletePost}
              onShare={handleSharePost}
            />
          )}
        />
      }

      <CreatePostModal
        visible={createPostVisible || Boolean(editingPost)}
        userId={currentUserId}
        avatarUrl={avatarUrl}
        userName={displayName}
        initialPost={editingPost}
        onClose={() => {
          setCreatePostVisible(false);
          setEditingPost(null);
        }}
        onCreated={handleCreatedPost}
        onUpdated={handleUpdatedPost}
      />

      <CreateStoryModal
        visible={createStoryVisible || Boolean(editingStory)}
        userId={currentUserId}
        initialStory={editingStory}
        onClose={() => {
          setCreateStoryVisible(false);
          setEditingStory(null);
        }}
        onCreated={refreshStories}
      />

      <CommentsModal
        visible={!!commentPost}
        post={commentPost}
        currentUserId={currentUserId}
        onClose={() => setCommentPost(null)}
        onCountChange={handleCommentCountChange}
        renderHeader={(p) => (
          <PostCard
            post={p}
            currentUserId={currentUserId}
            reaction={reactionByPost[p.id]}
            reactionCounts={reactionCountsByPost[p.id]}
            showReactionPicker={reactionPickerPost?.id === p.id}
            onReact={handleReact}
            onPickReaction={setReactionPickerPost}
            onComment={setCommentPost}
            onShowReactions={setReactionsListPost}
            onEdit={setEditingPost}
            onDelete={handleDeletePost}
            onShare={handleSharePost}
          />
        )}
      />

      <ReactionsListModal
        visible={!!reactionsListPost}
        post={reactionsListPost}
        onClose={() => setReactionsListPost(null)}
      />

      <SocialConfirmModal
        visible={!!pendingDeletePost}
        title="Xóa bài viết?"
        message="Bài viết này sẽ biến mất khỏi bảng tin của bạn. Hành động này không thể hoàn tác."
        icon="trash-2"
        onClose={() => setPendingDeletePost(null)}
        actions={[
          { label: "Giữ lại", variant: "secondary" },
          {
            label: "Xóa bài viết",
            variant: "danger",
            onPress: confirmDeletePost,
          },
        ]}
      />

      <SharePostModal
        visible={!!sharePost}
        post={sharePost}
        currentUserId={currentUserId}
        currentUserName={displayName}
        currentUserAvatar={avatarUrl}
        onClose={() => setSharePost(null)}
        onShared={handleSharedPost}
      />

      <StoryViewerModal
        group={storyGroup}
        groups={storyGroups}
        currentUserId={currentUserId}
        onGroupChange={setStoryGroup}
        onEditStory={(story) => {
          setStoryGroup(null);
          setEditingStory(story);
          setCreateStoryVisible(true);
        }}
        onDeleted={refreshStories}
        onClose={() => setStoryGroup(null)}
      />
    </SafeAreaView>
  );
}
