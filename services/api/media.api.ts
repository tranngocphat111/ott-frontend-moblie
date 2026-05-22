import { MEDIA_CONFIG } from '@/configuration/api';
import { apiClient, chatApiClient } from './client';

export type MediaKind = 'image' | 'video';
export type Visibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | 'CUSTOM';
export type AccessRuleType = 'INCLUDE' | 'EXCLUDE';

export type AccessControl = {
  accountId: string;
  ruleType: AccessRuleType;
};

export type MediaUploadAsset = {
  uri: string;
  name?: string | null;
  fileName?: string | null;
  type?: string | null;
  mimeType?: string | null;
  mediaType?: MediaKind | 'photo' | 'video' | string | null;
  caption?: string | null;
};

export interface PostMediaItem {
  type: MediaKind;
  url: string;
  id?: string;
  caption?: string | null;
  thumbnailUrl?: string | null;
  file?: MediaUploadAsset;
}

export interface SocialUser {
  id: string;
  name: string;
  displayName: string;
  avatar?: string;
  color: string;
}

export interface Post {
  id: string;
  author: SocialUser;
  time: string;
  content: string;
  media: PostMediaItem[];
  likes: number;
  comments: number;
  shares: number;
  visibility?: string;
  relationship?: 'self' | 'friend' | 'friend-of-friend' | 'stranger';
  relationshipLabel?: string;
  accessControls?: AccessControl[];
  sharedPost?: Post;
}

export interface StoryContentItem {
  id?: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  url?: string;
  textContent?: string;
  textBackgroundColor?: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  scale: number;
  rotation: number;
  zIndex: number;
  file?: MediaUploadAsset;
}

export interface StoryItem {
  id: string;
  name: string;
  isBirthday: boolean;
  userId?: string;
  avatarUrl?: string;
  contentType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'UNKNOWN';
  textContent?: string;
  textBackgroundColor?: string;
  imageUrl?: string;
  videoUrl?: string;
  totalViews?: number;
  musics?: any[];
  items?: StoryContentItem[];
  expireAt?: string;
  visibility?: string;
  accessControls?: AccessControl[];
  lastUpdated?: number;
}

export interface StoryUserGroup {
  userId: string;
  name: string;
  avatarUrl?: string;
  stories: StoryItem[];
}

export interface StorySuggestedUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface StoryReelData {
  storyGroups: StoryUserGroup[];
  suggestedUsers: StorySuggestedUser[];
}

export interface ApiMedia {
  id: string;
  type: 'IMAGE_MEDIA' | 'VIDEO_MEDIA';
  url: string;
  orderIndex: number;
  caption: string | null;
  thumbnailUrl: string | null;
}

export interface ApiPost {
  id: string;
  accountId: string;
  accountUsername: string;
  accountDisplayName: string;
  accountAvatarUrl: string | null;
  caption: string;
  medias: ApiMedia[] | null;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  createdAt: string;
  updatedAt: string;
  visibility: string;
  hashTags: string[] | null;
  accessControls?: AccessControl[];
  sharedPost?: ApiPost | null;
}

export interface PostsPage {
  posts: Post[];
  totalPages: number;
  totalElements: number;
  page: number;
  hasMore: boolean;
}

export interface ApiReaction {
  id: string;
  accountId: string;
  accountUsername?: string;
  accountDisplayName?: string;
  accountAvatarUrl?: string;
  targetId: string;
  targetType: string;
  reactionType: string;
}

export interface ToggleLikeResult {
  liked: boolean;
  totalReactions: number;
  reactionType?: string;
}

export interface ApiComment {
  id: string;
  text: string;
  accountId: string;
  accountUsername: string;
  accountDisplayName: string | null;
  accountAvatarUrl: string | null;
  parentCommentId: string | null;
  edited: boolean;
  deleted: boolean;
  depth: number;
  totalReplies: number;
  totalReactions: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  parentId?: string;
  depth: number;
  isEdited: boolean;
  time: string;
  totalReplies: number;
}

export interface CommentPage {
  comments: Comment[];
  totalElements: number;
  totalPages: number;
  page: number;
  hasMore: boolean;
}

export interface ApiUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  work: string | null;
  location: string | null;
  relationshipStatus: string | null;
  phoneNumber: string | null;
}

export interface RelationshipResponse {
  id: string;
  requesterId: string;
  requesterUsername: string;
  requesterAvatarUrl: string;
  receiverId: string;
  receiverUsername: string;
  receiverAvatarUrl: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED' | 'REMOVED';
  type: 'FRIEND';
  createAt: string;
  acceptedAt: string;
}

export interface FriendOption {
  id: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
}

