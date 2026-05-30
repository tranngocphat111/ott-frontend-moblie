import { CommentsModal, CreatePostModal, PostCard, ReactionsListModal, SharePostModal, SOCIAL_COLORS, SocialConfirmModal } from '@/components/social';
import { useAuth } from '@/contexts/Authcontext';
import { MediaApi, type Post } from '@/services/api/media.api';
import { userApi } from '@/services/api/user.api';
import { relationshipSocket, type RelationshipRealtimePayload } from '@/services/socket/relationshipSocket';
import type { UserResponse } from '@/types';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '@/components/social/SocialAvatar';
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
  const [searchMode, setSearchMode] = useState<'posts' | 'users'>('users');
  const [users, setUsers] = useState<UserResponse[]>([]);
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
        setUsers([]);
        setHasMore(false);
        setPage(0);
        setReactionCountsByPost({});
        return;
      }

      if (replace) setLoading(true);
      try {
        let currentMode = searchMode;
        if (trimmed.startsWith('#') && searchMode !== 'posts') {
          setSearchMode('posts');
          currentMode = 'posts';
        }

        if (currentMode === 'posts') {
          const data = await MediaApi.searchPosts(trimmed, currentUserId, nextPage, PAGE_SIZE);
          if (!data) return;
          setPosts((prev) => {
            if (replace) return data.posts;
            const ids = new Set(prev.map((post) => post.id));
            return [...prev, ...data.posts.filter((post) => !ids.has(post.id))];
          });
          setPage(nextPage);
          setHasMore(data.hasMore);
          void refreshReactionCounts(data.posts, replace);
          void hydrateUserReactions();
        } else {
          const res = await userApi.searchUsers(trimmed);
          let userList = [];
          if (Array.isArray(res)) {
            userList = res;
          } else if ((res as any).result) {
            userList = (res as any).result;
          }
          userList = userList.filter((u: any) => u.relationshipStatus !== 'BLOCKED' && u.relationshipStatus !== 'USER_BLOCKED');
          setUsers(userList);
          setHasMore(false);
        }
      } finally {
        if (replace) setLoading(false);
      }
    },
    [currentUserId, hydrateUserReactions, query, refreshReactionCounts],
  );

  useEffect(() => {
    if (!query.trim()) {
      setPosts([]);
      setUsers([]);
      setHasSearched(false);
      setHasMore(false);
      return;
    }
    const timer = setTimeout(() => {
      void runSearch(0, true, query);
    }, 420);
    return () => clearTimeout(timer);
  }, [query, runSearch, searchMode]);

  useEffect(() => {
    if (!currentUserId) return;

    const handleRelationshipUpdate = (payload: RelationshipRealtimePayload) => {
      if (!payload) return;

      const targetIds = payload.targetUserIds || [];
      const isTarget = targetIds.includes(currentUserId) || payload.requesterId === currentUserId || payload.receiverId === currentUserId;
      if (!isTarget) return;

      setUsers((prevUsers) => prevUsers.map(u => {
        const uId = (u as any)._id || u.user_id;
        if (uId === payload.requesterId || uId === payload.receiverId) {
          let newStatus = (u as any).relationshipStatus;
          if (payload.type === 'REQUEST_SENT') {
            newStatus = payload.requesterId === currentUserId ? 'PENDING_REQUEST_SENT' : 'PENDING_REQUEST_RECEIVED';
          } else if (payload.type === 'REQUEST_ACCEPTED') {
            newStatus = 'FRIEND';
          } else if (['REQUEST_REJECTED', 'REQUEST_CANCELED', 'REQUEST_CANCELLED', 'UNFRIENDED'].includes(payload.type)) {
            newStatus = 'NONE';
          } else if (['BLOCKED', 'USER_BLOCKED'].includes(payload.type)) {
            newStatus = 'BLOCKED';
          }
          return { ...u, relationshipStatus: newStatus };
        }
        return u;
      }));
    };

    relationshipSocket.onRelationshipUpdate(handleRelationshipUpdate);
    return () => relationshipSocket.offRelationshipUpdate(handleRelationshipUpdate);
  }, [currentUserId]);

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

  const handleSendFriendRequest = async (targetId: string) => {
    if (!currentUserId) return;
    try {
      const res = await MediaApi.sendFriendRequest(currentUserId, targetId);
      if (res) {
        setUsers(users.map(u => ((u as any)._id || u.user_id) === targetId ? { ...u, relationshipStatus: 'PENDING_REQUEST_SENT' } : u));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptFriendRequest = async (targetId: string) => {
    if (!currentUserId) return;
    try {
      const rel = await MediaApi.fetchRelationshipOf(currentUserId, targetId);
      if (rel?.id) {
        await MediaApi.acceptFriendRequest(rel.id);
        setUsers(users.map(u => ((u as any)._id || u.user_id) === targetId ? { ...u, relationshipStatus: 'FRIEND' } : u));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectFriendRequest = async (targetId: string) => {
    if (!currentUserId) return;
    try {
      const rel = await MediaApi.fetchRelationshipOf(currentUserId, targetId);
      if (rel?.id) {
        await MediaApi.rejectFriendRequest(rel.id);
        setUsers(users.map(u => ((u as any)._id || u.user_id) === targetId ? { ...u, relationshipStatus: 'NONE' } : u));
      }
    } catch (e) {
      console.error(e);
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
          placeholder={searchMode === 'posts' ? "Tìm bài viết" : "Tìm người dùng (tên, email, sđt)"}
          placeholderTextColor={SOCIAL_COLORS.textSoft}
          className="ml-3 flex-1 text-[15px] font-semibold"
          style={{ color: SOCIAL_COLORS.text }}
        />
      </View>
      <View className="flex-row mt-4">
        <TouchableOpacity
          className={`flex-1 py-2 items-center border-b-2 ${searchMode === 'users' ? 'border-blue-500' : 'border-transparent'}`}
          onPress={() => setSearchMode('users')}
        >
          <Text className={`font-bold ${searchMode === 'users' ? 'text-blue-500' : 'text-gray-500'}`}>Người dùng</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 items-center border-b-2 ${searchMode === 'posts' ? 'border-blue-500' : 'border-transparent'}`}
          onPress={() => setSearchMode('posts')}
        >
          <Text className={`font-bold ${searchMode === 'posts' ? 'text-blue-500' : 'text-gray-500'}`}>Bài viết</Text>
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" edges={['left', 'right']} style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <StatusBar style="dark" translucent backgroundColor={SOCIAL_COLORS.page} />
      <FlatList
        data={searchMode === 'posts' ? posts : (users as any)}
        keyExtractor={(item: any) => item.id}
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
              {loading ? 'Đang tìm...' : hasSearched ? 'Không có kết quả' : (searchMode === 'users' ? 'Nhập tên, email hoặc SĐT' : 'Nhập từ khóa để tìm bài viết')}
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
        renderItem={({ item }) => {
          if (searchMode === 'users') {
            const userItem = item as any; // Cast to any to handle displayName/phoneNumber
            const targetId = userItem.id || userItem._id || userItem.user_id;
            const name = userItem.displayName || userItem.fullName || userItem.username || 'User';
            const phone = userItem.phoneNumber || userItem.phone;
            const relationshipStatus = userItem.relationshipStatus;
            
            const stringToColor = (str: string) => {
              if (!str) return "#ccc";
              let hash = 0;
              for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
              }
              const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
              return "#" + "00000".substring(0, 6 - c.length) + c;
            };

            return (
              <TouchableOpacity
                className="p-4 bg-white border-b border-gray-100 flex-row items-start"
                onPress={() => router.push({ pathname: '/(main)/social/profile/[userId]', params: { userId: targetId } })}
              >
                <Avatar uri={userItem.avatarUrl || userItem.avatar} name={name} size={48} color={stringToColor(name)} />
                <View className="ml-4 flex-1">
                  <Text className="font-bold text-base text-gray-900">{name}</Text>
                  {userItem.email && <Text className="text-gray-500 text-sm mt-0.5">{userItem.email}</Text>}
                  {phone && <Text className="text-gray-500 text-sm">{phone}</Text>}
                  {relationshipStatus === 'PENDING_REQUEST_RECEIVED' && (
                    <Text className="text-gray-400 text-xs mt-0.5">Vừa gửi lời mời</Text>
                  )}

                  {currentUserId !== targetId && (
                    <View className="mt-3 flex-row gap-2">
                      {relationshipStatus === 'FRIEND' ? (
                        <View className="flex-1 items-center justify-center py-2 rounded-lg bg-gray-100">
                          <Text className="text-gray-600 font-bold">Bạn bè</Text>
                        </View>
                      ) : relationshipStatus === 'PENDING_REQUEST_SENT' ? (
                        <View className="flex-1 items-center justify-center py-2 rounded-lg bg-gray-100">
                          <Text className="text-gray-600 font-bold">Đã gửi lời mời</Text>
                        </View>
                      ) : relationshipStatus === 'PENDING_REQUEST_RECEIVED' ? (
                        <>
                          <TouchableOpacity
                            onPress={() => handleAcceptFriendRequest(targetId)}
                            className="flex-1 items-center justify-center py-2 rounded-lg"
                            style={{ backgroundColor: SOCIAL_COLORS.primary }}
                          >
                            <Text className="text-white font-bold">Xác nhận</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleRejectFriendRequest(targetId)}
                            className="flex-1 items-center justify-center py-2 rounded-lg"
                            style={{ backgroundColor: SOCIAL_COLORS.chip }}
                          >
                            <Text className="font-bold" style={{ color: SOCIAL_COLORS.primaryDark }}>Xóa</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleSendFriendRequest(targetId)}
                          className="flex-1 items-center justify-center py-2 rounded-lg"
                          style={{ backgroundColor: SOCIAL_COLORS.primary }}
                        >
                          <Text className="text-white font-bold">Thêm bạn bè</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <PostCard
              post={item as Post}
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
          );
        }}
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
            onDelete={setPendingDeletePost}
            onShare={setSharePost}
          />
        )}
      />
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
