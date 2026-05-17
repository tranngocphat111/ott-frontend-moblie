import { THEME_COLORS } from '@/constants/theme';
import { useAuth } from '@/contexts/Authcontext';
import {
  MediaApi,
  type AccessControl,
  type ApiReaction,
  type Comment,
  type FriendOption,
  type MediaUploadAsset,
  type Post,
  type PostMediaItem,
  type StoryContentItem,
  type StorySuggestedUser,
  type StoryUserGroup,
  type Visibility,
} from '@/services/api/media.api';
import { mediaSocket, type PostActivityPayload } from '@/services/socket/mediaSocket';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGE_SIZE = 8;

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'PUBLIC', label: 'Công khai', icon: 'earth' },
  { value: 'FRIENDS', label: 'Bạn bè', icon: 'people' },
  { value: 'PRIVATE', label: 'Riêng tư', icon: 'lock-closed' },
  { value: 'CUSTOM', label: 'Tùy chỉnh', icon: 'options' },
];

const REACTION_OPTIONS = [
  { value: 'LIKE', label: 'Thích', emoji: '👍', color: '#2563eb' },
  { value: 'LOVE', label: 'Yêu thích', emoji: '❤️', color: '#e11d48' },
  { value: 'HAHA', label: 'Haha', emoji: '😆', color: '#ca8a04' },
  { value: 'WOW', label: 'Wow', emoji: '😮', color: '#d97706' },
  { value: 'SAD', label: 'Buồn', emoji: '😢', color: '#64748b' },
  { value: 'ANGRY', label: 'Giận', emoji: '😡', color: '#dc2626' },
];

const FEELING_OPTIONS = [
  { emoji: '😊', label: 'vui vẻ' },
  { emoji: '😍', label: 'yêu đời' },
  { emoji: '🥰', label: 'hạnh phúc' },
  { emoji: '😎', label: 'tự tin' },
  { emoji: '🤩', label: 'phấn khích' },
  { emoji: '😌', label: 'bình yên' },
  { emoji: '🥳', label: 'vui mừng' },
  { emoji: '😢', label: 'buồn' },
  { emoji: '😤', label: 'tức giận' },
  { emoji: '🤔', label: 'suy nghĩ' },
];

const STORY_BACKGROUNDS = ['#111827', '#2563eb', '#0f766e', '#be123c', '#c2410c', '#6d28d9'];

type DraftMediaItem = PostMediaItem & {
  draftId: string;
  file?: MediaUploadAsset;
  isExisting?: boolean;
};

type FeelingOption = (typeof FEELING_OPTIONS)[number];

const formatCount = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
};

const initialsFor = (name?: string | null) => {
  const clean = String(name || '').trim();
  if (!clean) return '?';
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const visibilityLabel = (visibility?: string) => {
  const normalized = String(visibility || '').toUpperCase();
  if (normalized === 'FRIENDS') return 'Bạn bè';
  if (normalized === 'PRIVATE') return 'Riêng tư';
  if (normalized === 'CUSTOM') return 'Tùy chỉnh';
  return 'Công khai';
};

const reactionLabel = (reaction?: string | null) =>
  REACTION_OPTIONS.find((item) => item.value === String(reaction || '').toUpperCase())?.label || 'Thích';

const reactionMeta = (reaction?: string | null) =>
  REACTION_OPTIONS.find((item) => item.value === String(reaction || '').toUpperCase()) || REACTION_OPTIONS[0];

const isVideoMedia = (media: PostMediaItem | MediaUploadAsset) => {
  const marker = `${'mediaType' in media ? media.mediaType || '' : ''} ${media.type || ''} ${
    'mimeType' in media ? media.mimeType || '' : ''
  } ${'uri' in media ? media.uri : 'url' in media ? media.url : ''}`.toLowerCase();
  return marker.includes('video') || /\.(mp4|mov|m4v|webm|avi)$/i.test(marker);
};

const mapPickerAsset = (asset: ImagePicker.ImagePickerAsset): MediaUploadAsset => ({
  uri: asset.uri,
  fileName: asset.fileName,
  name: asset.fileName,
  mimeType: asset.mimeType,
  type: asset.mimeType,
  mediaType: asset.type === 'video' ? 'video' : 'image',
});

const draftFromPickerAsset = (asset: ImagePicker.ImagePickerAsset): DraftMediaItem => {
  const file = mapPickerAsset(asset);
  const type = isVideoMedia(file) ? 'video' : 'image';
  return {
    draftId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    url: asset.uri,
    caption: '',
    file,
  };
};

const draftFromPostMedia = (item: PostMediaItem, index: number): DraftMediaItem => ({
  ...item,
  draftId: item.id || `existing-${index}-${item.url}`,
  isExisting: true,
});

const buildCaptionWithFeeling = (caption: string, feeling: FeelingOption | null) => {
  const content = caption.trim();
  if (!feeling) return content;
  return `${content}${content ? ' ' : ''}- đang cảm thấy ${feeling.emoji} ${feeling.label}`;
};

const useFullScreenModalPadding = () => {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 64 : 24),
    paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 0),
  };
};

function Avatar({
  uri,
  name,
  size = 44,
  color = THEME_COLORS.primary[500],
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
  color?: string;
}) {
  return (
    <View
      className="overflow-hidden rounded-full items-center justify-center"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      {uri ? (
        <ExpoImage source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text className="text-white font-bold" style={{ fontSize: Math.max(13, Math.round(size * 0.36)) }}>
          {initialsFor(name)}
        </Text>
      )}
    </View>
  );
}