export interface FriendRequestOption {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface ApiStoryItemResponse {
  id?: string;
  type: 'TEXT_ITEM' | 'IMAGE_ITEM' | 'VIDEO_ITEM';
  imageItem?: { url?: string | null } | null;
  videoItem?: { url?: string | null; thumbnailUrl?: string | null } | null;
  textItem?: {
    content?: string | null;
    backgroundColor?: string | null;
  } | null;
  isPrimary?: boolean;
  zIndex?: number;
  positionX?: number;
  positionY?: number;
  rotation?: number;
  scale?: number;
}

export interface ApiStory {
  id: string;
  accountId: string;
  accountUsername: string;
  accountDisplayName: string | null;
  accountAvatarUrl: string | null;
  storyItems?: ApiStoryItemResponse[];
  totalViews?: number;
  musics?: any[];
  expireAt?: string;
  visibility?: string;
  accessControls?: AccessControl[];
}

export interface ApiStoryGroup {
  accountId: string;
  accountUsername: string;
  accountDisplayName: string | null;
  accountAvatarUrl: string | null;
  stories: ApiStoryReelItem[];
}

export interface ApiStoryReelItem {
  id: string;
  accountAvatarUrl: string | null;
  storyItems?: ApiStoryItemResponse[];
  totalViews?: number;
  musics?: any[];
}

export interface ApiSuggestedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ApiStoryReel {
  storyGroups?: ApiStoryGroup[];
  stories?: ApiStory[];
  suggestedUsers?: ApiSuggestedUser[];
}

export interface StoryCreateRequest {
  userId: string;
  visibility?: Visibility | string;
  isHighlight?: boolean;
  highlightName?: string | null;
  expireAt?: string | null;
  storyItems?: unknown[];
  musics?: unknown[];
  hashTags?: string[];
  accessControls?: unknown[];
  mentions?: unknown[];
}

export interface StoryUploadResponse {
  storyItemId?: string | null;
  fileKey: string;
}

export type SocialContentItem =
  | { id: string; kind: 'post'; post: Post; story?: never; raw: unknown }
  | { id: string; kind: 'story'; post?: never; story: StoryItem; raw: unknown };

interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  last: boolean;
}

type ChatRelationshipLike = {
  _id?: string;
  requester_id?: string;
  receiver_id?: string;
  requesterId?: string;
  receiverId?: string;
  relationship_id?: string;
  status?: string;
};

const AVATAR_COLORS = [
  '#8b5cf6',
  '#10b981',
  '#f43f5e',
  '#f59e0b',
  '#0ea5e9',
  '#14b8a6',
];

const colorFor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];
const MEDIA_ROOT = `${MEDIA_CONFIG.BASE_URL.replace(/\/$/, '')}/`;

const mediaPath = (path: string) => `/media${path.startsWith('/') ? path : `/${path}`}`;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) return message;
  }
  return fallback;
};

export const unwrapApiResult = <T,>(payload: unknown): T | null => {
  if (!payload) return null;

  if (Array.isArray(payload) && payload.length === 2 && typeof payload[0] === 'string') {
    return payload[1] as T;
  }

  if (typeof payload !== 'object') return null;
  if ('result' in (payload as any)) return (payload as any).result ?? null;
  return payload as T;
};

export const unwrapList = <T,>(json: unknown): T[] => {
  const data = unwrapApiResult<T[]>(json);
  if (!Array.isArray(data)) {
    const obj = data as any;
    if (obj && Array.isArray(obj.value)) return obj.value;
    return [];
  }

  return data
    .map((item) => unwrapApiResult<T>(item))
    .filter((item): item is T => item !== null);
};

export const resolveMediaUrl = (raw?: string | null): string | undefined => {
  const value = String(raw || '').trim();
  if (!value) return undefined;
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('file://') ||
    value.startsWith('content://') ||
    value.startsWith('blob:')
  ) {
    return value;
  }
  return `${MEDIA_ROOT}${value.startsWith('/') ? value.slice(1) : value}`;
};

export const relativeTime = (iso: string | null | undefined): string => {
  if (!iso) return 'Vừa xong';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;

  return date.toLocaleDateString('vi-VN');
};

export const mapMedia = (medias: ApiMedia[] | null): PostMediaItem[] => {
  const list = unwrapList<ApiMedia>(medias);
  if (!list.length) return [];

  return list
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .map((media) => ({
      type: media.type === 'VIDEO_MEDIA' ? 'video' : 'image',
      url: resolveMediaUrl(media.url) || media.url,
      id: media.id,
      caption: media.caption,
      thumbnailUrl: resolveMediaUrl(media.thumbnailUrl),
    }));
};

export const mapPost = (post: ApiPost, colorIndex: number, currentUserId?: string, depth = 0): Post => {
  const author: SocialUser = {
    id: post.accountId,
    name: post.accountDisplayName || post.accountUsername || 'Người dùng',
    displayName: post.accountDisplayName || post.accountUsername || 'Người dùng',
    avatar: resolveMediaUrl(post.accountAvatarUrl) || undefined,
    color: colorFor(colorIndex),
  };

  return {
    id: post.id,
    author,
    time: relativeTime(post.createdAt),
    content: post.caption ?? '',
    media: mapMedia(post.medias),
    likes: post.totalReactions ?? 0,
    comments: post.totalComments ?? 0,
    shares: post.totalShares ?? 0,
    visibility: post.visibility,
    relationship: post.accountId === currentUserId ? 'self' : undefined,
    accessControls: post.accessControls,
    sharedPost: post.sharedPost && depth < 3 ? mapPost(post.sharedPost, colorIndex + 1, currentUserId, depth + 1) : undefined,
  };
};

export const mapComment = (comment: ApiComment): Comment => ({
  id: comment.id,
  authorId: comment.accountId,
  authorName: comment.accountDisplayName || comment.accountUsername || 'Người dùng',
  authorAvatar: resolveMediaUrl(comment.accountAvatarUrl),
  text: comment.text,
  parentId: comment.parentCommentId ?? undefined,
  depth: comment.depth,
  isEdited: comment.edited,
  time: relativeTime(comment.createdAt ?? new Date().toISOString()),
  totalReplies: comment.totalReplies ?? 0,
});

const inferMediaKind = (asset: MediaUploadAsset): MediaKind => {
  const marker = `${asset.mediaType || ''} ${asset.type || ''} ${asset.mimeType || ''} ${asset.uri}`.toLowerCase();
  return marker.includes('video') || /\.(mp4|mov|m4v|webm|avi)$/i.test(asset.uri) ? 'video' : 'image';
};

