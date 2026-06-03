import {
  MediaApi,
  type Post,
  type PostMediaItem,
} from "@/services/api/media.api";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Avatar } from "./SocialAvatar";
import { PostMediaViewer } from "./PostMediaViewer";
import { SocialConfirmModal } from "./SocialConfirmModal";
import {
  formatCount,
  reactionLabel,
  reactionMeta,
  REACTION_OPTIONS,
  SOCIAL_COLORS,
  SOCIAL_SHADOW,
} from "./socialTheme";
import TextTagRenderer from "../common/TextTagRenderer";

const isDeletedPost = (post: Post) =>
  String(post.status || "").toUpperCase() === "DELETED" ||
  String(post.visibility || "").toUpperCase() === "DELETED";

const isFlaggedMedia = (media?: PostMediaItem | null) =>
  String(media?.moderationStatus || "").toUpperCase() === "FLAGGED";

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
      style={{
        backgroundColor: SOCIAL_COLORS.card,
        borderColor: SOCIAL_COLORS.border,
        ...SOCIAL_SHADOW,
      }}
      pointerEvents="box-none">
      <View className="flex-row items-center justify-between">
        {REACTION_OPTIONS.map((reaction) => {
          const active =
            String(selectedReaction || "").toUpperCase() === reaction.value;
          return (
            <TouchableOpacity
              key={reaction.value}
              className="h-[58px] flex-1 items-center justify-center rounded-full"
              style={{
                backgroundColor: active ? SOCIAL_COLORS.chip : "transparent",
              }}
              activeOpacity={0.85}
              onPress={() => onSelect(post, reaction.value)}>
              <Text className="text-[30px]">{reaction.emoji}</Text>
              <Text
                className="mt-0.5 text-[10px] font-bold"
                style={{
                  color: active ? SOCIAL_COLORS.text : SOCIAL_COLORS.textMuted,
                }}>
                {reaction.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MediaTile({
  media,
  compact = false,
}: {
  media: PostMediaItem;
  compact?: boolean;
}) {
  const isVideo = media.type === "video";
  const imageUri = media.thumbnailUrl || (!isVideo ? media.url : undefined);
  const flagged = isFlaggedMedia(media);
  const [revealed, setRevealed] = useState(false);
  const hiddenByModeration = flagged && !revealed;

  return (
    <View
      className="overflow-hidden"
      style={{
        flex: 1,
        minHeight: compact ? 148 : 330,
        backgroundColor: SOCIAL_COLORS.primaryDark,
      }}>
      {imageUri ?
        <ExpoImage
          source={{ uri: imageUri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          contentPosition="center"
          blurRadius={hiddenByModeration ? 16 : 0}
        />
      : <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}>
          <Feather name="video" size={30} color="#fff" />
          <Text className="mt-2 text-xs font-semibold text-white">Video</Text>
        </View>
      }
      {isVideo && (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-black/45">
            <Feather name="play" size={22} color="#fff" />
          </View>
        </View>
      )}
      {hiddenByModeration ? (
        <View className="absolute inset-0 items-center justify-center bg-black/40 px-3">
          <View className="items-center rounded-2xl bg-black/60 px-3 py-2">
            <Text className="text-center text-[12px] font-bold text-white">
              {isVideo ? "Video nhạy cảm" : "Ảnh nhạy cảm"}
            </Text>
            <Pressable
              className="mt-2 rounded-full bg-white px-3 py-1.5"
              onPress={(event) => {
                event.stopPropagation?.();
                setRevealed(true);
              }}>
              <Text className="text-[12px] font-bold text-slate-900">
                {isVideo ? "Xem video" : "Xem ảnh"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
      <Pressable
        className="mt-3 overflow-hidden"
        style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}
        onPress={() => onOpenMedia(0)}>
        <MediaTile media={media[0]} />
      </Pressable>
    );
  }

  const visible = media;
  const isThree = media.length === 3;

  return (
    <View
      className="mt-3 flex-row flex-wrap overflow-hidden"
      style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}>
      {visible.map((item, index) => (
        <Pressable
          key={item.id || `${item.url}-${index}`}
          style={{
            width: isThree && index === 2 ? "100%" : "50%",
            aspectRatio: isThree && index === 2 ? 2 : 1,
            borderWidth: 0.5,
            borderColor: SOCIAL_COLORS.card,
          }}
          onPress={() => onOpenMedia(index)}>
          <MediaTile media={item} compact />
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
    count:
      reactionCounts?.[item.value] ??
      reactionCounts?.[item.value.toLowerCase()] ??
      0,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const fallbackIcons =
    reaction ? [reactionMeta(reaction)]
    : post.likes > 0 ? [reactionMeta("LIKE")]
    : [];
  const visibleIcons = reactionIcons.length ? reactionIcons : fallbackIcons;

  return (
    <View
      className="mx-4 mt-3 flex-row items-center justify-between border-b pb-3"
      style={{ borderColor: SOCIAL_COLORS.border }}>
      <Pressable
        className="min-h-7 flex-row items-center"
        onPress={() => onShowReactions(post)}>
        {hasReactions ?
          <>
            <View className="mr-2 flex-row items-center">
              {visibleIcons.map((item, index) => (
                <View
                  key={item.value}
                  className="h-[22px] w-[22px] items-center justify-center rounded-full border border-white bg-white shadow-sm"
                  style={{
                    marginLeft: index === 0 ? 0 : -6,
                    zIndex: 6 - index,
                  }}>
                  <Text className="text-[14px] leading-5">{item.emoji}</Text>
                </View>
              ))}
            </View>
            <Text
              className="text-[13px]"
              style={{ color: SOCIAL_COLORS.textMuted }}>
              {formatCount(post.likes)}
            </Text>
          </>
        : null}
      </Pressable>

      {rightParts.length > 0 ?
        <Pressable onPress={() => onComment(post)}>
          <Text
            className="text-[13px]"
            style={{ color: SOCIAL_COLORS.textMuted }}>
            {rightParts.join(" · ")}
          </Text>
        </Pressable>
      : null}
    </View>
  );
}

function SharedPostPreview({
  post,
  onPress,
}: {
  post: Post;
  onPress?: () => void;
}) {
  const router = useRouter();
  const firstMedia = post.media[0];

  return (
    <Pressable
      className="mx-4 mt-3 overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: SOCIAL_COLORS.chipLight,
        borderColor: SOCIAL_COLORS.border,
      }}
      onPress={
        onPress ||
        (() =>
          router.push({
            pathname: "/(main)/social/profile/[userId]",
            params: { userId: post.author.id },
          }))
      }>
      <View className="flex-row items-center px-3 py-3">
        <Avatar
          uri={post.author.avatar}
          name={post.author.name}
          color={post.author.color}
          size={34}
        />
        <View className="ml-2 flex-1">
          <Text
            className="text-[13px] font-black"
            style={{ color: SOCIAL_COLORS.text }}
            numberOfLines={1}>
            {post.author.name}
          </Text>
          <Text
            className="text-[11px]"
            style={{ color: SOCIAL_COLORS.textMuted }}>
            {post.time}
          </Text>
        </View>
      </View>
      {post.content.trim() ?
        <TextTagRenderer
          content={post.content}
          style={{
            color: SOCIAL_COLORS.text,
            paddingHorizontal: 12,
            paddingBottom: 12,
            fontSize: 13,
            lineHeight: 20,
          }}
          numberOfLines={3}
        />
      : null}
      {firstMedia ?
        <View
          className="h-40"
          style={{ backgroundColor: SOCIAL_COLORS.primaryDark }}>
          <MediaTile media={firstMedia} compact />
          {post.media.length > 1 ?
            <View className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1">
              <Text className="text-[11px] font-black text-white">
                +{post.media.length - 1}
              </Text>
            </View>
          : null}
        </View>
      : null}
    </Pressable>
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
  onSaveChange,
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
  onSaveChange?: (postId: string, isSaved: boolean) => void;
}) {
  const router = useRouter();
  const isMine = post.author.id === currentUserId;
  const meta = reactionMeta(reaction);
  const normalizedReaction = String(reaction || "").toUpperCase();
  const showReactionEmoji = Boolean(reaction && normalizedReaction !== "LIKE");
  const hasEngagement = post.likes > 0 || post.comments > 0 || post.shares > 0;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const deleted = isDeletedPost(post);
  const visibilityIcon =
    String(post.visibility || "").toUpperCase() === "PRIVATE" ? "lock-closed"
    : String(post.visibility || "").toUpperCase() === "FRIENDS" ? "people"
    : String(post.visibility || "").toUpperCase() === "CUSTOM" ? "options"
    : "earth";

  useEffect(() => {
    let mounted = true;
    MediaApi.checkIsSaved(post.id).then((saved) => {
      if (mounted) setIsSaved(saved);
    });
    return () => {
      mounted = false;
    };
  }, [post.id]);

  const handleToggleSave = async () => {
    if (saveBusy) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    onSaveChange?.(post.id, nextSaved);
    setSaveBusy(true);
    const ok = await MediaApi.toggleSaveContent(post.id, nextSaved);
    setSaveBusy(false);
    if (!ok) {
      setIsSaved(!nextSaved);
      onSaveChange?.(post.id, !nextSaved);
      Alert.alert("Không lưu được", "Vui lòng thử lại sau.");
    }
  };

  const hasVisibleSharedPost = Boolean(
    post.sharedPost && !isDeletedPost(post.sharedPost),
  );
  const shouldShowSharedFallback = Boolean(
    post.sharedPostDeleted ||
    post.sharedPostRestricted ||
    post.sharedPostCollapsed ||
    (post.sharedPost && isDeletedPost(post.sharedPost)),
  );

  return (
    <Pressable
      onPress={() => onComment(post)}
      className="relative mb-3 overflow-visible border-b py-3"
      style={{
        backgroundColor: SOCIAL_COLORS.card,
        borderColor: SOCIAL_COLORS.border,
      }}>
      <View className="flex-row items-start px-4">
        <Pressable
          className="flex-1 flex-row items-start"
          onPress={() => {
            if (post.author.id === currentUserId) {
              router.push("/(main)/(tabs)/profile" as any);
            } else {
              router.push({
                pathname: "/(main)/social/profile/[userId]",
                params: { userId: post.author.id },
              });
            }
          }}>
          <Avatar
            uri={post.author.avatar}
            name={post.author.name}
            color={post.author.color}
          />
          <View className="ml-3 flex-1">
            <Text
              className="text-[15px] font-bold"
              style={{ color: SOCIAL_COLORS.text }}>
              {post.author.name}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <Text
                className="text-xs"
                style={{ color: SOCIAL_COLORS.textMuted }}>
                {post.time}
              </Text>
              <Text
                className="mx-1 text-xs"
                style={{ color: SOCIAL_COLORS.textSoft }}>
                ·
              </Text>
              <Ionicons
                name={visibilityIcon}
                size={12}
                color={SOCIAL_COLORS.textSoft}
              />
            </View>
          </View>
        </Pressable>
        {isMine && (
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: SOCIAL_COLORS.chip }}
            onPress={() => setActionSheetVisible(true)}>
            <Feather
              name="more-horizontal"
              size={19}
              color={SOCIAL_COLORS.primaryDark}
            />
          </TouchableOpacity>
        )}
      </View>

      {deleted ?
        <View
          className="mx-4 mt-3 rounded-2xl border border-dashed px-4 py-5"
          style={{
            borderColor: SOCIAL_COLORS.border,
            backgroundColor: SOCIAL_COLORS.page,
          }}>
          <Text
            className="text-center text-[15px] font-black"
            style={{ color: SOCIAL_COLORS.text }}>
            Bài viết đã bị xóa
          </Text>
          <Text
            className="mt-1 text-center text-[12px] font-medium leading-5"
            style={{ color: SOCIAL_COLORS.textMuted }}>
            Nội dung này không còn khả dụng, nhưng vẫn được giữ lại trong lịch
            sử và danh sách đã lưu.
          </Text>
        </View>
      : post.content.trim() ?
        <TextTagRenderer
          content={post.content}
          style={{
            color: SOCIAL_COLORS.text,
            marginTop: 12,
            paddingHorizontal: 16,
            fontSize: 15,
            lineHeight: 24,
          }}
        />
      : null}

      {!deleted && (
        <PostMediaGrid media={post.media} onOpenMedia={setViewerIndex} />
      )}

      {!deleted && hasVisibleSharedPost && post.sharedPost ?
        <SharedPostPreview
          post={post.sharedPost}
          onPress={() => onComment(post.sharedPost!)}
        />
      : null}

      {!deleted && shouldShowSharedFallback ?
        <View
          className="mx-4 mt-3 overflow-hidden rounded-2xl border px-4 py-5"
          style={{
            backgroundColor: SOCIAL_COLORS.chipLight,
            borderColor: SOCIAL_COLORS.border,
          }}>
          <Text
            className="text-[13px] font-bold"
            style={{ color: SOCIAL_COLORS.text }}>
            {post.sharedPostCollapsed ?
              "Nội dung đã được thu gọn"
            : "Nội dung không khả dụng"}
          </Text>
          <Text
            className="mt-1 text-[11px]"
            style={{ color: SOCIAL_COLORS.textMuted }}>
            {post.sharedPostCollapsed ?
              "Chuỗi chia sẻ quá dài. Mở bài gốc để xem đầy đủ."
            : "Bài viết đã bị xóa hoặc bạn không có quyền xem."}
          </Text>
        </View>
      : null}

      {!deleted && (
        <PostEngagementSummary
          post={post}
          reaction={reaction}
          reactionCounts={reactionCounts}
          onShowReactions={onShowReactions}
          onComment={onComment}
        />
      )}

      {!deleted && showReactionPicker ?
        <ReactionPickerBubble
          post={post}
          selectedReaction={reaction}
          onSelect={onReact}
        />
      : null}

      {!deleted && (
        <View
          className={`${hasEngagement ? "mt-1" : "mt-3 border-t"} flex-row items-center px-1 pt-1`}
          style={
            !hasEngagement ? { borderColor: SOCIAL_COLORS.border } : undefined
          }>
          <Pressable
            className="h-10 flex-1 flex-row items-center justify-center"
            style={{ backgroundColor: "transparent" }}
            onPress={() => onReact(post, reaction || "LIKE")}
            onLongPress={() => onPickReaction(post)}>
            {showReactionEmoji ?
              <Text className="text-[18px]">{meta.emoji}</Text>
            : <Ionicons
                name={reaction ? "thumbs-up" : "thumbs-up-outline"}
                size={18}
                color={reaction ? meta.color : SOCIAL_COLORS.primary}
              />
            }
            <Text
              className="ml-2 text-sm font-semibold"
              style={{ color: reaction ? meta.color : SOCIAL_COLORS.textMuted }}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {reactionLabel(reaction)}
            </Text>
          </Pressable>
          <Pressable
            className="h-10 flex-1 flex-row items-center justify-center"
            style={{ backgroundColor: "transparent" }}
            onPress={() => onComment(post)}>
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={SOCIAL_COLORS.primary}
            />
            <Text
              className="ml-2 text-sm font-semibold"
              style={{ color: SOCIAL_COLORS.textMuted }}
              numberOfLines={1}
              adjustsFontSizeToFit>
              Bình luận
            </Text>
          </Pressable>
          <Pressable
            className="h-10 flex-1 flex-row items-center justify-center"
            style={{ backgroundColor: "transparent" }}
            onPress={() => onShare(post)}>
            <Ionicons
              name="share-social-outline"
              size={18}
              color={SOCIAL_COLORS.primary}
            />
            <Text
              className="ml-2 text-sm font-semibold"
              style={{ color: SOCIAL_COLORS.textMuted }}
              numberOfLines={1}
              adjustsFontSizeToFit>
              Chia sẻ
            </Text>
          </Pressable>
          <Pressable
            className="h-10 flex-1 flex-row items-center justify-center"
            style={{ backgroundColor: "transparent" }}
            onPress={handleToggleSave}
            disabled={saveBusy}>
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={18}
              color={
                isSaved ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.primary
              }
            />
            <Text
              className="ml-2 text-sm font-semibold"
              style={{
                color:
                  isSaved ? SOCIAL_COLORS.primaryDark : SOCIAL_COLORS.textMuted,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {isSaved ? "Đã lưu" : "Lưu"}
            </Text>
          </Pressable>
        </View>
      )}

      {!deleted && (
        <PostMediaViewer
          visible={viewerIndex !== null}
          media={post.media}
          initialIndex={viewerIndex ?? 0}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {!deleted && (
        <SocialConfirmModal
          visible={actionSheetVisible}
          title="Bài viết"
          message="Bạn muốn chỉnh sửa hay xóa bài viết này?"
          icon="more-horizontal"
          onClose={() => setActionSheetVisible(false)}
          actions={[
            {
              label: "Chỉnh sửa",
              variant: "primary",
              onPress: () => onEdit(post),
            },
            {
              label: "Xóa bài viết",
              variant: "danger",
              onPress: () => onDelete(post),
            },
            { label: "Hủy", variant: "secondary" },
          ]}
        />
      )}
    </Pressable>
  );
}