function VisibilityPills({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (value: Visibility) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {VISIBILITY_OPTIONS.map((item) => {
        const active = value === item.value;
        return (
          <TouchableOpacity
            key={item.value}
            className={`h-9 flex-row items-center rounded-full border px-3 ${
              active ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-slate-50'
            }`}
            activeOpacity={0.82}
            onPress={() => onChange(item.value)}
          >
            <Ionicons name={item.icon} size={14} color={active ? '#fff' : THEME_COLORS.neutral.slate500} />
            <Text className={`ml-1.5 text-xs font-bold ${active ? 'text-white' : 'text-slate-600'}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function FriendSelector({
  visible,
  friends,
  loading,
  selectedIds,
  ruleType,
  search,
  onRuleTypeChange,
  onSearchChange,
  onToggleFriend,
}: {
  visible: boolean;
  friends: FriendOption[];
  loading: boolean;
  selectedIds: string[];
  ruleType: AccessControl['ruleType'];
  search: string;
  onRuleTypeChange: (value: AccessControl['ruleType']) => void;
  onSearchChange: (value: string) => void;
  onToggleFriend: (friendId: string) => void;
}) {
  if (!visible) return null;

  const filtered = search.trim()
    ? friends.filter((friend) => friend.name.toLowerCase().includes(search.trim().toLowerCase()))
    : friends;

  return (
    <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <View className="flex-row rounded-full bg-white p-1">
        {(['INCLUDE', 'EXCLUDE'] as const).map((type) => {
          const active = ruleType === type;
          return (
            <TouchableOpacity
              key={type}
              className={`h-9 flex-1 items-center justify-center rounded-full ${active ? 'bg-slate-900' : 'bg-transparent'}`}
              onPress={() => onRuleTypeChange(type)}
            >
              <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600'}`}>
                {type === 'INCLUDE' ? 'Chỉ những người này' : 'Trừ những người này'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder="Tìm bạn bè"
        placeholderTextColor="#94a3b8"
        className="mt-3 rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900"
      />

      {loading ? (
        <View className="items-center py-5">
          <ActivityIndicator color={THEME_COLORS.primary[600]} />
        </View>
      ) : (
        <View className="mt-3 max-h-48">
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {filtered.map((friend) => {
              const selected = selectedIds.includes(friend.id);
              return (
                <TouchableOpacity
                  key={friend.id}
                  className="mb-2 flex-row items-center rounded-xl bg-white px-3 py-2.5"
                  activeOpacity={0.82}
                  onPress={() => onToggleFriend(friend.id)}
                >
                  <Avatar uri={friend.avatarUrl} name={friend.name} size={34} />
                  <Text className="ml-3 flex-1 text-sm font-semibold text-slate-800" numberOfLines={1}>
                    {friend.name}
                  </Text>
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full border ${
                      selected ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {selected ? <Feather name="check" size={14} color="#fff" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {!filtered.length && (
              <Text className="py-4 text-center text-sm font-semibold text-slate-500">Không tìm thấy bạn bè</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

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
      className="absolute bottom-[50px] left-3 right-3 z-20 rounded-full border border-slate-100 bg-white px-2 py-1.5 shadow-lg"
      pointerEvents="box-none"
    >
      <View className="flex-row items-center justify-between">
        {REACTION_OPTIONS.map((reaction) => {
          const active = String(selectedReaction || '').toUpperCase() === reaction.value;
          return (
            <TouchableOpacity
              key={reaction.value}
              className={`h-[58px] flex-1 items-center justify-center rounded-full ${active ? 'bg-slate-100' : ''}`}
              activeOpacity={0.85}
              onPress={() => onSelect(post, reaction.value)}
            >
              <Text className="text-[30px]">{reaction.emoji}</Text>
              <Text className={`mt-0.5 text-[10px] font-bold ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                {reaction.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ReactionsListModal({
  visible,
  post,
  onClose,
}: {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
}) {
  const [reactions, setReactions] = useState<ApiReaction[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const modalPadding = useFullScreenModalPadding();

  useEffect(() => {
    if (!visible || !post) return;
    setActiveTab('ALL');
    setLoading(true);
    MediaApi.fetchPostReactionDetails(post.id)
      .then(setReactions)
      .finally(() => setLoading(false));
  }, [post, visible]);

  const counts = reactions.reduce<Record<string, number>>((acc, reaction) => {
    const key = String(reaction.reactionType || 'LIKE').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filtered =
    activeTab === 'ALL'
      ? reactions
      : reactions.filter((reaction) => String(reaction.reactionType || '').toUpperCase() === activeTab);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={modalPadding}>
        <View className="h-14 flex-row items-center justify-between border-b border-slate-100 px-4">
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-slate-50" onPress={onClose}>
            <Feather name="x" size={21} color={THEME_COLORS.neutral.slate600} />
          </TouchableOpacity>
          <Text className="text-[17px] font-black text-slate-950">Cảm xúc</Text>
          <View className="h-10 w-10" />
        </View>

        <View className="border-b border-slate-100 px-4 py-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              className={`h-9 flex-row items-center rounded-full px-4 ${
                activeTab === 'ALL' ? 'bg-slate-900' : 'bg-slate-100'
              }`}
              onPress={() => setActiveTab('ALL')}
            >
              <Text className={`text-sm font-bold ${activeTab === 'ALL' ? 'text-white' : 'text-slate-700'}`}>
                Tất cả {reactions.length}
              </Text>
            </TouchableOpacity>
            {REACTION_OPTIONS.filter((item) => counts[item.value] > 0).map((item) => {
              const active = activeTab === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  className={`h-9 flex-row items-center rounded-full px-3 ${active ? 'bg-slate-900' : 'bg-slate-100'}`}
                  onPress={() => setActiveTab(item.value)}
                >
                  <Text className="text-base">{item.emoji}</Text>
                  <Text className={`ml-1 text-sm font-bold ${active ? 'text-white' : 'text-slate-700'}`}>
                    {counts[item.value]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={THEME_COLORS.primary[600]} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, index) => item.id || `${item.accountId}-${index}`}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View className="items-center py-16">
                <Text className="text-sm font-semibold text-slate-500">Chưa có cảm xúc nào</Text>
              </View>
            }
            renderItem={({ item }) => {
              const meta = reactionMeta(item.reactionType);
              const name = item.accountDisplayName || item.accountUsername || 'Người dùng';
              return (
                <View className="mb-3 flex-row items-center rounded-2xl bg-slate-50 px-3 py-3">
                  <View>
                    <Avatar uri={item.accountAvatarUrl} name={name} size={42} />
                    <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-white">
                      <Text className="text-[15px]">{meta.emoji}</Text>
                    </View>
                  </View>
                  <Text className="ml-3 flex-1 text-sm font-bold text-slate-900" numberOfLines={1}>
                    {name}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500">{meta.label}</Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

function MediaTile({ media, compact = false }: { media: PostMediaItem; compact?: boolean }) {
  const isVideo = media.type === 'video';
  const imageUri = media.thumbnailUrl || (!isVideo ? media.url : undefined);

  return (
    <View className="overflow-hidden bg-slate-900" style={{ flex: 1, minHeight: compact ? 138 : 260 }}>
      {imageUri ? (
        <ExpoImage source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center bg-slate-900">
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

function PostMediaGrid({ media }: { media: PostMediaItem[] }) {
  if (!media.length) return null;

  if (media.length === 1) {
    return (
      <View className="mt-3 overflow-hidden rounded-xl border border-slate-100">
        <MediaTile media={media[0]} />
      </View>
    );
  }

  const visible = media.slice(0, 4);

  return (
    <View className="mt-3 flex-row flex-wrap overflow-hidden rounded-xl border border-slate-100 bg-white">
      {visible.map((item, index) => (
        <View
          key={item.id || `${item.url}-${index}`}
          className="border-white"
          style={{ width: '50%', aspectRatio: 1, borderWidth: 1 }}
        >
          <MediaTile media={item} compact />
          {index === 3 && media.length > 4 && (
            <View className="absolute inset-0 items-center justify-center bg-black/45">
              <Text className="text-2xl font-bold text-white">+{media.length - 4}</Text>
            </View>
          )}
        </View>
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
    <View className="mt-3 flex-row items-center justify-between border-b border-slate-100 pb-3">
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
            <Text className="text-[13px] text-slate-500">{formatCount(post.likes)}</Text>
          </>
        ) : null}
      </Pressable>

      {rightParts.length > 0 ? (
        <Pressable onPress={() => onComment(post)}>
          <Text className="text-[13px] text-slate-500">{rightParts.join(' · ')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PostCard({
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
  const isMine = post.author.id === currentUserId;
  const meta = reactionMeta(reaction);
  const hasEngagement = post.likes > 0 || post.comments > 0 || post.shares > 0;

  return (
    <View className="relative mb-2 border-b border-slate-200 bg-white px-4 py-3">
      <View className="flex-row items-start">
        <Avatar uri={post.author.avatar} name={post.author.name} color={post.author.color} />
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-bold text-slate-950">{post.author.name}</Text>
          <View className="mt-0.5 flex-row items-center">
            <Text className="text-xs text-slate-500">{post.time}</Text>
            <Text className="mx-1 text-xs text-slate-400">·</Text>
            <Text className="text-xs text-slate-500">{visibilityLabel(post.visibility)}</Text>
          </View>
        </View>
        {isMine && (
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-50"
            onPress={() => {
              Alert.alert('Bài viết', undefined, [
                { text: 'Chỉnh sửa', onPress: () => onEdit(post) },
                { text: 'Xóa', style: 'destructive', onPress: () => onDelete(post) },
                { text: 'Hủy', style: 'cancel' },
              ]);
            }}
          >
            <Feather name="more-horizontal" size={19} color={THEME_COLORS.neutral.slate600} />
          </TouchableOpacity>
        )}
      </View>

      {post.content.trim() ? (
        <Text className="mt-3 text-[15px] leading-6 text-slate-800">{post.content}</Text>
      ) : null}

      <PostMediaGrid media={post.media} />

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

      <View className={`${hasEngagement ? 'mt-1' : 'mt-3 border-t border-slate-100'} flex-row items-center`}>
        <Pressable
          className="h-11 flex-1 flex-row items-center justify-center"
          onPress={() => onReact(post, reaction || 'LIKE')}
          onLongPress={() => onPickReaction(post)}
        >
          <Text className="text-[18px]">{reaction ? meta.emoji : '♡'}</Text>
          <Text
            className={`ml-2 text-sm font-semibold ${reaction ? '' : 'text-slate-600'}`}
            style={reaction ? { color: meta.color } : undefined}
          >
            {reactionLabel(reaction)}
          </Text>
        </Pressable>
        <Pressable className="h-11 flex-1 flex-row items-center justify-center" onPress={() => onComment(post)}>
          <Ionicons name="chatbubble-outline" size={18} color={THEME_COLORS.neutral.slate500} />
          <Text className="ml-2 text-sm font-semibold text-slate-600">Bình luận</Text>
        </Pressable>
        <Pressable className="h-11 flex-1 flex-row items-center justify-center" onPress={() => onShare(post)}>
          <Ionicons name="share-social-outline" size={18} color={THEME_COLORS.neutral.slate500} />
          <Text className="ml-2 text-sm font-semibold text-slate-600">Chia sẻ</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StoryRail({
  storyGroups,
  suggestedUsers,
  currentUserName,
  currentUserAvatar,
  onOpenGroup,
  onCreateStory,
  onAddFriend,
}: {
  storyGroups: StoryUserGroup[];
  suggestedUsers: StorySuggestedUser[];
  currentUserName?: string;
  currentUserAvatar?: string;
  onOpenGroup: (group: StoryUserGroup) => void;
  onCreateStory: () => void;
  onAddFriend: (user: StorySuggestedUser) => void;
}) {
  return (
    <View className="border-y border-slate-100 bg-white py-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        <TouchableOpacity
          className="h-44 overflow-hidden rounded-xl border border-slate-200 bg-white"
          style={{ width: 104 }}
          activeOpacity={0.86}
          onPress={onCreateStory}
        >
          <View className="h-[126px] bg-slate-100">
            {currentUserAvatar ? (
              <ExpoImage source={{ uri: currentUserAvatar }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center bg-slate-100">
                <Avatar uri={currentUserAvatar} name={currentUserName} size={46} />
              </View>
            )}
            <View className="absolute inset-0 bg-black/5" />
          </View>
          <View className="h-[50px] items-center justify-end bg-white px-2 pb-2.5">
            <Text className="text-center text-[12px] font-bold text-slate-900" numberOfLines={2}>
              Tạo tin
            </Text>
          </View>
          <View className="absolute left-0 right-0 top-[112px] items-center">
            <View className="h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-[#1877f2]">
              <Feather name="plus" size={17} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>

        {storyGroups.map((group) => {
          const firstStory = group.stories[0];
          const item = firstStory?.items?.[0];
          const preview =
            item?.type === 'IMAGE'
              ? item.url
              : firstStory?.imageUrl || (item?.type === 'VIDEO' ? firstStory.avatarUrl : undefined);
          const bg = item?.type === 'TEXT' ? item.textBackgroundColor || firstStory?.textBackgroundColor : '#111827';

          return (
            <TouchableOpacity
              key={group.userId}
              className="h-44 overflow-hidden rounded-xl bg-slate-900"
              style={{ width: 104 }}
              activeOpacity={0.86}
              onPress={() => onOpenGroup(group)}
            >
              {preview ? (
                <ExpoImage source={{ uri: preview }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center px-2" style={{ backgroundColor: bg || '#111827' }}>
                  {item?.type === 'TEXT' ? (
                    <Text className="text-center text-[16px] font-black leading-5 text-white" numberOfLines={4}>
                      {item.textContent || firstStory?.textContent || 'Tin'}
                    </Text>
                  ) : null}
                </View>
              )}
              <View className="absolute inset-0 bg-black/25" />
              <View className="absolute left-2 top-2 rounded-full border-[3px] border-[#1877f2]">
                <Avatar uri={group.avatarUrl} name={group.name} size={34} />
              </View>
              <Text className="absolute bottom-2.5 left-2 right-2 text-[12px] font-bold leading-4 text-white" numberOfLines={2}>
                {group.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {suggestedUsers.map((user) => (
          <View
            key={user.id}
            className="h-44 rounded-xl border border-slate-200 bg-white px-2 pb-2 pt-3"
            style={{ width: 112 }}
          >
            <View className="items-center">
              <View className="h-[68px] w-[68px] items-center justify-center rounded-full bg-slate-100 p-1">
                <Avatar uri={user.avatarUrl} name={user.name} size={60} color="#94a3b8" />
              </View>
            </View>
            <View className="mt-2 flex-1 justify-between">
              <View>
                <Text
                  className="text-center text-[12px] font-black leading-4 text-slate-900"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {user.name}
                </Text>
                <Text className="mt-0.5 text-center text-[10px] font-semibold text-slate-400" numberOfLines={1}>
                  Gợi ý cho bạn
                </Text>
              </View>
              <TouchableOpacity
                className="h-8 flex-row items-center justify-center rounded-full bg-[#1877f2]"
                activeOpacity={0.85}
                onPress={() => onAddFriend(user)}
              >
                <Feather name="user-plus" size={13} color="#fff" />
                <Text className="ml-1 text-[11px] font-black text-white">Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function CreatePostEntry({
  avatarUrl,
  name,
  onPress,
}: {
  avatarUrl?: string;
  name?: string;
  onPress: () => void;
}) {
  return (
    <View className="mb-2 mt-3 border-y border-slate-100 bg-white p-4">
      <TouchableOpacity className="flex-row items-center" activeOpacity={0.8} onPress={onPress}>
        <Avatar uri={avatarUrl} name={name} size={42} />
        <View className="ml-3 flex-1 rounded-full bg-slate-100 px-4 py-3">
          <Text className="text-[14px] text-slate-500">Bạn đang nghĩ gì?</Text>
        </View>
      </TouchableOpacity>
      <View className="mt-3 flex-row border-t border-slate-100 pt-3">
        <TouchableOpacity className="flex-1 flex-row items-center justify-center" onPress={onPress}>
          <Feather name="image" size={18} color="#059669" />
          <Text className="ml-2 text-sm font-semibold text-slate-700">Ảnh/video</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center" onPress={onPress}>
          <Feather name="edit-3" size={17} color="#2563eb" />
          <Text className="ml-2 text-sm font-semibold text-slate-700">Bài viết</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DiscoverHeader({
  userName,
  avatarUrl,
  storyGroups,
  suggestedUsers,
  onCreatePost,
  onCreateStory,
  onOpenStory,
  onAddFriend,
}: {
  userName?: string;
  avatarUrl?: string;
  storyGroups: StoryUserGroup[];
  suggestedUsers: StorySuggestedUser[];
  onCreatePost: () => void;
  onCreateStory: () => void;
  onOpenStory: (group: StoryUserGroup) => void;
  onAddFriend: (user: StorySuggestedUser) => void;
}) {
  return (
    <View>
      <View className="bg-surface-sunken px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[25px] font-black text-slate-950">Khám phá</Text>
            <Text className="mt-0.5 text-sm text-slate-500">Bảng tin, story và media</Text>
          </View>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-slate-900" onPress={onCreatePost}>
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <StoryRail
        storyGroups={storyGroups}
        suggestedUsers={suggestedUsers}
        currentUserName={userName}
        currentUserAvatar={avatarUrl}
        onOpenGroup={onOpenStory}
        onCreateStory={onCreateStory}
        onAddFriend={onAddFriend}
      />
      <CreatePostEntry avatarUrl={avatarUrl} name={userName} onPress={onCreatePost} />
    </View>
  );
}

function CreatePostModal({
  visible,
  userId,
  avatarUrl,
  userName,
  initialPost,
  onClose,
  onCreated,
  onUpdated,
}: {
  visible: boolean;
  userId?: string;
  avatarUrl?: string;
  userName?: string;
  initialPost?: Post | null;
  onClose: () => void;
  onCreated: (post: Post) => void;
  onUpdated?: (post: Post) => void;
}) {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [media, setMedia] = useState<DraftMediaItem[]>([]);
  const [feeling, setFeeling] = useState<FeelingOption | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [customRuleType, setCustomRuleType] = useState<AccessControl['ruleType']>('INCLUDE');
  const [submitting, setSubmitting] = useState(false);
  const modalPadding = useFullScreenModalPadding();
  const isEditing = Boolean(initialPost);

  useEffect(() => {
    if (!visible) return;
    setCaption(initialPost?.content || '');
    setVisibility((initialPost?.visibility?.toUpperCase() as Visibility) || 'PUBLIC');
    setMedia((initialPost?.media || []).map(draftFromPostMedia));
    setFeeling(null);
    setShowFeelings(false);
    setFriendSearch('');
    const initialAccess = initialPost?.accessControls || [];
    setSelectedFriendIds(initialAccess.map((item) => item.accountId));
    setCustomRuleType(initialAccess[0]?.ruleType || 'INCLUDE');
  }, [initialPost, visible]);

  useEffect(() => {
    if (!visible || visibility !== 'CUSTOM' || !userId || friends.length > 0) return;
    setFriendsLoading(true);
    MediaApi.fetchFriends(userId)
      .then(setFriends)
      .finally(() => setFriendsLoading(false));
  }, [friends.length, userId, visibility, visible]);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 20,
      quality: 0.86,
    });

    if (result.canceled) return;
    setMedia((prev) => [...prev, ...result.assets.map(draftFromPickerAsset)].slice(0, 20));
  };

  const removeMedia = (draftId: string) => {
    setMedia((prev) => prev.filter((item) => item.draftId !== draftId));
  };

  const updateMediaCaption = (draftId: string, nextCaption: string) => {
    setMedia((prev) => prev.map((item) => (item.draftId === draftId ? { ...item, caption: nextCaption } : item)));
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
  };

  const accessControls: AccessControl[] | undefined =
    visibility === 'CUSTOM'
      ? selectedFriendIds.map((accountId) => ({ accountId, ruleType: customRuleType }))
      : undefined;

  const canSubmit =
    Boolean(userId) &&
    (caption.trim().length > 0 || media.length > 0 || feeling !== null) &&
    (visibility !== 'CUSTOM' || selectedFriendIds.length > 0) &&
    !submitting;

  const submit = async () => {
    if (!userId || !canSubmit) return;
    setSubmitting(true);
    try {
      const finalCaption = buildCaptionWithFeeling(caption, feeling);
      const result = initialPost
        ? await MediaApi.updatePost(initialPost.id, userId, finalCaption, visibility, media, accessControls)
        : await MediaApi.createPost(
            userId,
            finalCaption,
            visibility,
            media.filter((item) => item.file).map((item) => item.file!),
            media.filter((item) => item.file).map((item) => item.caption ?? ''),
            accessControls,
          );
      if (!result.post) {
        Alert.alert(isEditing ? 'Không cập nhật được' : 'Không đăng được', result.error || 'Vui lòng thử lại sau.');
        return;
      }
      if (initialPost) onUpdated?.(result.post);
      else onCreated(result.post);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={modalPadding}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="h-14 flex-row items-center justify-between border-b border-slate-100 px-4">
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-slate-100" onPress={onClose}>
              <Feather name="x" size={21} color={THEME_COLORS.neutral.slate600} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-slate-950">{isEditing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}</Text>
            <TouchableOpacity
              className={`rounded-full px-4 py-2 ${canSubmit ? 'bg-slate-900' : 'bg-slate-200'}`}
              disabled={!canSubmit}
              onPress={submit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className={`font-bold ${canSubmit ? 'text-white' : 'text-slate-500'}`}>
                  {isEditing ? 'Lưu' : 'Đăng'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            <View className="px-4 py-4">
              <View className="flex-row items-center">
                <Avatar uri={avatarUrl} name={userName} />
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-bold text-slate-950">{userName || 'Người dùng'}</Text>
                  {feeling ? (
                    <TouchableOpacity className="mt-1 flex-row items-center" onPress={() => setFeeling(null)}>
                      <Text className="text-xs font-semibold text-slate-500">
                        đang cảm thấy {feeling.emoji} {feeling.label}
                      </Text>
                      <Feather name="x" size={12} color={THEME_COLORS.neutral.slate400} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View className="mt-4">
                <VisibilityPills value={visibility} onChange={setVisibility} />
                <FriendSelector
                  visible={visibility === 'CUSTOM'}
                  friends={friends}
                  loading={friendsLoading}
                  selectedIds={selectedFriendIds}
                  ruleType={customRuleType}
                  search={friendSearch}
                  onRuleTypeChange={setCustomRuleType}
                  onSearchChange={setFriendSearch}
                  onToggleFriend={toggleFriend}
                />
                {visibility === 'CUSTOM' && selectedFriendIds.length === 0 ? (
                  <Text className="mt-2 text-xs font-semibold text-red-500">Chọn ít nhất một người cho phạm vi tùy chỉnh.</Text>
                ) : null}
              </View>

              <TextInput
                value={caption}
                onChangeText={setCaption}
                multiline
                placeholder="Bạn đang nghĩ gì?"
                placeholderTextColor="#94a3b8"
                className="mt-5 min-h-[116px] text-[18px] leading-7 text-slate-900"
                textAlignVertical="top"
              />

              {showFeelings && (
                <View className="mb-2 flex-row flex-wrap gap-2">
                  {FEELING_OPTIONS.map((item) => {
                    const active = feeling?.label === item.label;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        className={`rounded-full border px-3 py-2 ${
                          active ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-slate-50'
                        }`}
                        onPress={() => {
                          setFeeling(active ? null : item);
                          setShowFeelings(false);
                        }}
                      >
                        <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-700'}`}>
                          {item.emoji} {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {media.length > 0 && (
                <View className="mt-3">
                  {media.map((item) => (
                    <View key={item.draftId} className="mb-3 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      <View className="h-52 bg-slate-900">
                        {item.type === 'video' ? (
                          <View className="h-full w-full items-center justify-center">
                            <Feather name="video" size={28} color="#fff" />
                            <Text className="mt-2 text-xs font-bold text-white/80">Video</Text>
                          </View>
                        ) : (
                          <ExpoImage source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        )}
                        <TouchableOpacity
                          className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/55"
                          onPress={() => removeMedia(item.draftId)}
                        >
                          <Feather name="x" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        value={item.caption || ''}
                        onChangeText={(value) => updateMediaCaption(item.draftId, value)}
                        placeholder="Thêm chú thích cho media"
                        placeholderTextColor="#94a3b8"
                        className="px-3 py-3 text-sm text-slate-900"
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View className="border-t border-slate-100 px-4 py-3">
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-emerald-50"
                onPress={pickMedia}
              >
                <Feather name="image" size={19} color="#059669" />
                <Text className="ml-2 font-bold text-emerald-700">Ảnh/video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="h-12 flex-1 flex-row items-center justify-center rounded-2xl bg-amber-50"
                onPress={() => setShowFeelings((value) => !value)}
              >
                <Text className="text-[18px]">😊</Text>
                <Text className="ml-2 font-bold text-amber-700">Cảm xúc</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function CommentsModal({
  visible,
  post,
  currentUserId,
  onClose,
  onCountChange,
}: {
  visible: boolean;
  post: Post | null;
  currentUserId?: string;
  onClose: () => void;
  onCountChange: (postId: string, delta: number) => void;
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
    Alert.alert('Xóa bình luận', 'Bạn có chắc chắn muốn xóa bình luận này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          const ok = await MediaApi.deleteComment(post.id, comment.id);
          if (!ok) return;
          setComments((prev) => prev.filter((item) => item.id !== comment.id));
          setRepliesByParent((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((parentId) => {
              next[parentId] = next[parentId].filter((item) => item.id !== comment.id);
            });
            return next;
          });
          onCountChange(post.id, -1);
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={modalPadding}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="h-14 flex-row items-center justify-between border-b border-slate-100 px-4">
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-slate-100" onPress={onClose}>
              <Feather name="x" size={21} color={THEME_COLORS.neutral.slate600} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-slate-950">Bình luận</Text>
            <View className="h-10 w-10" />
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={THEME_COLORS.primary[600]} />
            </View>
          ) : comments.length === 0 ? (
            <View className="flex-1 items-center justify-center pb-20">
              <Feather name="message-circle" size={34} color={THEME_COLORS.neutral.slate400} />
              <Text className="mt-3 text-sm font-semibold text-slate-500">Chưa có bình luận</Text>
            </View>
          ) : (
            <FlatList
              className="flex-1"
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                loadingMore ? (
                  <View className="py-3">
                    <ActivityIndicator color={THEME_COLORS.primary[600]} />
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const replies = repliesByParent[item.id] || [];
                return (
                  <View className="mb-4">
                    <Pressable className="flex-row" onLongPress={() => deleteComment(item)}>
                      <Avatar uri={item.authorAvatar} name={item.authorName} size={36} />
                      <View className="ml-3 flex-1">
                        <View className="rounded-2xl bg-slate-100 px-3 py-2">
                          <Text className="text-sm font-bold text-slate-900">{item.authorName}</Text>
                          <Text className="mt-1 text-[14px] leading-5 text-slate-800">{item.text}</Text>
                        </View>
                        <View className="ml-2 mt-1 flex-row items-center gap-4">
                          <Text className="text-xs text-slate-500">{item.time}</Text>
                          <TouchableOpacity onPress={() => setReplyingTo(item)}>
                            <Text className="text-xs font-bold text-slate-600">Trả lời</Text>
                          </TouchableOpacity>
                          {item.totalReplies > 0 ? (
                            <TouchableOpacity onPress={() => loadReplies(item)}>
                              <Text className="text-xs font-bold text-slate-600">
                                {replies.length ? 'Ẩn/hiện phản hồi' : `Xem ${item.totalReplies} phản hồi`}
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    </Pressable>

                    {repliesLoading[item.id] ? (
                      <View className="ml-12 mt-2">
                        <ActivityIndicator color={THEME_COLORS.primary[600]} size="small" />
                      </View>
                    ) : null}

                    {replies.map((reply) => (
                      <Pressable key={reply.id} className="ml-12 mt-3 flex-row" onLongPress={() => deleteComment(reply)}>
                        <Avatar uri={reply.authorAvatar} name={reply.authorName} size={30} />
                        <View className="ml-2 flex-1">
                          <View className="rounded-2xl bg-slate-50 px-3 py-2">
                            <Text className="text-xs font-bold text-slate-900">{reply.authorName}</Text>
                            <Text className="mt-1 text-[13px] leading-5 text-slate-800">{reply.text}</Text>
                          </View>
                          <Text className="ml-2 mt-1 text-xs text-slate-500">{reply.time}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                );
              }}
            />
          )}

          <View className="border-t border-slate-100 px-4 py-3">
            {replyingTo ? (
              <View className="mb-2 flex-row items-center rounded-xl bg-slate-50 px-3 py-2">
                <Text className="flex-1 text-xs font-semibold text-slate-500" numberOfLines={1}>
                  Đang trả lời {replyingTo.authorName}
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Feather name="x" size={16} color={THEME_COLORS.neutral.slate500} />
                </TouchableOpacity>
              </View>
            ) : null}
            <View className="flex-row items-end rounded-2xl bg-slate-100 px-3 py-2">
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                placeholder="Viết bình luận..."
                placeholderTextColor="#94a3b8"
                className="max-h-28 flex-1 py-1 text-[15px] text-slate-900"
              />
              <TouchableOpacity
                className={`ml-2 h-9 w-9 items-center justify-center rounded-full ${text.trim() ? 'bg-brand-600' : 'bg-slate-300'}`}
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
  );
}

function StoryViewerModal({
  group,
  currentUserId,
  onClose,
}: {
  group: StoryUserGroup | null;
  currentUserId?: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const stories = group?.stories || [];
  const story = stories[index];
  const item: StoryContentItem | undefined = story?.items?.[0];
  const storyKind = item?.type || story?.contentType || 'UNKNOWN';
  const imageUrl = item?.type === 'IMAGE' ? item.url : story?.imageUrl;
  const videoUrl = item?.type === 'VIDEO' ? item.url : story?.videoUrl;
  const textContent = item?.type === 'TEXT' ? item.textContent : story?.textContent;
  const textBackground = item?.type === 'TEXT' ? item.textBackgroundColor : story?.textBackgroundColor;

  useEffect(() => {
    setIndex(0);
  }, [group?.userId]);

  useEffect(() => {
    if (story?.id && currentUserId) void MediaApi.viewStory(story.id, currentUserId);
  }, [currentUserId, story?.id]);

  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }
    onClose();
  };

  const goPrev = () => {
    if (index > 0) setIndex((prev) => prev - 1);
  };

  return (
    <Modal visible={!!group} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          <View className="absolute left-4 right-4 top-12 z-10 flex-row items-center">
            <Avatar uri={group?.avatarUrl} name={group?.name} size={38} />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-white">{group?.name}</Text>
              <Text className="text-xs text-white/70">
                {stories.length ? `${index + 1}/${stories.length}` : 'Tin'}
              </Text>
            </View>
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white/15" onPress={onClose}>
              <Feather name="x" size={21} color="#fff" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 items-center justify-center">
            {storyKind === 'IMAGE' && imageUrl ? (
              <ExpoImage source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
            ) : storyKind === 'VIDEO' && videoUrl ? (
              <View className="h-full w-full items-center justify-center bg-slate-950">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-white/15">
                  <Feather name="play" size={34} color="#fff" />
                </View>
                <Text className="mt-4 px-8 text-center text-sm font-semibold text-white/80">Video story</Text>
              </View>
            ) : (
              <View
                className="h-full w-full items-center justify-center px-8"
                style={{ backgroundColor: textBackground || '#111827' }}
              >
                <Text className="text-center text-[28px] font-black leading-10 text-white">
                  {textContent || 'Tin đang được tải'}
                </Text>
              </View>
            )}
          </View>

          <Pressable className="absolute bottom-0 left-0 top-24 w-1/2" onPress={goPrev} />
          <Pressable className="absolute bottom-0 right-0 top-24 w-1/2" onPress={goNext} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function CreateStoryModal({
  visible,
  userId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  userId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [text, setText] = useState('');
  const [background, setBackground] = useState(STORY_BACKGROUNDS[0]);
  const [media, setMedia] = useState<DraftMediaItem | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('FRIENDS');
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [customRuleType, setCustomRuleType] = useState<AccessControl['ruleType']>('INCLUDE');
  const [submitting, setSubmitting] = useState(false);
  const modalPadding = useFullScreenModalPadding();

  useEffect(() => {
    if (!visible) return;
    setText('');
    setBackground(STORY_BACKGROUNDS[0]);
    setMedia(null);
    setVisibility('FRIENDS');
    setFriendSearch('');
    setSelectedFriendIds([]);
  }, [visible]);

  useEffect(() => {
    if (!visible || visibility !== 'CUSTOM' || !userId || friends.length > 0) return;
    setFriendsLoading(true);
    MediaApi.fetchFriends(userId)
      .then(setFriends)
      .finally(() => setFriendsLoading(false));
  }, [friends.length, userId, visibility, visible]);

  const pickStoryMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    setMedia(draftFromPickerAsset(result.assets[0]));
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
  };

  const submit = async () => {
    if (!userId || submitting) return;
    if (!text.trim() && !media) return;
    if (visibility === 'CUSTOM' && selectedFriendIds.length === 0) return;
    setSubmitting(true);
    try {
      let uploadedKey: string | undefined;
      if (media?.file) {
        const uploaded = await MediaApi.uploadStoryMedia(media.file);
        if (!uploaded?.fileKey) {
          Alert.alert('Không tải được media', 'Vui lòng thử lại sau.');
          return;
        }
        uploadedKey = uploaded.fileKey;
      }

      const accessControls =
        visibility === 'CUSTOM'
          ? selectedFriendIds.map((accountId) => ({ accountId, ruleType: customRuleType }))
          : undefined;

      const storyItems = media
        ? [
            {
              type: media.type === 'video' ? 'VIDEO_ITEM' : 'IMAGE_ITEM',
              imageItem:
                media.type === 'image'
                  ? {
                      url: uploadedKey || media.url,
                      width: 1080,
                      height: 1920,
                    }
                  : null,
              videoItem:
                media.type === 'video'
                  ? {
                      url: uploadedKey || media.url,
                      width: 1080,
                      height: 1920,
                    }
                  : null,
              textItem: null,
              isPrimary: true,
              zIndex: 1,
              positionX: 0.5,
              positionY: 0.5,
              rotation: 0,
              scale: 1,
            },
            ...(text.trim()
              ? [
                  {
                    type: 'TEXT_ITEM',
                    imageItem: null,
                    videoItem: null,
                    textItem: {
                      content: text.trim(),
                      color: '#ffffff',
                      backgroundColor: 'transparent',
                      alignment: 'CENTER',
                    },
                    isPrimary: false,
                    zIndex: 2,
                    positionX: 0.5,
                    positionY: 0.75,
                    rotation: 0,
                    scale: 1,
                  },
                ]
              : []),
          ]
        : [
            {
              type: 'TEXT_ITEM',
              textItem: {
                content: text.trim(),
                color: '#ffffff',
                backgroundColor: background,
                alignment: 'CENTER',
              },
              isPrimary: true,
              zIndex: 1,
              positionX: 0.5,
              positionY: 0.5,
              rotation: 0,
              scale: 1,
            },
          ];

      const story = await MediaApi.createStory({
        userId,
        visibility,
        accessControls,
        isHighlight: false,
        expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        storyItems,
      });

      if (!story) {
        Alert.alert('Không tạo được tin', 'Vui lòng thử lại sau.');
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={modalPadding}>
        <View className="h-14 flex-row items-center justify-between border-b border-slate-100 px-4">
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-slate-100" onPress={onClose}>
            <Feather name="x" size={21} color={THEME_COLORS.neutral.slate600} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-950">Tạo tin</Text>
          {(() => {
            const canShare =
              Boolean(text.trim() || media) &&
              (visibility !== 'CUSTOM' || selectedFriendIds.length > 0) &&
              !submitting;
            return (
          <TouchableOpacity
            className={`rounded-full px-4 py-2 ${canShare ? 'bg-slate-900' : 'bg-slate-200'}`}
            disabled={!canShare}
            onPress={submit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className={`font-bold ${canShare ? 'text-white' : 'text-slate-500'}`}>Đăng</Text>
            )}
          </TouchableOpacity>
            );
          })()}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <VisibilityPills value={visibility} onChange={setVisibility} />
          <FriendSelector
            visible={visibility === 'CUSTOM'}
            friends={friends}
            loading={friendsLoading}
            selectedIds={selectedFriendIds}
            ruleType={customRuleType}
            search={friendSearch}
            onRuleTypeChange={setCustomRuleType}
            onSearchChange={setFriendSearch}
            onToggleFriend={toggleFriend}
          />
          {visibility === 'CUSTOM' && selectedFriendIds.length === 0 ? (
            <Text className="mt-2 text-xs font-semibold text-red-500">Chọn ít nhất một người cho phạm vi tùy chỉnh.</Text>
          ) : null}

          <View className="mt-4 h-[520px] overflow-hidden rounded-[24px] bg-slate-900" style={{ backgroundColor: media ? '#0f172a' : background }}>
            {media ? (
              media.type === 'video' ? (
                <View className="h-full w-full items-center justify-center">
                  <Feather name="video" size={36} color="#fff" />
                  <Text className="mt-3 text-sm font-bold text-white/80">Video story</Text>
                </View>
              ) : (
                <ExpoImage source={{ uri: media.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              )
            ) : null}
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder={media ? 'Thêm chữ lên tin' : 'Viết tin của bạn'}
              placeholderTextColor="rgba(255,255,255,0.65)"
              className={`absolute inset-x-0 ${media ? 'bottom-16 min-h-[80px]' : 'top-0 h-full'} px-8 text-center text-[27px] font-black leading-10 text-white`}
              textAlignVertical="center"
            />
            {media ? (
              <TouchableOpacity
                className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/55"
                onPress={() => setMedia(null)}
              >
                <Feather name="x" size={18} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="mt-4 flex-row justify-center gap-3">
            {STORY_BACKGROUNDS.map((color) => (
              <TouchableOpacity
                key={color}
                className={`h-10 w-10 rounded-full border-2 ${background === color ? 'border-slate-900' : 'border-white'}`}
                style={{ backgroundColor: color }}
                onPress={() => setBackground(color)}
              />
            ))}
          </View>

          <TouchableOpacity
            className="mt-4 h-12 flex-row items-center justify-center rounded-2xl bg-slate-100"
            onPress={pickStoryMedia}
          >
            <Feather name="image" size={19} color={THEME_COLORS.neutral.slate700} />
            <Text className="ml-2 font-bold text-slate-800">{media ? 'Đổi ảnh/video' : 'Thêm ảnh/video'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function DiscoverScreen() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryUserGroup[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<StorySuggestedUser[]>([]);
  const [reactionByPost, setReactionByPost] = useState<Record<string, string>>({});
  const [reactionCountsByPost, setReactionCountsByPost] = useState<Record<string, Record<string, number>>>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [createStoryVisible, setCreateStoryVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [reactionPickerPost, setReactionPickerPost] = useState<Post | null>(null);
  const [reactionsListPost, setReactionsListPost] = useState<Post | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [storyGroup, setStoryGroup] = useState<StoryUserGroup | null>(null);

  const avatarUrl = user?.avatarUrl;
  const displayName = user?.fullName || 'Người dùng';

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

  const loadInitial = useCallback(
    async (isRefresh = false) => {
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      if (!isRefresh) setLoading(true);
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
          if (reaction.targetId) nextReactions[reaction.targetId] = reaction.reactionType;
        });
        setReactionByPost(nextReactions);
        void refreshReactionCounts(nextPosts, true);
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
    if (!currentUserId) return;

    const handleActivity = (payload: PostActivityPayload) => {
      if (!payload.postId) return;

      if (payload.activityType === 'COMMENT') {
        const delta = payload.action === 'CREATE' ? 1 : payload.action === 'DELETE' ? -1 : 0;
        if (delta) {
          setPosts((prev) =>
            prev.map((post) =>
              post.id === payload.postId ? { ...post, comments: Math.max(0, post.comments + delta) } : post,
            ),
          );
        }
        return;
      }

      if (payload.activityType === 'REACTION') {
        void MediaApi.fetchPostById(payload.postId, currentUserId).then((freshPost) => {
          if (!freshPost) return;
          setPosts((prev) => prev.map((post) => (post.id === payload.postId ? { ...post, likes: freshPost.likes } : post)));
          void refreshReactionCounts([freshPost]);
        });
      }
    };

    void mediaSocket.onPostActivity(handleActivity);
    return () => mediaSocket.offPostActivity(handleActivity);
  }, [currentUserId, refreshReactionCounts]);

  const refreshStories = useCallback(async () => {
    if (!currentUserId) return;
    const [stories, suggested] = await Promise.all([
      MediaApi.fetchStoryGroups(currentUserId),
      MediaApi.fetchSuggestedUsers(currentUserId),
    ]);
    setStoryGroups(stories);
    setSuggestedUsers(suggested);
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
      const data = await MediaApi.findPostsWithAuthorized(nextPage, PAGE_SIZE, currentUserId);
      if (!data) return;
      const newPosts = data.posts.filter((post) => !posts.some((item) => item.id === post.id));
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
      prev.map((post) => (post.id === postId ? { ...post, comments: Math.max(0, post.comments + delta) } : post)),
    );
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
      if (result.liked) {
        next[post.id] = result.reactionType || reactionType;
      } else {
        delete next[post.id];
      }
      return next;
    });
    void refreshReactionCounts([post]);
  };

  const handleAddFriend = useCallback(async (target: StorySuggestedUser) => {
    if (!currentUserId) return;
    const previous = suggestedUsers;
    setSuggestedUsers((prev) => prev.filter((item) => item.id !== target.id));
    const result = await MediaApi.sendFriendRequest(currentUserId, target.id);
    if (!result) {
      setSuggestedUsers(previous);
      Alert.alert('Không gửi được lời mời', 'Vui lòng thử lại sau.');
    }
  }, [currentUserId, suggestedUsers]);

  const handleDeletePost = (post: Post) => {
    Alert.alert('Xóa bài viết', 'Bạn có chắc chắn muốn xóa bài viết này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
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
            Alert.alert('Không xóa được', 'Vui lòng thử lại sau.');
          }
        },
      },
    ]);
  };

  const header = useMemo(
    () => (
      <DiscoverHeader
        userName={displayName}
        avatarUrl={avatarUrl}
        storyGroups={storyGroups}
        suggestedUsers={suggestedUsers}
        onCreatePost={() => {
          setEditingPost(null);
          setCreatePostVisible(true);
        }}
        onCreateStory={() => setCreateStoryVisible(true)}
        onOpenStory={setStoryGroup}
        onAddFriend={handleAddFriend}
      />
    ),
    [avatarUrl, displayName, handleAddFriend, storyGroups, suggestedUsers],
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-sunken" edges={['top']}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={THEME_COLORS.primary[600]} size="large" />
          <Text className="mt-3 text-sm font-semibold text-slate-500">Đang tải bảng tin...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME_COLORS.primary[600]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          onScrollBeginDrag={() => setReactionPickerPost(null)}
          ListEmptyComponent={
            <View className="mx-4 mt-6 items-center rounded-2xl bg-white px-6 py-10">
              <Feather name="coffee" size={34} color={THEME_COLORS.neutral.slate400} />
              <Text className="mt-3 text-center text-base font-bold text-slate-800">Chưa có bài viết</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">Hãy tạo bài viết đầu tiên trên mobile.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator color={THEME_COLORS.primary[600]} />
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
              onDelete={handleDeletePost}
              onShare={handleSharePost}
            />
          )}
        />
      )}

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
        visible={createStoryVisible}
        userId={currentUserId}
        onClose={() => setCreateStoryVisible(false)}
        onCreated={refreshStories}
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

      <StoryViewerModal group={storyGroup} currentUserId={currentUserId} onClose={() => setStoryGroup(null)} />
    </SafeAreaView>
  );
}