const inferMimeType = (asset: MediaUploadAsset) => {
  if (asset.mimeType) return asset.mimeType;
  if (asset.type?.includes('/')) return asset.type;
  if (inferMediaKind(asset) === 'video') return 'video/mp4';
  return 'image/jpeg';
};

const extensionFor = (asset: MediaUploadAsset) => {
  const uriExt = asset.uri.match(/\.([a-z0-9]+)(?:\?|#|$)/i)?.[1];
  if (uriExt) return uriExt;
  return inferMediaKind(asset) === 'video' ? 'mp4' : 'jpg';
};

const uploadPartFor = (asset: MediaUploadAsset, index: number) => ({
  uri: asset.uri,
  name: asset.fileName || asset.name || `media_${Date.now()}_${index}.${extensionFor(asset)}`,
  type: inferMimeType(asset),
});

const appendUploadFiles = (
  form: FormData,
  fieldName: string,
  files: MediaUploadAsset[],
  captions?: string[],
) => {
  files.forEach((file, index) => {
    form.append(fieldName, uploadPartFor(file, index) as any);
    if (captions) form.append('captions', captions[index] ?? file.caption ?? '');
  });
};

export const fetchPosts = async (currentUserId?: string): Promise<Post[] | null> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath('/posts'));
    const raw = unwrapList<ApiPost>(payload);
    if (!raw.length) return null;

    const colorMap = new Map<string, number>();
    let colorIndex = 0;

    return raw
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((post) => {
        if (!colorMap.has(post.accountId)) colorMap.set(post.accountId, colorIndex++);
        return mapPost(post, colorMap.get(post.accountId)!, currentUserId);
      });
  } catch {
    return null;
  }
};

export const fetchPostsWithPage = async (
  page = 0,
  size = 10,
  currentUserId?: string,
): Promise<PostsPage | null> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath('/posts/page'), {
      params: { page, size, sort: 'createdAt,desc' },
    });
    const data = unwrapApiResult<SpringPage<ApiPost>>(payload);
    if (!data) return null;

    const colorMap = new Map<string, number>();
    let colorIndex = 0;
    const content = unwrapList<ApiPost>(data.content ?? []);
    const posts = content.map((post) => {
      if (!colorMap.has(post.accountId)) colorMap.set(post.accountId, colorIndex++);
      return mapPost(post, colorMap.get(post.accountId)!, currentUserId);
    });

    return {
      posts,
      totalPages: data.totalPages ?? 0,
      totalElements: data.totalElements ?? posts.length,
      page: data.number ?? page,
      hasMore: data.last === false,
    };
  } catch {
    return null;
  }
};

export const findPostsWithAuthorized = async (
  page = 0,
  size = 10,
  currentUserId?: string,
): Promise<PostsPage | null> => {
  if (!currentUserId) return fetchPostsWithPage(page, size, currentUserId);

  try {
    const payload = await (apiClient.get as any)(mediaPath(`/posts/page/${currentUserId}`), {
      params: { page, size, sort: 'createdAt,desc' },
    });
    const data = unwrapApiResult<SpringPage<ApiPost>>(payload);
    if (!data) return null;

    const colorMap = new Map<string, number>();
    let colorIndex = 0;
    const content = unwrapList<ApiPost>(data.content ?? []);
    const posts = content.map((post) => {
      if (!colorMap.has(post.accountId)) colorMap.set(post.accountId, colorIndex++);
      return mapPost(post, colorMap.get(post.accountId)!, currentUserId);
    });

    return {
      posts,
      totalPages: data.totalPages ?? 0,
      totalElements: data.totalElements ?? posts.length,
      page: data.number ?? page,
      hasMore: data.last === false,
    };
  } catch {
    return null;
  }
};

export const fetchPostsByUser = async (userId: string, currentUserId?: string): Promise<Post[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/posts/user/${userId}`));
    return unwrapList<ApiPost>(payload)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((post, index) => mapPost(post, index, currentUserId));
  } catch {
    return [];
  }
};

export const fetchPostById = async (postId: string, currentUserId?: string): Promise<Post | null> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/posts/${postId}`));
    const post = unwrapApiResult<ApiPost>(payload);
    return post ? mapPost(post, 0, currentUserId) : null;
  } catch {
    return null;
  }
};

export const searchPosts = async (
  query: string,
  currentUserId: string,
  page = 0,
  size = 10,
): Promise<PostsPage | null> => {
  if (!query.trim() || !currentUserId) {
    return { posts: [], totalElements: 0, totalPages: 0, page, hasMore: false };
  }

  try {
    const payload = await (apiClient.get as any)(mediaPath('/posts/search'), {
      params: { q: query.trim(), viewerId: currentUserId, page, size, sort: 'createdAt,desc' },
    });
    const data = unwrapApiResult<SpringPage<ApiPost>>(payload);
    const content = data ? unwrapList<ApiPost>(data.content ?? []) : unwrapList<ApiPost>(payload);
    const posts = content.map((post, index) => mapPost(post, index, currentUserId));

    return {
      posts,
      totalPages: data?.totalPages ?? 1,
      totalElements: data?.totalElements ?? posts.length,
      page: data?.number ?? page,
      hasMore: data?.last === false,
    };
  } catch {
    return null;
  }
};

