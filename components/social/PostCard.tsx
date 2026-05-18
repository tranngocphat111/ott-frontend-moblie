import type { Post, PostMediaItem } from '@/services/api/media.api';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import React, { useState } from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from './SocialAvatar';
import { PostMediaViewer } from './PostMediaViewer';
import { SocialConfirmModal } from './SocialConfirmModal';
import { formatCount, reactionLabel, reactionMeta, REACTION_OPTIONS, SOCIAL_COLORS, SOCIAL_SHADOW } from './socialTheme';

function ReactionPickerBubble({
  post,
  selectedReaction,
  onSelect,
}: {
  post: Post;
  selectedReaction?: string;
  onSelect: (post: Post, reactionType: string) => void;
}) {
  return (
    <View
      className="absolute bottom-[50px] left-3 right-3 z-20 rounded-full border px-2 py-1.5"
      style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border, ...SOCIAL_SHADOW }}
      pointerEvents="box-none"
    >
      <View className="flex-row items-center justify-between">
        {REACTION_OPTIONS.map((reaction) => {
          const active = String(selectedReaction || '').toUpperCase() === reaction.value;
          return (
            <TouchableOpacity
              key={reaction.value}
              className="h-[58px] flex-1 items-center justify-center rounded-full"
              style={{ backgroundColor: active ? SOCIAL_COLORS.chip : 'transparent' }}
              activeOpacity={0.85}
              onPress={() => onSelect(post, reaction.value)}
            >
              <Text className="text-[30px]">{reaction.emoji}</Text>
              <Text
                className="mt-0.5 text-[10px] font-bold"
                style={{ color: active ? SOCIAL_COLORS.text : SOCIAL_COLORS.textMuted }}
              >
                {reaction.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MediaTile({ media, compact = false }: { media: PostMediaItem; compact?: boolean }) {
  const isVideo = media.type === 'video';
  const imageUri = media.thumbnailUrl || (!isVideo ? media.url : undefined);

  return (
    <View className="overflow-hidden" style={{ flex: 1, minHeight: compact ? 148 : 330, backgroundColor: SOCIAL_COLORS.primaryDark }}>
      {imageUri ? (
        <ExpoImage source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}>
          <Feather name="video" size={30} color="#fff" />
          <Text className="mt-2 text-xs font-semibold text-white">Video</Text>
        </View>
      )}
      {isVideo && (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-black/45">
            <Feather name="play" size={22} color="#fff" />
          </View>
        </View>
      )}
    </View>
  );
}

function PostMediaGrid({
  media,
  onOpenMedia,
}: {
  media: PostMediaItem[];
  onOpenMedia: (index: number) => void;
}) {
  if (!media.length) return null;

  if (media.length === 1) {
    return (
      <Pressable className="mt-3 overflow-hidden" style={{ backgroundColor: SOCIAL_COLORS.primaryDark }} onPress={() => onOpenMedia(0)}>
        <MediaTile media={media[0]} />
      </Pressable>
    );
  }

  const visible = media.slice(0, 4);
  const isThree = media.length === 3;

  return (
    <View className="mt-3 flex-row flex-wrap overflow-hidden" style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}>
      {visible.map((item, index) => (
        <Pressable
          key={item.id || `${item.url}-${index}`}
          style={{
            width: isThree && index === 2 ? '100%' : '50%',
            aspectRatio: isThree && index === 2 ? 2 : 1,
            borderWidth: 0.5,
            borderColor: SOCIAL_COLORS.card,
          }}
          onPress={() => onOpenMedia(index)}
        >
          <MediaTile media={item} compact />
          {index === 3 && media.length > 4 && (
            <View className="absolute inset-0 items-center justify-center bg-black/45">
              <Text className="text-2xl font-bold text-white">+{media.length - 4}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function PostEngagementSummary({
  post,
  reaction,
  reactionCounts,
  onShowReactions,
  onComment,
}: {
  post: Post;
  reaction?: string;
  reactionCounts?: Record<string, number>;
  onShowReactions: (post: Post) => void;
  onComment: (post: Post) => void;
}) {
  const hasReactions = post.likes > 0;
  const rightParts = [
    post.comments > 0 ? `${formatCount(post.comments)} bình luận` : null,
    post.shares > 0 ? `${formatCount(post.shares)} chia sẻ` : null,
  ].filter(Boolean);

  if (!hasReactions && rightParts.length === 0) return null;

  const reactionIcons = REACTION_OPTIONS.map((item) => ({
    ...item,
    count: reactionCounts?.[item.value] ?? reactionCounts?.[item.value.toLowerCase()] ?? 0,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const fallbackIcons = reaction ? [reactionMeta(reaction)] : post.likes > 0 ? [reactionMeta('LIKE')] : [];
  const visibleIcons = reactionIcons.length ? reactionIcons : fallbackIcons;

  return (
    <View className="mx-4 mt-3 flex-row items-center justify-between border-b pb-3" style={{ borderColor: SOCIAL_COLORS.border }}>
      <Pressable className="min-h-7 flex-row items-center" onPress={() => onShowReactions(post)}>
        {hasReactions ? (
          <>
            <View className="mr-2 flex-row items-center">
              {visibleIcons.map((item, index) => (
                <View
                  key={item.value}
                  className="h-[22px] w-[22px] items-center justify-center rounded-full border border-white bg-white shadow-sm"
                  style={{ marginLeft: index === 0 ? 0 : -6, zIndex: 6 - index }}
                >
                  <Text className="text-[14px] leading-5">{item.emoji}</Text>
                </View>
              ))}
            </View>
            <Text className="text-[13px]" style={{ color: SOCIAL_COLORS.textMuted }}>{formatCount(post.likes)}</Text>
          </>
        ) : null}
      </Pressable>

      {rightParts.length > 0 ? (
        <Pressable onPress={() => onComment(post)}>
          <Text className="text-[13px]" style={{ color: SOCIAL_COLORS.textMuted }}>{rightParts.join(' · ')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PostCard({
  post,
  currentUserId,
  reaction,
  reactionCounts,
  showReactionPicker,
  onReact,
  onPickReaction,
  onComment,
  onShowReactions,
  onEdit,
  onDelete,
  onShare,
}: {
  post: Post;
  currentUserId?: string;
  reaction?: string;
  reactionCounts?: Record<string, number>;
  showReactionPicker?: boolean;
  onReact: (post: Post, reactionType: string) => void;
  onPickReaction: (post: Post) => void;
  onComment: (post: Post) => void;
  onShowReactions: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onShare: (post: Post) => void;
}) {
  const router = useRouter();
  const isMine = post.author.id === currentUserId;
  const meta = reactionMeta(reaction);
  const hasEngagement = post.likes > 0 || post.comments > 0 || post.shares > 0;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const visibilityIcon =
    String(post.visibility || '').toUpperCase() === 'PRIVATE'
      ? 'lock-closed'
      : String(post.visibility || '').toUpperCase() === 'FRIENDS'
        ? 'people'
        : String(post.visibility || '').toUpperCase() === 'CUSTOM'
          ? 'options'
          : 'earth';

  return (
    <View className="relative mb-2 border-y py-3" style={{ backgroundColor: SOCIAL_COLORS.card, borderColor: SOCIAL_COLORS.border }}>
      <View className="flex-row items-start px-4">
        <Pressable
          className="flex-1 flex-row items-start"
          onPress={() =>
            router.push({
              pathname: '/(main)/social/profile/[userId]',
              params: { userId: post.author.id },
            })
          }
        >
          <Avatar uri={post.author.avatar} name={post.author.name} color={post.author.color} />
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-bold" style={{ color: SOCIAL_COLORS.text }}>{post.author.name}</Text>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-xs" style={{ color: SOCIAL_COLORS.textMuted }}>{post.time}</Text>
              <Text className="mx-1 text-xs" style={{ color: SOCIAL_COLORS.textSoft }}>·</Text>
              <Ionicons name={visibilityIcon} size={12} color={SOCIAL_COLORS.textSoft} />
            </View>
          </View>
        </Pressable>
        {isMine && (
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: SOCIAL_COLORS.chip }}
            onPress={() => setActionSheetVisible(true)}
          >
            <Feather name="more-horizontal" size={19} color={SOCIAL_COLORS.primaryDark} />
          </TouchableOpacity>
        )}
      </View>

      {post.content.trim() ? (
        <Text className="mt-3 px-4 text-[15px] leading-6" style={{ color: SOCIAL_COLORS.text }}>{post.content}</Text>
      ) : null}

      <PostMediaGrid media={post.media} onOpenMedia={setViewerIndex} />

      <PostEngagementSummary
        post={post}
        reaction={reaction}
        reactionCounts={reactionCounts}
        onShowReactions={onShowReactions}
        onComment={onComment}
      />

      {showReactionPicker ? (
        <ReactionPickerBubble post={post} selectedReaction={reaction} onSelect={onReact} />
      ) : null}

      <View
        className={`${hasEngagement ? 'mt-1' : 'mt-3 border-t'} flex-row items-center px-1 pt-1`}
        style={!hasEngagement ? { borderColor: SOCIAL_COLORS.border } : undefined}
      >
        <Pressable
          className="h-10 flex-1 flex-row items-center justify-center"
          style={{ backgroundColor: 'transparent' }}
          onPress={() => onReact(post, reaction || 'LIKE')}
          onLongPress={() => onPickReaction(post)}
        >
          <Text className="text-[18px]">{reaction ? meta.emoji : '♡'}</Text>
          <Text
            className="ml-2 text-sm font-semibold"
            style={{ color: reaction ? meta.color : SOCIAL_COLORS.textMuted }}
          >
            {reactionLabel(reaction)}
          </Text>
        </Pressable>
        <Pressable
          className="h-10 flex-1 flex-row items-center justify-center"
          style={{ backgroundColor: 'transparent' }}
          onPress={() => onComment(post)}
        >
          <Ionicons name="chatbubble-outline" size={18} color={SOCIAL_COLORS.primary} />
          <Text className="ml-2 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>Bình luận</Text>
        </Pressable>
        <Pressable
          className="h-10 flex-1 flex-row items-center justify-center"
          style={{ backgroundColor: 'transparent' }}
          onPress={() => onShare(post)}
        >
          <Ionicons name="share-social-outline" size={18} color={SOCIAL_COLORS.primary} />
          <Text className="ml-2 text-sm font-semibold" style={{ color: SOCIAL_COLORS.textMuted }}>Chia sẻ</Text>
        </Pressable>
      </View>

      <PostMediaViewer
        visible={viewerIndex !== null}
        media={post.media}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />

      <SocialConfirmModal
        visible={actionSheetVisible}
        title="Bài viết"
        message="Bạn muốn chỉnh sửa hay xóa bài viết này?"
        icon="more-horizontal"
        onClose={() => setActionSheetVisible(false)}
        actions={[
          { label: 'Chỉnh sửa', variant: 'primary', onPress: () => onEdit(post) },
          { label: 'Xóa bài viết', variant: 'danger', onPress: () => onDelete(post) },
          { label: 'Hủy', variant: 'secondary' },
        ]}
      />
    </View>
  );
}
