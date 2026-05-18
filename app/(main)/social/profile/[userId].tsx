import { useAuth } from '@/contexts/Authcontext';
import { CommentsModal, CreatePostModal, PostCard, ReactionsListModal, SOCIAL_COLORS, SocialConfirmModal, type SocialConfirmAction } from '@/components/social';
import { Avatar } from '@/components/social/SocialAvatar';
import { MediaApi, type ApiUser, type Post } from '@/services/api/media.api';
import { ChatApi } from '@/services/api/chat';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const relationshipIdOf = (relationship: any) =>
  String(relationship?._id || relationship?.id || relationship?.relationship_id || '');

const relationshipStatusOf = (relationship: any) =>
  String(relationship?.status || relationship?.relationshipStatus || '').toUpperCase();

const requesterIdOf = (relationship: any) =>
  String(relationship?.requesterId || relationship?.requester_id || relationship?.senderId || relationship?.fromUserId || '');

const receiverIdOf = (relationship: any) =>
  String(relationship?.receiverId || relationship?.receiver_id || relationship?.targetId || relationship?.toUserId || '');

export default function SocialProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUserId = user?.id;
  const [profileUser, setProfileUser] = useState<ApiUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [relationship, setRelationship] = useState<any | null>(null);
  const [reactionByPost, setReactionByPost] = useState<Record<string, string>>({});
  const [reactionCountsByPost, setReactionCountsByPost] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reactionPickerPost, setReactionPickerPost] = useState<Post | null>(null);
  const [reactionsListPost, setReactionsListPost] = useState<Post | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [socialConfirm, setSocialConfirm] = useState<{
    title: string;
    message?: string;
    icon?: keyof typeof Feather.glyphMap;
    actions: SocialConfirmAction[];
  } | null>(null);

  const displayName = profileUser?.displayName || profileUser?.username || 'Người dùng';
  const isMine = currentUserId === userId;
  const relationshipStatus = relationshipStatusOf(relationship);
  const relationshipId = relationshipIdOf(relationship);
  const isRequester = requesterIdOf(relationship) === String(currentUserId || '');
  const isReceiver = receiverIdOf(relationship) === String(currentUserId || '');

  const refreshReactionCounts = useCallback(async (items: Post[], replace = false) => {
    if (!items.length) {
      if (replace) setReactionCountsByPost({});
      return;
    }
    const entries = await Promise.all(
      items.map(async (post) => [post.id, await MediaApi.fetchPostReactions(post.id)] as const),
    );
    setReactionCountsByPost((prev) => ({
      ...(replace ? {} : prev),
      ...Object.fromEntries(entries),
    }));
  }, []);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [nextUser, nextPosts, reactions, friends, nextRelationship] = await Promise.all([
        MediaApi.fetchUserById(userId),
        MediaApi.fetchPostsByUser(userId, currentUserId),
        currentUserId ? MediaApi.fetchUserReactions(currentUserId) : Promise.resolve([]),
        MediaApi.fetchFriends(userId),
        currentUserId && currentUserId !== userId
          ? MediaApi.fetchRelationshipStatusViaChat(currentUserId, userId)
          : Promise.resolve(null),
      ]);
      setProfileUser(nextUser);
      setPosts(nextPosts);
      setFriendCount(friends.length);
      setRelationship(nextRelationship);
      const nextReactions: Record<string, string> = {};
      reactions.forEach((reaction) => {
        if (reaction.targetId) nextReactions[reaction.targetId] = reaction.reactionType;
      });
      setReactionByPost(nextReactions);
      void refreshReactionCounts(nextPosts, true);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, refreshReactionCounts, userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
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

    setPosts((prev) =>
      prev.map((item) => (item.id === post.id ? { ...item, likes: result.totalReactions } : item)),
    );
    setReactionByPost((prev) => {
      const next = { ...prev };
      if (result.liked) next[post.id] = result.reactionType || reactionType;
      else delete next[post.id];
      return next;
    });
    void refreshReactionCounts([post]);
  };

  const handleSharePost = async (post: Post) => {
    try {
      await Share.share({
        title: post.author.name,
        message: `${post.author.name}: ${post.content || 'Bài viết trên Riff'}`,
      });
    } catch {
      Alert.alert('Không chia sẻ được', 'Vui lòng thử lại sau.');
    }
  };

  const handleCommentCountChange = (postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, comments: Math.max(0, post.comments + delta) } : post)),
    );
  };

  const handleUpdatedPost = (post: Post) => {
    setPosts((prev) => prev.map((item) => (item.id === post.id ? post : item)));
    void refreshReactionCounts([post]);
    setEditingPost(null);
  };

  const handleDeletePost = (post: Post) => {
    if (!isMine) return;
    setSocialConfirm({
      title: 'Xóa bài viết?',
      message: 'Bài viết này sẽ bị xóa khỏi trang cá nhân của bạn. Hành động này không thể hoàn tác.',
      icon: 'trash-2',
      actions: [
        { label: 'Giữ lại', variant: 'secondary' },
        {
          label: 'Xóa bài viết',
          variant: 'danger',
          onPress: async () => {
            const previous = posts;
            setPosts((prev) => prev.filter((item) => item.id !== post.id));
            const ok = await MediaApi.deletePost(post.id);
            if (!ok) {
              setPosts(previous);
              Alert.alert('Không xóa được', 'Vui lòng thử lại sau.');
            }
          },
        },
      ],
    });
  };

  const refreshRelationship = useCallback(async () => {
    if (!currentUserId || !userId || currentUserId === userId) return;
    const latest = await MediaApi.fetchRelationshipStatusViaChat(currentUserId, userId);
    setRelationship(latest);
  }, [currentUserId, userId]);

  const handleOpenChat = async () => {
    if (!currentUserId || !userId || currentUserId === userId || actionLoading) return;
    setActionLoading(true);
    try {
      const conversations = await ChatApi.getUserConversations(currentUserId);
      const existing = conversations.find((item: any) =>
        item?.conversation?.type === 'private' &&
        item?.conversation?.participants?.some((participant: any) => String(participant?.user_id) === String(userId)),
      );

      let conversation: any = existing?.conversation;
      if (!conversation?._id) {
        const created = await ChatApi.createConversation({
          creatorId: currentUserId,
          type: 'private',
          memberIds: [userId],
        });
        conversation = created?._id ? created : created?.conversation || created?.data || created?.result;
      }

      const conversationId = String(conversation?._id || conversation?.id || conversation?.conversationId || '');
      if (!conversationId) {
        Alert.alert('Không mở được tin nhắn', 'Vui lòng thử lại sau.');
        return;
      }

      router.push({
        pathname: '/(main)/chat/[conversationId]',
        params: {
          conversationId,
          title: displayName,
          avatar: profileUser?.avatarUrl || '',
        },
      } as any);
    } catch {
      Alert.alert('Không mở được tin nhắn', 'Vui lòng thử lại sau.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFriendAction = async () => {
    if (!currentUserId || !userId || currentUserId === userId || actionLoading) return;
    setActionLoading(true);
    try {
      if (relationshipStatus === 'ACCEPTED') {
        setSocialConfirm({
          title: 'Hủy kết bạn?',
          message: `Bạn sẽ không còn thấy trạng thái hoạt động và các nội dung chỉ dành cho bạn bè của ${displayName}.`,
          icon: 'user-minus',
          actions: [
            { label: 'Giữ bạn bè', variant: 'secondary' },
            {
              label: 'Hủy kết bạn',
              variant: 'danger',
              onPress: async () => {
                setActionLoading(true);
                try {
                  const ok = await MediaApi.unfriendViaChat(currentUserId, userId);
                  if (ok) {
                    setRelationship(null);
                    setFriendCount((value) => Math.max(0, value - 1));
                  }
                } finally {
                  setActionLoading(false);
                }
              },
            },
          ],
        });
        return;
      }

      if (relationshipStatus === 'PENDING' && isRequester && relationshipId) {
        const ok = await MediaApi.cancelFriendRequestViaChat(relationshipId, relationship);
        if (ok) setRelationship(null);
        return;
      }

      if (relationshipStatus === 'PENDING' && isReceiver && relationshipId) {
        setSocialConfirm({
          title: 'Lời mời kết bạn',
          message: `${displayName} muốn kết bạn với bạn. Bạn muốn phản hồi thế nào?`,
          icon: 'user-plus',
          actions: [
            {
              label: 'Đồng ý',
              variant: 'primary',
              onPress: async () => {
                setActionLoading(true);
                try {
                  const ok = await MediaApi.acceptFriendRequestViaChat(relationshipId, relationship);
                  if (ok) {
                    await refreshRelationship();
                    setFriendCount((value) => value + 1);
                  }
                } finally {
                  setActionLoading(false);
                }
              },
            },
            {
              label: 'Từ chối',
              variant: 'danger',
              onPress: async () => {
                setActionLoading(true);
                try {
                  const ok = await MediaApi.rejectFriendRequestViaChat(relationshipId, relationship);
                  if (ok) setRelationship(null);
                } finally {
                  setActionLoading(false);
                }
              },
            },
            { label: 'Để sau', variant: 'secondary' },
          ],
        });
        return;
      }

      const result = await MediaApi.sendFriendRequestViaChat(currentUserId, userId);
      if (!result) {
        Alert.alert('Không gửi được lời mời', 'Vui lòng thử lại sau.');
        return;
      }
      setRelationship(result);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!currentUserId || !userId || currentUserId === userId || actionLoading) return;
    const blocked = relationshipStatus === 'BLOCKED';
    setSocialConfirm({
      title: blocked ? 'Bỏ chặn người dùng?' : 'Chặn người dùng?',
      message: blocked
        ? `${displayName} có thể nhắn tin và tương tác lại với bạn sau khi bỏ chặn.`
        : `${displayName} sẽ không thể nhắn tin hoặc tương tác với bạn trong Riff.`,
      icon: blocked ? 'unlock' : 'slash',
      actions: [
        { label: 'Hủy', variant: 'secondary' },
        {
          label: blocked ? 'Bỏ chặn' : 'Chặn',
          variant: blocked ? 'primary' : 'danger',
          onPress: async () => {
            setActionLoading(true);
            try {
              const ok = blocked
                ? await MediaApi.unblockUserViaChat(currentUserId, userId)
                : await MediaApi.blockUserViaChat(currentUserId, userId);
              if (ok) await refreshRelationship();
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    });
  };

  const friendButtonLabel =
    relationshipStatus === 'ACCEPTED'
      ? 'Bạn bè'
      : relationshipStatus === 'PENDING'
        ? isRequester
          ? 'Đã gửi'
          : 'Phản hồi'
        : relationshipStatus === 'BLOCKED'
          ? 'Đã chặn'
          : 'Kết bạn';

  const profileMedia = useMemo(
    () =>
      posts
        .flatMap((post) =>
          post.media.map((media, index) => ({
            ...media,
            key: `${post.id}-${media.id || index}`,
          })),
        )
        .slice(0, 6),
    [posts],
  );

  const hasProfileDetails = Boolean(
    profileUser?.work ||
      profileUser?.location ||
      profileUser?.relationshipStatus ||
      (isMine && profileUser?.phoneNumber),
  );

  const header = (
    <View style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <View className="overflow-hidden" style={{ height: insets.top + 228, backgroundColor: SOCIAL_COLORS.primaryDark }}>
        {profileUser?.coverUrl ? (
          <ExpoImage
            source={{ uri: profileUser.coverUrl }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center" style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}>
            <Text className="text-[64px] font-black italic text-white/20">Riff</Text>
          </View>
        )}
        <View className="absolute bottom-0 left-0 right-0 top-0 bg-black/25" />
        <TouchableOpacity
          className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-black/35"
          style={{ top: insets.top + 10 }}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={21} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          className="absolute right-4 h-10 w-10 items-center justify-center rounded-full bg-black/35"
          style={{ top: insets.top + 10 }}
          activeOpacity={0.85}
          onPress={() =>
            setSocialConfirm({
              title: 'Tùy chọn trang cá nhân',
              message: isMine
                ? 'Bạn có thể chỉnh sửa hồ sơ, xem QR và quản lý thông tin cá nhân ở trang này.'
                : 'Bạn có thể nhắn tin, kết bạn hoặc chặn người này bằng các nút bên dưới.',
              icon: 'more-horizontal',
              actions: [{ label: 'Đã hiểu', variant: 'primary' }],
            })
          }
        >
          <Feather name="more-horizontal" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="border-b px-4 pb-5" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
        <View className="-mt-16 flex-row items-end justify-between">
          <View className="rounded-full border-4 border-white">
            <Avatar uri={profileUser?.avatarUrl} name={displayName} size={136} color={SOCIAL_COLORS.primary} />
            <View className="absolute bottom-2 right-2 h-8 w-8 rounded-full border-2 border-white bg-green-600" />
          </View>
          {isMine ? (
            <TouchableOpacity
              className="mb-2 h-10 flex-row items-center rounded-xl px-4"
              style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
              activeOpacity={0.85}
              onPress={() => router.push('/(main)/qr-scan' as any)}
            >
              <Feather name="maximize" size={17} color={SOCIAL_COLORS.primaryDark} />
              <Text className="ml-2 text-[13px] font-black" style={{ color: SOCIAL_COLORS.text }}>QR</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text className="mt-4 text-[30px] font-black leading-9" style={{ color: SOCIAL_COLORS.text }} numberOfLines={2}>
          {displayName}
        </Text>
        <Text className="mt-1 text-[16px]" style={{ color: SOCIAL_COLORS.textMuted }}>
          <Text className="font-black" style={{ color: SOCIAL_COLORS.text }}>{friendCount}</Text> người bạn
          <Text>  ·  </Text>
          <Text className="font-black" style={{ color: SOCIAL_COLORS.text }}>{posts.length}</Text> bài viết
        </Text>

        {profileUser?.bio ? (
          <Text className="mt-3 text-[18px] italic leading-6" style={{ color: SOCIAL_COLORS.text }}>
            {profileUser.bio}
          </Text>
        ) : null}

        {!isMine ? (
          <View className="mt-4 flex-row gap-2">
            <TouchableOpacity
              className="h-12 flex-1 flex-row items-center justify-center rounded-xl"
              style={{ backgroundColor: relationshipStatus === 'BLOCKED' ? SOCIAL_COLORS.chip : SOCIAL_COLORS.chipLight }}
              disabled={actionLoading}
              activeOpacity={0.85}
              onPress={handleFriendAction}
            >
              <Ionicons
                name={relationshipStatus === 'ACCEPTED' ? 'person' : relationshipStatus === 'PENDING' ? 'time' : 'person-add'}
                size={19}
                color={SOCIAL_COLORS.primaryDark}
              />
              <Text className="ml-2 text-[15px] font-black" style={{ color: SOCIAL_COLORS.text }}>{friendButtonLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-12 flex-1 flex-row items-center justify-center rounded-xl"
              style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}
              disabled={actionLoading}
              activeOpacity={0.85}
              onPress={handleOpenChat}
            >
              <Ionicons name="chatbubble-ellipses" size={19} color="#fff" />
              <Text className="ml-2 text-[15px] font-black text-white">Nhắn tin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-12 w-14 items-center justify-center rounded-xl"
              style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
              disabled={actionLoading}
              activeOpacity={0.85}
              onPress={handleBlockToggle}
            >
              <Ionicons name={relationshipStatus === 'BLOCKED' ? 'ban' : 'ellipsis-horizontal'} size={22} color={SOCIAL_COLORS.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            className="mt-4 h-12 flex-row items-center justify-center rounded-xl"
            style={{ backgroundColor: SOCIAL_COLORS.chipLight }}
            activeOpacity={0.85}
            onPress={() => router.push('/profile/edit' as any)}
          >
            <Feather name="edit-3" size={18} color={SOCIAL_COLORS.primaryDark} />
            <Text className="ml-2 text-[15px] font-black" style={{ color: SOCIAL_COLORS.text }}>Chỉnh sửa trang cá nhân</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="mt-2 border-y px-4 py-4" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
        <Text className="text-[20px] font-black" style={{ color: SOCIAL_COLORS.text }}>Chi tiết</Text>
        <View className="mt-3 gap-3">
          {profileUser?.work ? (
            <View className="flex-row items-start">
              <Ionicons name="school" size={22} color={SOCIAL_COLORS.textMuted} />
              <Text className="ml-3 flex-1 text-[16px] leading-6" style={{ color: SOCIAL_COLORS.text }}>
                Học tập/làm việc tại <Text className="font-black">{profileUser.work}</Text>
              </Text>
            </View>
          ) : null}
          {profileUser?.location ? (
            <View className="flex-row items-start">
              <Ionicons name="home" size={22} color={SOCIAL_COLORS.textMuted} />
              <Text className="ml-3 flex-1 text-[16px] leading-6" style={{ color: SOCIAL_COLORS.text }}>
                Sống tại <Text className="font-black">{profileUser.location}</Text>
              </Text>
            </View>
          ) : null}
          {profileUser?.relationshipStatus ? (
            <View className="flex-row items-start">
              <Ionicons name="heart" size={22} color={SOCIAL_COLORS.textMuted} />
              <Text className="ml-3 flex-1 text-[16px] leading-6" style={{ color: SOCIAL_COLORS.text }}>
                {profileUser.relationshipStatus}
              </Text>
            </View>
          ) : null}
          {profileUser?.phoneNumber && isMine ? (
            <View className="flex-row items-start">
              <Ionicons name="call" size={22} color={SOCIAL_COLORS.textMuted} />
              <Text className="ml-3 flex-1 text-[16px] leading-6" style={{ color: SOCIAL_COLORS.text }}>
                {profileUser.phoneNumber}
              </Text>
            </View>
          ) : null}
          {!hasProfileDetails ? (
            <Text className="text-[15px] font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>
              Người dùng chưa cập nhật thông tin giới thiệu.
            </Text>
          ) : null}
        </View>
      </View>

      {profileMedia.length ? (
        <View className="mt-2 border-y py-4" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
          <View className="mb-3 flex-row items-center justify-between px-4">
            <Text className="text-[20px] font-black" style={{ color: SOCIAL_COLORS.text }}>Ảnh nổi bật</Text>
            <Text className="text-[14px] font-bold" style={{ color: SOCIAL_COLORS.primaryDark }}>{profileMedia.length}</Text>
          </View>
          <View className="flex-row flex-wrap px-4" style={{ gap: 4 }}>
            {profileMedia.map((media) => (
              <View key={media.key} className="overflow-hidden" style={{ width: '32.6%', aspectRatio: 1, backgroundColor: SOCIAL_COLORS.chip }}>
                <ExpoImage source={{ uri: media.thumbnailUrl || media.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                {media.type === 'video' ? (
                  <View className="absolute bottom-2 right-2 h-7 w-7 items-center justify-center rounded-full bg-black/45">
                    <Ionicons name="play" size={15} color="#fff" />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="mt-2 border-y px-4 py-3" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
        <Text className="text-[18px] font-black" style={{ color: SOCIAL_COLORS.text }}>Bài viết</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" edges={['left', 'right']} style={{ backgroundColor: SOCIAL_COLORS.page }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={SOCIAL_COLORS.primary} size="large" />
          <Text className="mt-3 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>Đang tải trang cá nhân...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SOCIAL_COLORS.primary} />}
          onScrollBeginDrag={() => setReactionPickerPost(null)}
          ListEmptyComponent={
            <View className="mx-4 mt-8 items-center rounded-xl border px-6 py-10" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
              <Feather name="edit-3" size={30} color={SOCIAL_COLORS.textSoft} />
              <Text className="mt-3 text-center text-base font-bold" style={{ color: SOCIAL_COLORS.text }}>Chưa có bài viết</Text>
            </View>
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
      )}

      <CreatePostModal
        visible={Boolean(editingPost)}
        userId={currentUserId}
        avatarUrl={user?.avatarUrl}
        userName={user?.fullName || 'Người dùng'}
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
      />

      <ReactionsListModal
        visible={!!reactionsListPost}
        post={reactionsListPost}
        onClose={() => setReactionsListPost(null)}
      />

      <SocialConfirmModal
        visible={!!socialConfirm}
        title={socialConfirm?.title || ''}
        message={socialConfirm?.message}
        icon={socialConfirm?.icon}
        actions={socialConfirm?.actions || []}
        onClose={() => setSocialConfirm(null)}
      />
    </SafeAreaView>
  );
}