export const createPost = async (
  accountId: string,
  caption: string,
  visibility: string,
  files: MediaUploadAsset[] = [],
  captions?: string[],
  accessControls?: AccessControl[],
): Promise<{ post: Post | null; error?: string }> => {
  try {
    const form = new FormData();
    form.append('accountId', accountId);
    form.append('caption', caption);
    form.append('visibility', visibility.toUpperCase());
    if (accessControls?.length) form.append('accessControls', JSON.stringify(accessControls));
    appendUploadFiles(form, 'files', files, captions);

    const payload = await (apiClient.post as any)(mediaPath('/posts'), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    const post = unwrapApiResult<ApiPost>(payload);
    if (!post) return { post: null, error: 'Dữ liệu trả về không hợp lệ' };
    return { post: mapPost(post, 0, accountId) };
  } catch (error) {
    return { post: null, error: getErrorMessage(error, 'Tạo bài viết thất bại. Vui lòng thử lại.') };
  }
};

export const updatePost = async (
  postId: string,
  accountId: string,
  caption: string,
  visibility: string,
  media: (PostMediaItem & { file?: MediaUploadAsset })[],
  accessControls?: AccessControl[],
): Promise<{ post: Post | null; error?: string }> => {
  try {
    const form = new FormData();
    form.append('accountId', accountId);
    form.append('caption', caption);
    form.append('visibility', visibility.toUpperCase());
    if (accessControls?.length) form.append('accessControls', JSON.stringify(accessControls));

    form.append(
      'existingMedias',
      JSON.stringify(
        media.map((item, index) => ({
          type: item.type === 'video' ? 'VIDEO_MEDIA' : 'IMAGE_MEDIA',
          url: item.url,
          caption: item.caption ?? null,
          orderIndex: index,
        })),
      ),
    );

    media.forEach((item, index) => {
      if (!item.file) return;
      form.append('files', uploadPartFor(item.file, index) as any);
      form.append('captions', item.caption ?? item.file.caption ?? '');
    });

    const payload = await (apiClient.put as any)(mediaPath(`/posts/${postId}`), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    const post = unwrapApiResult<ApiPost>(payload);
    if (!post) return { post: null, error: 'Dữ liệu trả về không hợp lệ' };
    return { post: mapPost(post, 0, accountId) };
  } catch (error) {
    return { post: null, error: getErrorMessage(error, 'Cập nhật bài viết thất bại. Vui lòng thử lại.') };
  }
};

export const deletePost = async (postId: string): Promise<boolean> => {
  try {
    await (apiClient.delete as any)(mediaPath(`/posts/${postId}`));
    return true;
  } catch (error: any) {
    return error?.code === 404 || error?.response?.status === 404;
  }
};

export const sharePost = async (
  postId: string,
  accountId: string,
  caption?: string,
  visibility: Visibility | string = 'PUBLIC',
): Promise<{ post: Post | null; error?: string }> => {
  try {
    const payload = await (apiClient.post as any)(mediaPath(`/posts/${postId}/share`), null, {
      params: {
        accountId,
        caption: caption?.trim() || undefined,
        visibility: visibility.toUpperCase(),
      },
    });
    const post = unwrapApiResult<ApiPost>(payload);
    if (!post) return { post: null, error: 'Dữ liệu trả về không hợp lệ' };
    return { post: mapPost(post, 0, accountId) };
  } catch (error) {
    return { post: null, error: getErrorMessage(error, 'Chia sẻ bài viết thất bại. Vui lòng thử lại.') };
  }
};

export const toggleLike = async (
  postId: string,
  accountId: string,
  reactionType = 'LIKE',
): Promise<ToggleLikeResult | null> => {
  try {
    const payload = await (apiClient.post as any)(mediaPath(`/posts/${postId}/like`), null, {
      params: { accountId, reactionType: reactionType.toUpperCase() },
    });
    const data = unwrapApiResult<any>(payload);
    if (!data) return null;
    return {
      liked: Boolean(data.liked),
      totalReactions: Number(data.totalReactions ?? 0),
      reactionType: data.reaction?.reactionType,
    };
  } catch {
    return null;
  }
};

export const fetchUserReactions = async (accountId: string): Promise<ApiReaction[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath('/posts/reactions/by-account'), {
      params: { accountId },
    });
    return unwrapList<ApiReaction>(payload);
  } catch {
    return [];
  }
};

export const fetchPostReactions = async (postId: string): Promise<Record<string, number>> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/posts/${postId}/reactions`));
    const counts: Record<string, number> = {};
    unwrapList<ApiReaction>(payload).forEach((reaction) => {
      const key = reaction.reactionType.toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  } catch {
    return {};
  }
};

export const fetchPostReactionDetails = async (postId: string): Promise<ApiReaction[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/posts/${postId}/reactions`));
    return unwrapList<ApiReaction>(payload);
  } catch {
    return [];
  }
};

const emptyCommentPage = (page: number): CommentPage => ({
  comments: [],
  totalElements: 0,
  totalPages: 0,
  page,
  hasMore: false,
});

const fetchRootCommentsFallback = async (postId: string, page: number, size: number): Promise<CommentPage> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/posts/${postId}/comments`));
    const raw = unwrapList<ApiComment>(payload);
    const roots = raw
      .filter((comment) => !comment.deleted && !comment.parentCommentId)
      .map(mapComment);
    const start = page * size;
    return {
      comments: roots.slice(start, start + size),
      totalElements: roots.length,
      totalPages: Math.ceil(roots.length / size) || 1,
      page,
      hasMore: start + size < roots.length,
    };
  } catch {
    return emptyCommentPage(page);
  }
};

export const fetchRootComments = async (postId: string, page = 0, size = 20): Promise<CommentPage> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/posts/${postId}/comments/root`), {
      params: { page, size },
    });
    const data = unwrapApiResult<SpringPage<ApiComment>>(payload);
    if (!data) return fetchRootCommentsFallback(postId, page, size);
    const comments = unwrapList<ApiComment>(data.content ?? [])
      .filter((comment) => !comment.deleted)
      .map(mapComment);
    return {
      comments,
      totalElements: data.totalElements ?? comments.length,
      totalPages: data.totalPages ?? 1,
      page: data.number ?? page,
      hasMore: data.last === false,
    };
  } catch {
    return fetchRootCommentsFallback(postId, page, size);
  }
};

