import { THEME_COLORS } from '@/constants/theme';
import { MediaApi, type Comment, type Post } from '@/services/api/media.api';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar } from './SocialAvatar';
import { SocialConfirmModal } from './SocialConfirmModal';
import { SOCIAL_COLORS, useFullScreenModalPadding } from './socialTheme';

export function CommentsModal({
  visible,
  post,
  currentUserId,
  onClose,
  onCountChange,
  renderHeader,
}: {
  visible: boolean;
  post: Post | null;
  currentUserId?: string;
  onClose: () => void;
  onCountChange: (postId: string, delta: number) => void;
  renderHeader?: (post: Post) => React.ReactNode;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [repliesByParent, setRepliesByParent] = useState<Record<string, Comment[]>>({});
  const [repliesLoading, setRepliesLoading] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [pendingDeleteComment, setPendingDeleteComment] = useState<Comment | null>(null);
  const modalPadding = useFullScreenModalPadding();

  const loadFirst = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    try {
      const data = await MediaApi.fetchRootComments(post.id, 0, 20);
      setComments(data.comments);
      setPage(0);
      setHasMore(data.hasMore);
      setRepliesByParent({});
    } finally {
      setLoading(false);
    }
  }, [post]);

  useEffect(() => {
    if (!visible) return;
    setText('');
    setReplyingTo(null);
    void loadFirst();
  }, [loadFirst, visible]);

  const loadMore = async () => {
    if (!post || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await MediaApi.fetchRootComments(post.id, next, 20);
      setComments((prev) => {
        const ids = new Set(prev.map((comment) => comment.id));
        return [...prev, ...data.comments.filter((comment) => !ids.has(comment.id))];
      });
      setPage(next);
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async () => {
    if (!post || !currentUserId || !text.trim() || sending) return;
    setSending(true);
    try {
      const created = await MediaApi.addComment(post.id, currentUserId, text.trim(), replyingTo?.id);
      if (!created) {
        Alert.alert('Không gửi được', 'Bình luận chưa được gửi. Vui lòng thử lại.');
        return;
      }
      if (replyingTo) {
        setRepliesByParent((prev) => ({
          ...prev,
          [replyingTo.id]: [...(prev[replyingTo.id] || []), created],
        }));
        setComments((prev) =>
          prev.map((item) => (item.id === replyingTo.id ? { ...item, totalReplies: item.totalReplies + 1 } : item)),
        );
      } else {
        setComments((prev) => [created, ...prev]);
      }
      setText('');
      setReplyingTo(null);
      onCountChange(post.id, 1);
    } finally {
      setSending(false);
    }
  };

  const loadReplies = async (comment: Comment) => {
    if (repliesByParent[comment.id]?.length || repliesLoading[comment.id]) return;
    setRepliesLoading((prev) => ({ ...prev, [comment.id]: true }));
    try {
      const data = await MediaApi.fetchReplies(comment.id, 0, 10);
      setRepliesByParent((prev) => ({ ...prev, [comment.id]: data.comments }));
    } finally {
      setRepliesLoading((prev) => ({ ...prev, [comment.id]: false }));
    }
  };

  const deleteComment = (comment: Comment) => {
    if (!post || comment.authorId !== currentUserId) return;
    setPendingDeleteComment(comment);
  };

  const confirmDeleteComment = async () => {
    if (!post || !pendingDeleteComment) return;
    const comment = pendingDeleteComment;
    const ok = await MediaApi.deleteComment(post.id, comment.id);
    if (!ok) return;

    if (comment.parentId) {
      setRepliesByParent((prev) => {
        const next = { ...prev };
        if (next[comment.parentId]) {
          next[comment.parentId] = next[comment.parentId].filter((item) => item.id !== comment.id);
        }
        return next;
      });
      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.parentId ? { ...item, totalReplies: Math.max(0, item.totalReplies - 1) } : item
        )
      );
    } else {
      setComments((prev) => prev.filter((item) => item.id !== comment.id));
    }
    
    setPendingDeleteComment(null);
    onCountChange(post.id, -1);
  };

  const renderComment = (comment: Comment, depth: number) => {
    const replies = repliesByParent[comment.id] || [];
    const isRoot = depth === 0;

    // Cap indentation visual depth to avoid going off screen
    const containerClass = isRoot ? "mb-4" : (depth > 2 ? "ml-4 mt-3" : "ml-12 mt-3");
    
    return (
      <View key={comment.id} className={containerClass}>
        {comment.isDeleted ? (
          <View className="flex-row">
            <View className={`rounded-full items-center justify-center border border-gray-200 bg-gray-100 ${isRoot ? 'h-9 w-9' : 'h-7 w-7'}`}>
              <Feather name="trash-2" size={isRoot ? 16 : 14} color="#9ca3af" />
            </View>
            <View className="ml-3 flex-1">
              <View className="rounded-xl px-3 py-2 border border-dashed border-gray-200" style={{ backgroundColor: SOCIAL_COLORS.page }}>
                <Text className={`italic ${isRoot ? 'text-[13px]' : 'text-[12px]'}`} style={{ color: SOCIAL_COLORS.textSoft }}>
                  Bình luận này đã bị xóa.
                </Text>
              </View>
              {comment.totalReplies > 0 ? (
                <View className="ml-2 mt-1 flex-row items-center gap-4">
                  <TouchableOpacity onPress={() => loadReplies(comment)}>
                    <Text className="text-xs font-bold" style={{ color: SOCIAL_COLORS.primaryDark }}>
                      {replies.length ? 'Ẩn/hiện phản hồi' : `Xem ${comment.totalReplies} phản hồi`}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <Pressable className="flex-row" onLongPress={() => deleteComment(comment)}>
            <Avatar uri={comment.authorAvatar} name={comment.authorName} size={isRoot ? 36 : 30} />
            <View className="ml-3 flex-1">
              <View className="rounded-xl px-3 py-2" style={{ backgroundColor: isRoot ? SOCIAL_COLORS.card : SOCIAL_COLORS.chipLight }}>
                <Text className={`font-bold ${isRoot ? 'text-sm' : 'text-xs'}`} style={{ color: SOCIAL_COLORS.text }}>{comment.authorName}</Text>
                <Text className={`mt-1 leading-5 ${isRoot ? 'text-[14px]' : 'text-[13px]'}`} style={{ color: SOCIAL_COLORS.text }}>{comment.text}</Text>
              </View>
              <View className="ml-2 mt-1 flex-row items-center gap-4">
                <Text className="text-xs" style={{ color: SOCIAL_COLORS.textSoft }}>{comment.time}</Text>
                <TouchableOpacity onPress={() => setReplyingTo(comment)}>
                  <Text className="text-xs font-bold" style={{ color: SOCIAL_COLORS.primaryDark }}>Trả lời</Text>
                </TouchableOpacity>
                {comment.authorId === currentUserId ? (
                  <TouchableOpacity onPress={() => deleteComment(comment)}>
                    <Text className="text-xs font-bold" style={{ color: '#ef4444' }}>Xóa</Text>
                  </TouchableOpacity>
                ) : null}
                {comment.totalReplies > 0 ? (
                  <TouchableOpacity onPress={() => loadReplies(comment)}>
                    <Text className="text-xs font-bold" style={{ color: SOCIAL_COLORS.primaryDark }}>
                      {replies.length ? 'Ẩn/hiện phản hồi' : `Xem ${comment.totalReplies} phản hồi`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </Pressable>
        )}

        {repliesLoading[comment.id] ? (
          <View className="ml-12 mt-2">
            <ActivityIndicator color={THEME_COLORS.primary[600]} size="small" />
          </View>
        ) : null}

        {replies.length > 0 ? (
          <View>
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <View className="flex-1" style={[modalPadding, { backgroundColor: SOCIAL_COLORS.page }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
            <View className="h-14 flex-row items-center justify-between border-b px-4" style={{ borderColor: SOCIAL_COLORS.border }}>
              <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: SOCIAL_COLORS.chip }} onPress={onClose}>
                <Feather name="x" size={21} color={SOCIAL_COLORS.primaryDark} />
              </TouchableOpacity>
              <Text className="text-lg font-bold" style={{ color: SOCIAL_COLORS.text }}>Bình luận</Text>
              <View className="h-10 w-10" />
            </View>
          <FlatList
            className="flex-1"
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={renderHeader && post ? () => <>{renderHeader(post)}</> : undefined}
            ListEmptyComponent={
              loading ? (
                <View className="py-10 items-center justify-center">
                  <ActivityIndicator color={THEME_COLORS.primary[600]} />
                </View>
              ) : (
                <View className="py-20 items-center justify-center">
                  <Feather name="message-circle" size={34} color={SOCIAL_COLORS.textSoft} />
                  <Text className="mt-3 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>Chưa có bình luận</Text>
                </View>
              )
            }
            ListFooterComponent={
                loadingMore ? (
                  <View className="py-3">
                    <ActivityIndicator color={THEME_COLORS.primary[600]} />
                  </View>
                ) : null
              }
              renderItem={({ item }) => renderComment(item, 0)}
          />

          <View className="border-t px-4 py-3" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
            {replyingTo ? (
              <View className="mb-2 flex-row items-center rounded-xl px-3 py-2" style={{ backgroundColor: SOCIAL_COLORS.chipLight }}>
                <Text className="flex-1 text-xs font-semibold" style={{ color: SOCIAL_COLORS.textMuted }} numberOfLines={1}>
                  Đang trả lời {replyingTo.authorName}
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Feather name="x" size={16} color={SOCIAL_COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}
            <View className="flex-row items-end rounded-xl px-3 py-2" style={{ backgroundColor: SOCIAL_COLORS.chipLight }}>
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                placeholder="Viết bình luận..."
                placeholderTextColor={SOCIAL_COLORS.textSoft}
                className="max-h-28 flex-1 py-1 text-[15px]"
                style={{ color: SOCIAL_COLORS.text }}
              />
              <TouchableOpacity
                className="ml-2 h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: text.trim() ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.borderStrong }}
                disabled={!text.trim() || sending}
                onPress={send}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={17} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <SocialConfirmModal
        visible={!!pendingDeleteComment}
        title="Xóa bình luận?"
        message="Bình luận này sẽ bị xóa khỏi bài viết. Bạn vẫn muốn tiếp tục chứ?"
        icon="trash-2"
        onClose={() => setPendingDeleteComment(null)}
        actions={[
          { label: 'Giữ lại', variant: 'secondary' },
          { label: 'Xóa bình luận', variant: 'danger', onPress: confirmDeleteComment },
        ]}
      />
    </>
  );
}
