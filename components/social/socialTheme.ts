import { THEME_COLORS } from '@/constants/theme';
import type { MediaUploadAsset, PostMediaItem, Visibility } from '@/services/api/media.api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'PUBLIC', label: 'Công khai', icon: 'earth' },
  { value: 'FRIENDS', label: 'Bạn bè', icon: 'people' },
  { value: 'PRIVATE', label: 'Riêng tư', icon: 'lock-closed' },
  { value: 'CUSTOM', label: 'Tùy chỉnh', icon: 'options' },
];

export const REACTION_OPTIONS = [
  { value: 'LIKE', label: 'Thích', emoji: '👍', color: THEME_COLORS.primary[700] },
  { value: 'LOVE', label: 'Yêu thích', emoji: '❤️', color: '#e11d48' },
  { value: 'HAHA', label: 'Haha', emoji: '😆', color: THEME_COLORS.primary[500] },
  { value: 'WOW', label: 'Wow', emoji: '😮', color: THEME_COLORS.primary[600] },
  { value: 'SAD', label: 'Buồn', emoji: '😢', color: THEME_COLORS.neutral.slate500 },
  { value: 'ANGRY', label: 'Giận', emoji: '😡', color: '#dc2626' },
];

export const FEELING_OPTIONS = [
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

export const STORY_BACKGROUNDS = ['#24180f', '#463421', '#694d31', '#8b6642', '#ae7f53', '#bc9166'];

export const SOCIAL_COLORS = {
  page: THEME_COLORS.primary[50],
  card: '#ffffff',
  cardMuted: '#fdfaf7',
  chip: THEME_COLORS.primary[100],
  chipLight: THEME_COLORS.primary[50],
  border: THEME_COLORS.primary[100],
  borderStrong: THEME_COLORS.primary[200],
  text: '#24180f',
  textMuted: '#7b6654',
  textSoft: '#9a8068',
  primary: THEME_COLORS.primary[600],
  primaryDark: THEME_COLORS.primary[800],
  primarySoft: THEME_COLORS.primary[100],
  primaryLight: THEME_COLORS.primary[50],
  shadow: 'rgba(70,52,33,0.16)',
};

export const SOCIAL_SHADOW = {
  shadowColor: SOCIAL_COLORS.shadow,
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 2,
};

export type DraftMediaItem = PostMediaItem & {
  draftId: string;
  file?: MediaUploadAsset;
  isExisting?: boolean;
};

export type FeelingOption = (typeof FEELING_OPTIONS)[number];

export const formatCount = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
};

export const initialsFor = (name?: string | null) => {
  const clean = String(name || '').trim();
  if (!clean) return '?';
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export const visibilityLabel = (visibility?: string) => {
  const normalized = String(visibility || '').toUpperCase();
  if (normalized === 'FRIENDS') return 'Bạn bè';
  if (normalized === 'PRIVATE') return 'Riêng tư';
  if (normalized === 'CUSTOM') return 'Tùy chỉnh';
  return 'Công khai';
};

export const reactionLabel = (reaction?: string | null) =>
  REACTION_OPTIONS.find((item) => item.value === String(reaction || '').toUpperCase())?.label || 'Thích';

export const reactionMeta = (reaction?: string | null) =>
  REACTION_OPTIONS.find((item) => item.value === String(reaction || '').toUpperCase()) || REACTION_OPTIONS[0];

export const isVideoMedia = (media: PostMediaItem | MediaUploadAsset) => {
  const marker = `${'mediaType' in media ? media.mediaType || '' : ''} ${media.type || ''} ${
    'mimeType' in media ? media.mimeType || '' : ''
  } ${'uri' in media ? media.uri : 'url' in media ? media.url : ''}`.toLowerCase();
  return marker.includes('video') || /\.(mp4|mov|m4v|webm|avi)$/i.test(marker);
};

export const mapPickerAsset = (asset: ImagePicker.ImagePickerAsset): MediaUploadAsset => ({
  uri: asset.uri,
  fileName: asset.fileName,
  name: asset.fileName,
  mimeType: asset.mimeType,
  type: asset.mimeType,
  mediaType: asset.type === 'video' ? 'video' : 'image',
});

export const draftFromPickerAsset = (asset: ImagePicker.ImagePickerAsset): DraftMediaItem => {
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

export const draftFromPostMedia = (item: PostMediaItem, index: number): DraftMediaItem => ({
  ...item,
  draftId: item.id || `existing-${index}-${item.url}`,
  isExisting: true,
});

export const buildCaptionWithFeeling = (caption: string, feeling: FeelingOption | null) => {
  const content = caption.trim();
  if (!feeling) return content;
  return `${content}${content ? ' ' : ''}- đang cảm thấy ${feeling.emoji} ${feeling.label}`;
};

export const useFullScreenModalPadding = () => {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 64 : 24),
    paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 0),
  };
};