export const fetchReplies = async (commentId: string, page = 0, size = 10): Promise<CommentPage> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/posts/comments/${commentId}/replies`), {
      params: { page, size, sort: 'createdAt,asc' },
    });
    const data = unwrapApiResult<SpringPage<ApiComment>>(payload);
    if (!data) return emptyCommentPage(page);
    const comments = unwrapList<ApiComment>(data.content ?? [])
      .filter((comment) => !comment.deleted)
      .map(mapComment);
    return {
      comments,
      totalElements: data.totalElements ?? comments.length,
      totalPages: data.totalPages ?? 1,
      page: data.number ?? page,
      hasMore: data.last === false,
    };
  } catch {
    return emptyCommentPage(page);
  }
};

export const fetchComments = async (postId: string): Promise<Comment[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/posts/${postId}/comments`));
    return unwrapList<ApiComment>(payload)
      .filter((comment) => !comment.deleted)
      .map(mapComment);
  } catch {
    return [];
  }
};

export const addComment = async (
  postId: string,
  accountId: string,
  text: string,
  parentCommentId?: string,
): Promise<Comment | null> => {
  try {
    const payload = await (apiClient.post as any)(mediaPath(`/posts/${postId}/comments`), null, {
      params: { accountId, text, parentCommentId },
    });
    const comment = unwrapApiResult<ApiComment>(payload);
    return comment ? mapComment(comment) : null;
  } catch {
    return null;
  }
};

export const deleteComment = async (postId: string, commentId: string): Promise<boolean> => {
  try {
    await (apiClient.delete as any)(mediaPath(`/posts/${postId}/comments/${commentId}`));
    return true;
  } catch (error: any) {
    return error?.code === 404 || error?.response?.status === 404;
  }
};

export const fetchUsers = async (): Promise<ApiUser[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath('/users'));
    return unwrapList<ApiUser>(payload);
  } catch {
    return [];
  }
};

export const fetchUserByUsername = async (username: string): Promise<ApiUser | null> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/users/username/${encodeURIComponent(username)}`));
    return unwrapApiResult<ApiUser>(payload);
  } catch {
    return null;
  }
};

export const fetchUserById = async (id: string): Promise<ApiUser | null> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/users/${id}`));
    return unwrapApiResult<ApiUser>(payload);
  } catch {
    return null;
  }
};

export const fetchFriends = async (userId: string): Promise<FriendOption[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/relationships/friends/${userId}`));
    return unwrapList<any>(payload).map((relationship) => {
      const isRequester = relationship.requesterId === userId;
      return {
        id: isRequester ? relationship.receiverId : relationship.requesterId,
        name:
          (isRequester ? relationship.receiverDisplayName : relationship.requesterDisplayName) ||
          (isRequester ? relationship.receiverUsername : relationship.requesterUsername) ||
          'Người dùng',
        avatarUrl: resolveMediaUrl(isRequester ? relationship.receiverAvatarUrl : relationship.requesterAvatarUrl),
        phone: isRequester ? relationship.receiverPhoneNumber : relationship.requesterPhoneNumber,
      };
    });
  } catch {
    return [];
  }
};

export const fetchPendingRequests = async (userId: string): Promise<FriendRequestOption[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/relationships/pending/${userId}`));
    return unwrapList<any>(payload).map((relationship) => ({
      id: relationship.id,
      userId: relationship.requesterId || relationship.userId || relationship.id,
      name: relationship.requesterDisplayName || relationship.requesterUsername || 'Người dùng',
      avatarUrl: resolveMediaUrl(relationship.requesterAvatarUrl || relationship.avatarUrl || relationship.avatar),
      createdAt: relationship.createdAt,
    }));
  } catch {
    return [];
  }
};

export const fetchRelationshipOf = async (
  user1: string,
  user2?: string,
): Promise<RelationshipResponse | null> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath('/relationships'), {
      params: { user1, user2 },
    });
    return unwrapApiResult<RelationshipResponse>(payload);
  } catch {
    return null;
  }
};

export const acceptFriendRequest = async (relationshipId: string): Promise<boolean> => {
  try {
    await (apiClient.patch as any)(mediaPath(`/relationships/${relationshipId}/accept`));
    return true;
  } catch {
    return false;
  }
};

export const rejectFriendRequest = async (relationshipId: string): Promise<boolean> => {
  try {
    await (apiClient.delete as any)(mediaPath(`/relationships/${relationshipId}/reject`));
    return true;
  } catch {
    return false;
  }
};

export const cancelRelationship = async (relationshipId: string | null): Promise<boolean> => {
  if (!relationshipId) return false;
  try {
    await (apiClient.delete as any)(mediaPath(`/relationships/${relationshipId}/cancel`));
    return true;
  } catch {
    return false;
  }
};

export const unfriendRelationship = async (relationshipId: string): Promise<boolean> => {
  try {
    await (apiClient.delete as any)(mediaPath(`/relationships/${relationshipId}/unfriend`));
    return true;
  } catch {
    return false;
  }
};

export const blockRelationship = async (relationshipId: string, blockerId: string): Promise<boolean> => {
  try {
    await (apiClient.patch as any)(mediaPath(`/relationships/${relationshipId}/block`), null, {
      params: { blockerId },
    });
    return true;
  } catch {
    return false;
  }
};

