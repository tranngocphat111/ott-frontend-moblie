import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/Authcontext';
import { MediaApi, type Post } from '@/services/api/media.api';
import {
  mediaSocket,
  type MediaRealtimePayload,
} from '@/services/socket/mediaSocket';
import {
  PostCard,
  SOCIAL_COLORS,
  CommentsModal,
  ReactionsListModal,
  SharePostModal,
  CreatePostModal,
  SocialConfirmModal
} from '@/components/social';

export default function StandalonePostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const displayName = user?.fullName || 'Người dùng';

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [reaction, setReaction] = useState<string | undefined>();
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [reactionsListOpen, setReactionsListOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!postId || !currentUserId) return;

    const loadPost = async () => {
      setLoading(true);
      try {
        const fetchedPost = await MediaApi.fetchPostById(postId, currentUserId);
        if (!fetchedPost) {
          setError(true);
          return;
        }
        setPost(fetchedPost);

        // Fetch reactions
        const [counts, userReactions] = await Promise.all([
          MediaApi.fetchPostReactions(postId),
          MediaApi.fetchUserReactions(currentUserId)
        ]);

        setReactionCounts(counts);
        const userReaction = userReactions.find(r => r.targetId === postId);
        if (userReaction) {
          setReaction(userReaction.reactionType);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    void loadPost();
  }, [postId, currentUserId]);

  useEffect(() => {
    if (!postId || !currentUserId) return;

    void mediaSocket.connect();

    const handleMediaUpdate = async (payload: MediaRealtimePayload) => {
      const targetType = String(payload?.contentTargetType || '').toUpperCase();
      if (targetType !== 'POST' || payload.contentId !== postId) return;

      const operation = String(payload.operation || '').toUpperCase();
      if (operation === 'DELETE') {
        setPost(null);
        setError(true);
        return;
      }

      const freshPost = await MediaApi.fetchPostById(postId, currentUserId);
      if (!freshPost) {
        setPost(null);
        setError(true);
        return;
      }

      setPost(freshPost);
    };

    void mediaSocket.onMediaUpdate(handleMediaUpdate);
    return () => {
      mediaSocket.offMediaUpdate(handleMediaUpdate);
    };
  }, [currentUserId, postId]);

  const handleReact = async (p: Post, reactionType: string) => {
    if (!currentUserId || !post) return;
    setReactionPickerOpen(false);
    const result = await MediaApi.toggleLike(post.id, currentUserId, reactionType);
    if (!result) return;

    setPost({ ...post, likes: result.totalReactions });
    setReaction(result.liked ? (result.reactionType || reactionType) : undefined);
    
    const newCounts = await MediaApi.fetchPostReactions(post.id);
    setReactionCounts(newCounts);
  };

  const confirmDeletePost = async () => {
    if (!post) return;
    setPendingDelete(false);
    const ok = await MediaApi.deletePost(post.id);
    if (ok) {
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: SOCIAL_COLORS.page, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={SOCIAL_COLORS.primary} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: SOCIAL_COLORS.page, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="dark" translucent backgroundColor={SOCIAL_COLORS.page} />
        <Feather name="slash" size={64} color={SOCIAL_COLORS.textMuted} />
        <Text style={{ marginTop: 16, color: SOCIAL_COLORS.text, fontSize: 18, fontWeight: '600' }}>
          Bài viết không khả dụng
        </Text>
        <Text style={{ marginTop: 8, color: SOCIAL_COLORS.textSoft, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 }}>
          Bài viết có thể đã bị xóa, bạn không có quyền xem hoặc người dùng này đã chặn bạn.
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
    <SafeAreaView style={{ flex: 1, backgroundColor: SOCIAL_COLORS.page }} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" translucent backgroundColor={SOCIAL_COLORS.page} />
      
      {/* Header */}
      <View className="flex-row items-center px-4 pb-3 pt-2" style={{ backgroundColor: SOCIAL_COLORS.card, borderBottomWidth: 1, borderBottomColor: SOCIAL_COLORS.border }}>
        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chip }} onPress={() => router.back()}>
          <Feather name="arrow-left" size={21} color={SOCIAL_COLORS.primaryDark} />
        </TouchableOpacity>
        <Text className="ml-3 flex-1 text-[20px] font-black" style={{ color: SOCIAL_COLORS.text }}>
          Bài viết
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <PostCard
          post={post}
          currentUserId={currentUserId}
          reaction={reaction}
          reactionCounts={reactionCounts}
          showReactionPicker={reactionPickerOpen}
          onReact={handleReact}
          onPickReaction={(p) => setReactionPickerOpen(!!p)}
          onComment={(p) => setCommentOpen(!!p)}
          onShowReactions={(p) => setReactionsListOpen(!!p)}
          onEdit={(p) => setEditingPost(p)}
          onDelete={(p) => setPendingDelete(!!p)}
          onShare={(p) => setShareOpen(!!p)}
        />
      </View>

      <CreatePostModal
        visible={Boolean(editingPost)}
        userId={currentUserId}
        avatarUrl={user?.avatarUrl}
        userName={displayName}
        initialPost={editingPost}
        onClose={() => setEditingPost(null)}
        onCreated={() => {}}
        onUpdated={(updated) => { setPost(updated); setEditingPost(null); }}
      />

      <CommentsModal
        visible={commentOpen}
        post={post}
        currentUserId={currentUserId}
        onClose={() => setCommentOpen(false)}
        onCountChange={(_, delta) => setPost({ ...post, comments: Math.max(0, post.comments + delta) })}
      />

      <ReactionsListModal
        visible={reactionsListOpen}
        post={post}
        onClose={() => setReactionsListOpen(false)}
      />

      <SharePostModal
        visible={shareOpen}
        post={post}
        currentUserId={currentUserId}
        currentUserName={displayName}
        currentUserAvatar={user?.avatarUrl}
        onClose={() => setShareOpen(false)}
        onShared={(shared) => setPost({ ...post, shares: post.shares + 1 })}
      />

      <SocialConfirmModal
        visible={pendingDelete}
        title="Xóa bài viết?"
        message="Bài viết này sẽ bị xóa vĩnh viễn."
        icon="trash-2"
        onClose={() => setPendingDelete(false)}
        actions={[
          { label: 'Giữ lại', variant: 'secondary' },
          { label: 'Xóa bài viết', variant: 'danger', onPress: confirmDeletePost },
        ]}
      />
    </SafeAreaView>
  );
}