export const sendFriendRequest = async (requesterId: string, receiverId?: string): Promise<any> => {
  try {
    const payload = await (apiClient.post as any)(mediaPath('/relationships/send'), null, {
      params: { requesterId, receiverId },
    });
    return unwrapApiResult<any>(payload);
  } catch {
    return null;
  }
};

const getRelationshipRequesterId = (relationship?: ChatRelationshipLike | null) =>
  String(relationship?.requester_id || relationship?.requesterId || '').trim();

const getRelationshipReceiverId = (relationship?: ChatRelationshipLike | null) =>
  String(relationship?.receiver_id || relationship?.receiverId || '').trim();

const isRelationshipStatus = (relationship: ChatRelationshipLike | null, expectedStatuses: string[]) => {
  if (!relationship?.status) return false;
  const normalized = relationship.status.toUpperCase();
  return expectedStatuses.some((status) => status.toUpperCase() === normalized);
};

const hasRelationshipId = (
  relationship: ChatRelationshipLike | null | undefined,
  relationshipId?: string,
) => {
  if (!relationshipId) return true;
  const expectedId = String(relationshipId);
  return [
    (relationship as any)?._id,
    (relationship as any)?.id,
    (relationship as any)?.relationship_id,
    (relationship as any)?.relationshipId,
  ].some((value) => value && String(value) === expectedId);
};

export const fetchRelationshipStatusViaChat = async (userId1: string, userId2: string): Promise<any | null> => {
  try {
    return await (chatApiClient.get as any)('/relationships/status', {
      params: { userId1, userId2 },
    });
  } catch {
    return null;
  }
};

const verifyRelationshipMutation = async (
  relationship: ChatRelationshipLike | null | undefined,
  expectedStatuses: string[],
  relationshipId?: string,
) => {
  const requesterId = getRelationshipRequesterId(relationship);
  const receiverId = getRelationshipReceiverId(relationship);
  if (!requesterId || !receiverId) return false;

  const latest = await fetchRelationshipStatusViaChat(requesterId, receiverId);
  if (!latest) return false;

  return hasRelationshipId(latest, relationshipId) && isRelationshipStatus(latest, expectedStatuses);
};

const verifySentFriendRequest = async (requesterId: string, receiverId: string) => {
  const latest = await fetchRelationshipStatusViaChat(requesterId, receiverId);
  if (!latest) return null;
  const sameDirection =
    getRelationshipRequesterId(latest) === String(requesterId) &&
    getRelationshipReceiverId(latest) === String(receiverId);
  if (sameDirection && isRelationshipStatus(latest, ['PENDING', 'ACCEPTED'])) return latest;
  return null;
};

export const sendFriendRequestViaChat = async (requesterId: string, receiverId: string): Promise<any> => {
  try {
    return await (chatApiClient.post as any)('/relationships/send', { requesterId, receiverId });
  } catch {
    return verifySentFriendRequest(requesterId, receiverId);
  }
};

export const acceptFriendRequestViaChat = async (
  relationshipId: string,
  relationship?: ChatRelationshipLike | null,
): Promise<boolean> => {
  try {
    await (chatApiClient.post as any)(`/relationships/accept/${relationshipId}`);
    return true;
  } catch {
    return verifyRelationshipMutation(relationship, ['ACCEPTED'], relationshipId);
  }
};

export const rejectFriendRequestViaChat = async (
  relationshipId: string,
  relationship?: ChatRelationshipLike | null,
): Promise<boolean> => {
  try {
    await (chatApiClient.post as any)(`/relationships/reject/${relationshipId}`);
    return true;
  } catch {
    return verifyRelationshipMutation(relationship, ['REMOVED'], relationshipId);
  }
};

export const cancelFriendRequestViaChat = async (
  relationshipId: string,
  relationship?: ChatRelationshipLike | null,
): Promise<boolean> => {
  try {
    await (chatApiClient.post as any)(`/relationships/cancel/${relationshipId}`);
    return true;
  } catch {
    return verifyRelationshipMutation(relationship, ['REMOVED'], relationshipId);
  }
};

export const unfriendViaChat = async (userId: string, friendId: string): Promise<boolean> => {
  try {
    await (chatApiClient.post as any)('/relationships/unfriend', { userId, friendId });
    return true;
  } catch {
    return false;
  }
};

export const blockUserViaChat = async (userId: string, targetId: string): Promise<boolean> => {
  try {
    await (chatApiClient.post as any)('/relationships/block', { userId, targetId });
    return true;
  } catch {
    return false;
  }
};

export const unblockUserViaChat = async (userId: string, targetId: string): Promise<boolean> => {
  try {
    await (chatApiClient.post as any)('/relationships/unblock', { userId, targetId });
    return true;
  } catch {
    return false;
  }
};

export const mapStory = (story: ApiStory): StoryItem => {
  const firstRenderable = story.storyItems?.find(
    (item) => item.type === 'TEXT_ITEM' || item.type === 'IMAGE_ITEM' || item.type === 'VIDEO_ITEM',
  );
  const imageUrl =
    firstRenderable?.type === 'IMAGE_ITEM' ? resolveMediaUrl(firstRenderable.imageItem?.url) : undefined;
  const videoUrl =
    firstRenderable?.type === 'VIDEO_ITEM' ? resolveMediaUrl(firstRenderable.videoItem?.url) : undefined;
  const textContent = firstRenderable?.type === 'TEXT_ITEM' ? firstRenderable.textItem?.content ?? undefined : undefined;
  const textBackgroundColor =
    firstRenderable?.type === 'TEXT_ITEM' ? firstRenderable.textItem?.backgroundColor ?? undefined : undefined;

  return {
    id: story.id,
    name: story.accountDisplayName || story.accountUsername || 'Người dùng',
    isBirthday: false,
    userId: story.accountId,
    avatarUrl: resolveMediaUrl(story.accountAvatarUrl),
    contentType:
      firstRenderable?.type === 'TEXT_ITEM'
        ? 'TEXT'
        : firstRenderable?.type === 'IMAGE_ITEM'
          ? 'IMAGE'
          : firstRenderable?.type === 'VIDEO_ITEM'
            ? 'VIDEO'
            : 'UNKNOWN',
    textContent,
    textBackgroundColor,
    imageUrl,
    videoUrl,
    items: (story.storyItems || []).map((item) => ({
      id: item.id || Math.random().toString(36).slice(2, 9),
      type: item.type === 'TEXT_ITEM' ? 'TEXT' : item.type === 'IMAGE_ITEM' ? 'IMAGE' : 'VIDEO',
      url: resolveMediaUrl(item.imageItem?.url || item.videoItem?.url),
      textContent: item.textItem?.content || undefined,
      textBackgroundColor: item.textItem?.backgroundColor || undefined,
      positionX: item.positionX ?? 0.5,
      positionY: item.positionY ?? 0.5,
      scale: item.scale ?? 1,
      rotation: item.rotation ?? 0,
      zIndex: item.zIndex ?? 1,
    })),
    expireAt: story.expireAt,
    visibility: story.visibility,
    accessControls: story.accessControls,
    lastUpdated: Date.now(),
  };
};

const groupStories = (raw: ApiStory[]): StoryUserGroup[] => {
  const groups = new Map<string, StoryUserGroup>();
  raw.forEach((story) => {
    const item = mapStory(story);
    const userId = item.userId || story.accountId;
    const existing = groups.get(userId);
    if (existing) {
      existing.stories.push(item);
      return;
    }
    groups.set(userId, {
      userId,
      name: item.name,
      avatarUrl: item.avatarUrl,
      stories: [item],
    });
  });
  return Array.from(groups.values());
};

const mapStoryGroups = (raw: ApiStoryGroup[]): StoryUserGroup[] =>
  raw.map((group) => ({
    userId: group.accountId,
    name: group.accountDisplayName || group.accountUsername || 'Người dùng',
    avatarUrl: resolveMediaUrl(group.accountAvatarUrl),
    stories: group.stories.map((story) =>
      mapStory({
        id: story.id,
        accountId: group.accountId,
        accountUsername: group.accountUsername,
        accountDisplayName: group.accountDisplayName,
        accountAvatarUrl: story.accountAvatarUrl || group.accountAvatarUrl,
        storyItems: story.storyItems,
        totalViews: story.totalViews,
        musics: story.musics,
      }),
    ),
  }));

const mapSuggestedUsers = (raw: ApiSuggestedUser[]): StorySuggestedUser[] =>
  raw.map((user) => ({
    id: user.id,
    name: user.displayName || user.username || 'Người dùng',
    avatarUrl: resolveMediaUrl(user.avatarUrl),
  }));

export const fetchStoryGroups = async (accountId: string): Promise<StoryUserGroup[]> => {
  if (!accountId) return [];
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/stories/reel/${accountId}`), {
      params: { suggestionLimit: 0 },
    });
    const reel = unwrapApiResult<ApiStoryReel>(payload);
    if (reel) {
      const groups = unwrapList<ApiStoryGroup>(reel.storyGroups);
      if (groups.length) return mapStoryGroups(groups);
      if (Array.isArray(reel.stories) && reel.stories.length) return groupStories(reel.stories);
    }
  } catch {
    // fall through to legacy endpoint
  }

  try {
    const payload = await (apiClient.get as any)(mediaPath('/stories'));
    return groupStories(unwrapList<ApiStory>(payload));
  } catch {
    return [];
  }
};

export const fetchSuggestedUsers = async (accountId: string, limit = 8): Promise<StorySuggestedUser[]> => {
  if (!accountId) return [];
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/stories/reel/${accountId}`), {
      params: { suggestionLimit: limit },
    });
    const reel = unwrapApiResult<ApiStoryReel>(payload);
    return mapSuggestedUsers(unwrapList<ApiSuggestedUser>(reel?.suggestedUsers));
  } catch {
    return [];
  }
};

export const fetchStories = async (accountId: string): Promise<StoryReelData> => ({
  storyGroups: await fetchStoryGroups(accountId),
  suggestedUsers: await fetchSuggestedUsers(accountId),
});

export const createStory = async (request: StoryCreateRequest): Promise<ApiStory | null> => {
  try {
    const payload = await (apiClient.post as any)(mediaPath('/stories'), request);
    return unwrapApiResult<ApiStory>(payload);
  } catch {
    return null;
  }
};

export const uploadStoryMedia = async (
  file: MediaUploadAsset,
  storyItemId?: string,
): Promise<StoryUploadResponse | null> => {
  try {
    const form = new FormData();
    form.append('file', uploadPartFor(file, 0) as any);
    if (storyItemId) form.append('storyItemId', storyItemId);
    const payload = await (apiClient.post as any)(mediaPath('/stories/upload'), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return unwrapApiResult<StoryUploadResponse>(payload);
  } catch {
    return null;
  }
};

export const deleteStory = async (storyId: string): Promise<boolean> => {
  try {
    await (apiClient.delete as any)(mediaPath(`/stories/${storyId}`));
    return true;
  } catch {
    return false;
  }
};

export const viewStory = async (storyId: string, accountId: string): Promise<void> => {
  try {
    await (apiClient.put as any)(mediaPath(`/stories/${storyId}/view`), null, {
      params: { accountId },
    });
  } catch {
    // View tracking should never block the UI.
  }
};

export const fetchStoryViewers = async (storyId: string): Promise<any[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath(`/stories/${storyId}/viewers`));
    return unwrapList<any>(payload);
  } catch {
    return [];
  }
};

export const updateStory = async (
  storyId: string,
  request: StoryCreateRequest,
  files?: MediaUploadAsset[],
  captions?: string[],
): Promise<ApiStory | null> => {
  try {
    const form = new FormData();
    form.append('request', JSON.stringify(request) as any);
    if (files?.length) appendUploadFiles(form, 'files', files, captions);

    const payload = await (apiClient.put as any)(mediaPath(`/stories/${storyId}`), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return unwrapApiResult<ApiStory>(payload);
  } catch {
    return null;
  }
};

const isPostPayload = (item: any): item is ApiPost =>
  Boolean(item?.id) &&
  ('caption' in item || 'medias' in item || 'totalComments' in item || 'totalShares' in item);

const isStoryPayload = (item: any): item is ApiStory =>
  Boolean(item?.id) &&
  ('storyItems' in item || 'expireAt' in item || 'totalViews' in item) &&
  !isPostPayload(item);

const mapSocialContent = (item: unknown, index: number, currentUserId?: string): SocialContentItem | null => {
  const payload = unwrapApiResult<any>(item) ?? item;
  if (!payload || typeof payload !== 'object') return null;

  const nestedCandidates = [
    payload.content,
    payload.post,
    payload.story,
    payload.item,
    payload.data,
    payload.result,
  ].filter((value) => value && value !== payload);

  for (const candidate of nestedCandidates) {
    const mapped = mapSocialContent(candidate, index, currentUserId);
    if (mapped) return mapped;
  }

  if (isPostPayload(payload)) {
    const post = mapPost(payload, index, currentUserId);
    return { id: post.id, kind: 'post', post, raw: payload };
  }

  if (isStoryPayload(payload)) {
    const story = mapStory(payload);
    return { id: story.id, kind: 'story', story, raw: payload };
  }

  return null;
};

const mapContentPage = (payload: unknown, currentUserId?: string): SocialContentItem[] => {
  const page = unwrapApiResult<SpringPage<unknown>>(payload);
  const rawItems = page?.content ?? (Array.isArray(payload) ? payload : []);
  return unwrapList<unknown>(rawItems)
    .map((item, index) => mapSocialContent(item, index, currentUserId))
    .filter((item): item is SocialContentItem => item !== null);
};

export const toggleSaveContent = async (contentId: string, isSaved: boolean): Promise<boolean> => {
  try {
    if (isSaved) {
      await (apiClient.post as any)(mediaPath('/saved'), null, { params: { contentId } });
    } else {
      await (apiClient.delete as any)(mediaPath('/saved'), { params: { contentId } });
    }
    return true;
  } catch {
    return false;
  }
};

export const checkIsSaved = async (contentId: string): Promise<boolean> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath('/saved/check'), { params: { contentId } });
    if (typeof payload === 'boolean') return payload;
    return Boolean(unwrapApiResult<boolean>(payload));
  } catch {
    return false;
  }
};

export const fetchSavedContents = async (
  page = 0,
  size = 20,
  currentUserId?: string,
): Promise<SocialContentItem[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath('/saved'), { params: { page, size, sort: 'savedAt,desc' } });
    return mapContentPage(payload, currentUserId);
  } catch {
    return [];
  }
};

export const recordViewHistory = async (contentId: string): Promise<void> => {
  try {
    await (apiClient.post as any)(mediaPath('/history'), null, { params: { contentId } });
  } catch {
    // View history should never block rendering.
  }
};

export const fetchViewHistory = async (
  page = 0,
  size = 20,
  currentUserId?: string,
): Promise<SocialContentItem[]> => {
  try {
    const payload = await (apiClient.get as any)(mediaPath('/history'), { params: { page, size, sort: 'viewedAt,desc' } });
    return mapContentPage(payload, currentUserId);
  } catch {
    return [];
  }
};

export const clearViewHistory = async (): Promise<boolean> => {
  try {
    await (apiClient.delete as any)(mediaPath('/history'));
    return true;
  } catch {
    return false;
  }
};

export const MediaApi = {
  addComment,
  acceptFriendRequest,
  acceptFriendRequestViaChat,
  blockRelationship,
  blockUserViaChat,
  cancelFriendRequestViaChat,
  cancelRelationship,
  checkIsSaved,
  clearViewHistory,
  createPost,
  createStory,
  deleteComment,
  deletePost,
  deleteStory,
  fetchComments,
  fetchFriends,
  fetchPendingRequests,
  fetchPostById,
  fetchPostReactionDetails,
  fetchPostReactions,
  fetchPosts,
  fetchPostsByUser,
  fetchPostsWithPage,
  fetchRelationshipOf,
  fetchRelationshipStatusViaChat,
  fetchReplies,
  fetchRootComments,
  fetchSavedContents,
  fetchSearchPosts: searchPosts,
  fetchStories,
  fetchStoryGroups,
  fetchStoryViewers,
  fetchSuggestedUsers,
  fetchUserById,
  fetchUserByUsername,
  fetchUserReactions,
  fetchUsers,
  fetchViewHistory,
  findPostsWithAuthorized,
  recordViewHistory,
  rejectFriendRequest,
  rejectFriendRequestViaChat,
  searchPosts,
  sendFriendRequest,
  sendFriendRequestViaChat,
  sharePost,
  toggleSaveContent,
  toggleLike,
  unblockUserViaChat,
  unfriendRelationship,
  unfriendViaChat,
  updatePost,
  updateStory,
  uploadStoryMedia,
  viewStory,
};
