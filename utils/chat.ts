import type { ChatConversation, ChatMessage } from '@/types';
import { MEDIA_CONFIG } from '@/configuration/api';

const CUSTOM_SHORTCODE_TO_EMOJI_MAP: Record<string, string> = {
  ':D': '😃',
  '<3': '❤️',
  ':)': '🙂',
  ':(': '☹️',
  ';)': '😉',
  ':P': '😛',
  ':O': '😲',
  ':*': '😘',
  '8)': '😎',
  '>:(': '😠',
  ':/': '😕',
  ":'(": '😭',
  '-_-': '😑',
  'O:)': '😇',
  '3:)': '😈',
  'o.O': '🧐',
  '(y)': '👍',
  '(n)': '👎',
  '(^^^)': '🦈',
  '<(")': '🐧',
};

const CUSTOM_SHORTCODES_SORTED_BY_LENGTH = Object.keys(CUSTOM_SHORTCODE_TO_EMOJI_MAP).sort(
  (a, b) => b.length - a.length,
);

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const convertDisplayShortcodeToEmoji = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return String(text || '');
  }

  let normalized = text;

  for (const shortcode of CUSTOM_SHORTCODES_SORTED_BY_LENGTH) {
    const escapedShortcode = escapeRegExp(shortcode);
    const pattern = new RegExp(`(^|\\s)(${escapedShortcode})(?=\\s|$)`, 'g');

    normalized = normalized.replace(pattern, (_match, leadingWhitespace: string) => {
      return `${leadingWhitespace}${CUSTOM_SHORTCODE_TO_EMOJI_MAP[shortcode]}`;
    });
  }

  return normalized;
};

const getFilenameFromValue = (value: string) => {
  const cleanValue = String(value || '').trim();
  if (!cleanValue) return '';

  try {
    const url = new URL(cleanValue);
    const candidate = url.pathname.split('/').pop() || '';
    return decodeURIComponent(candidate.split('?')[0] || candidate);
  } catch {
    const candidate = cleanValue.split('/').pop() || cleanValue;
    return decodeURIComponent(candidate.split('?')[0] || candidate);
  }
};

export const resolveMediaUrl = (value?: string | null) => {
  if (!value || value === 'SPECIAL_AVATAR_SELF') return value || '';
  if (/^https?:\/\//i.test(value)) return encodeURI(value);
  if (/^(file:|content:|ph:|assets-library:|blob:|data:)/i.test(value)) return value;

  const base = String(MEDIA_CONFIG.BASE_URL || '').replace(/\/$/, '');
  const suffix = String(value).replace(/^\//, '');

  const [rawPath, rawQuery = ''] = suffix.split('?');
  const encodedPath = rawPath
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
  const encodedSuffix = rawQuery ? `${encodedPath}?${rawQuery}` : encodedPath;

  if (!base) return `/${encodedSuffix}`;

  return `${base}/${encodedSuffix}`;
};

type ImageQualityPreset = 'avatar' | 'thumbnail' | 'message' | 'preview';

const IMAGE_QUALITY_PRESETS: Record<ImageQualityPreset, { width: number; quality: number }> = {
  avatar: { width: 128, quality: 20 },
  thumbnail: { width: 180, quality: 20 },
  message: { width: 760, quality: 20 },
  preview: { width: 1360, quality: 35 },
};

export const getOptimizedImageUrl = (
  value?: string | null,
  preset: ImageQualityPreset = 'message',
) => {
  const resolved = resolveMediaUrl(value);
  if (!resolved) return '';

  if (/^(blob:|data:|file:|content:|ph:|assets-library:)/i.test(resolved)) {
    return resolved;
  }

  // Avoid mutating signed URLs or URLs that already include transform params.
  if (/X-Amz-Signature=/i.test(resolved) || /[?&](q|quality|w|width|fmt)=/i.test(resolved)) {
    return resolved;
  }

  const { width, quality } = IMAGE_QUALITY_PRESETS[preset];
  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}w=${width}&q=${quality}&fmt=webp`;
};

export const isSystemMessageType = (type?: string | null) =>
  String(type || '').toLowerCase().startsWith('system') ||
  String(type || '').toLowerCase() === 'call_join';

export const isNotificationType = (type?: string | null) => {
  const normalizedType = String(type || '').toLowerCase();
  return normalizedType.startsWith('system') || normalizedType.startsWith('call') || normalizedType.startsWith('poll');
};

export const countVisualItems = (messages: ChatMessage[]) => {
  let count = 0;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Non-system messages always count as 1
    if (!isSystemMessageType(message.type)) {
      count++;
      continue;
    }

    // System messages are clustered. Find the end of this cluster.
    let endIdx = i;
    while (
      endIdx + 1 < messages.length && 
      isSystemMessageType(messages[endIdx + 1].type)
    ) {
      endIdx++;
    }
    
    // The entire cluster (or a single system message) counts as 1 item in the UI
    count++;
    i = endIdx;
  }
  return count;
};

export const isCallMessageType = (type?: string | null) => {
  const normalizedType = String(type || '').toLowerCase();
  return [
    'call_start',
    'call_join',
    'call_end',
    'call_missed',
    'call_cancel',
    'call_no_answer',
  ].includes(normalizedType);
};

export const getMessageBodyText = (message: ChatMessage) => {
  if (message.is_deleted) return 'Tin nhắn đã bị xóa';
  if (message.is_revoked) return 'Tin nhắn đã được thu hồi';

  const firstContent = Array.isArray(message.content)
    ? message.content[0]
    : undefined;

  const rawValue =
    typeof firstContent === 'string'
      ? firstContent
      : firstContent && typeof firstContent === 'object'
        ? firstContent.text || firstContent.url || firstContent.name || ''
        : '';

  if (isSystemMessageType(message.type)) {
    return convertDisplayShortcodeToEmoji(String(rawValue || '').trim()) || 'Thông báo hệ thống';
  }

  if (isCallMessageType(message.type)) {
    const normalizedType = String(message.type || '').toLowerCase();
    const normalizedRaw = String(rawValue || '').toLowerCase();
    const isVideoCall = /video/i.test(normalizedRaw);

    if (normalizedType === 'call_missed' || normalizedType === 'call_cancel' || normalizedType === 'call_no_answer') {
      return `Đã bỏ lỡ cuộc gọi ${isVideoCall ? 'video' : 'thoại'}`;
    }

    if (normalizedType === 'call_end') {
      return `Cuộc gọi ${isVideoCall ? 'video' : 'thoại'} đã kết thúc`;
    }

    return `Cuộc gọi ${isVideoCall ? 'video' : 'thoại'}`;
  }

  if (message.type === 'image') {
    const count = Array.isArray(message.content)
      ? message.content.filter(Boolean).length
      : 0;
    return count > 1 ? `${count} hình ảnh` : '[Hình ảnh]';
  }

  if (message.type === 'video' || message.type === 'audio' || message.type === 'file') {
    const filename = getFilenameFromValue(String(rawValue || ''));
    return filename || (message.type === 'video' ? '[Video]' : message.type === 'audio' ? '[Âm thanh]' : '[Tệp tin]');
  }

  return convertDisplayShortcodeToEmoji(String(rawValue || '').trim()) || 'Tin nhắn';
};

export const formatConversationTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const startOfDay = (date: Date) => {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
};

const getDayDiff = (date: Date, reference = new Date()) => {
  const source = startOfDay(date).getTime();
  const target = startOfDay(reference).getTime();
  return Math.floor((target - source) / (24 * 60 * 60 * 1000));
};

export const formatMessageTimestampLabel = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const timePart = formatConversationTime(value);
  const dayDiff = getDayDiff(date);

  if (dayDiff <= 0) return `Hôm nay, ${timePart}`;
  if (dayDiff === 1) return `Hôm qua, ${timePart}`;
  if (dayDiff < 7) {
    const dayName = date.toLocaleDateString('vi-VN', { weekday: 'long' });
    return `${dayName}, ${timePart}`;
  }

  if (dayDiff >= 7) {
    const fullDate = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${fullDate}, ${timePart}`;
  }

  return timePart;
};

export const formatMessageDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const shouldShowTimestamp = (
  currentTime?: string | null,
  previousTime?: string | null,
) => {
  if (!currentTime) return false;
  if (!previousTime) return true;

  const current = new Date(currentTime).getTime();
  const previous = new Date(previousTime).getTime();

  if (Number.isNaN(current) || Number.isNaN(previous)) return true;

  return Math.abs(current - previous) > 5 * 60 * 1000;
};

export const shouldShowTimestampAtClusterEnd = (
  currentTime?: string | null,
  nextTime?: string | null,
) => {
  if (!currentTime) return false;
  if (!nextTime) return true;

  const current = new Date(currentTime).getTime();
  const next = new Date(nextTime).getTime();

  if (Number.isNaN(current) || Number.isNaN(next)) return true;

  return Math.abs(next - current) > 5 * 60 * 1000;
};

export const shouldBreakMessageCluster = (
  previousTime?: string | null,
  currentTime?: string | null,
  previousSenderId?: string | null,
  currentSenderId?: string | null,
) => {
  if (!currentTime) return true;
  if (!previousTime) return true;

  if (String(previousSenderId || '') !== String(currentSenderId || '')) {
    return true;
  }

  const previous = new Date(previousTime).getTime();
  const current = new Date(currentTime).getTime();

  if (Number.isNaN(previous) || Number.isNaN(current)) return true;

  return Math.abs(current - previous) > 5 * 60 * 1000;
};

export const getConversationTitle = (
  conversation?: ChatConversation | null,
  currentUserId?: string | null,
) => {
  if (!conversation) return 'Tin nhắn';

  if (conversation.type === 'group') {
    return conversation.name || 'Nhóm trò chuyện';
  }

  const otherParticipant = conversation.participants?.find(
    (participant) => String(participant.user_id || '') !== String(currentUserId || ''),
  );

  return (
    otherParticipant?.display_name ||
    otherParticipant?.nickname ||
    otherParticipant?.name ||
    conversation.name ||
    'Cuộc trò chuyện'
  );
};

export const getAvatarFallbackLabel = (value?: string | null) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '?';

  const tokens = normalized.split(/\s+/).filter(Boolean);
  return (
    tokens
      .slice(0, 2)
      .map((token) => Array.from(token)[0] || '')
      .join('')
      .toUpperCase() || '?'
  );
};

const normalizeId = (value?: string | null) => String(value || '').trim();
const hasUsableMediaValue = (value?: string | null) => {
  const normalized = String(value || '').trim();
  return !!normalized && normalized !== 'null' && normalized !== 'undefined';
};

const findParticipantByUserId = (
  conversation?: ChatConversation | null,
  userId?: string | null,
) => {
  if (!conversation?.participants?.length || !userId) return undefined;

  const normalized = normalizeId(userId);
  return conversation.participants.find((participant) => {
    const participantAny = participant as any;
    const candidateIds = [
      normalizeId(participant.user_id),
      normalizeId(participantAny?.id),
      normalizeId(participantAny?.userId),
      normalizeId(participantAny?._id),
    ];
    return candidateIds.some((candidate) => candidate && candidate === normalized);
  });
};

export const getConversationAvatar = (
  conversation?: ChatConversation | null,
  currentUserId?: string | null,
) => {
  if (!conversation) return '';

  if (conversation.is_self_conversation && !conversation.avatar) {
    return 'SPECIAL_AVATAR_SELF';
  }

  if (hasUsableMediaValue(conversation.avatar)) {
    return resolveMediaUrl(conversation.avatar);
  }

  if (conversation.type === 'group') return '';

  const otherParticipant = conversation.participants?.find(
    (participant) => normalizeId(participant.user_id) !== normalizeId(currentUserId || ''),
  );

  return hasUsableMediaValue(otherParticipant?.avatar)
    ? resolveMediaUrl(otherParticipant?.avatar || '')
    : '';
};

export const getMessageSenderName = (
  message: ChatMessage,
  conversation?: ChatConversation | null,
) => {
  const participant = findParticipantByUserId(conversation, message.sender_id);

  return (
    message.sender_name ||
    participant?.display_name ||
    participant?.nickname ||
    participant?.name ||
    message.sender_id ||
    'Thành viên'
  );
};

export const getMessageSenderAvatar = (
  conversation?: ChatConversation | null,
  senderId?: string | null,
  currentUserId?: string | null,
  fallbackAvatar?: string | null,
) => {
  if (fallbackAvatar) return resolveMediaUrl(fallbackAvatar);
  if (!conversation || !senderId) return '';

  if (conversation.type === 'private') {
    return getConversationAvatar(conversation, currentUserId);
  }

  const avatar = findParticipantByUserId(conversation, senderId)?.avatar;
  return resolveMediaUrl(avatar || '');
};

export const isProbablyVietnamese = (text: string): boolean => {
  if (!text) return true;
  // Các ký tự có dấu trong tiếng Việt
  const vietnameseAccents = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  // Các từ thông dụng không dấu
  const commonVietnameseWords = /\b(la|co|khong|va|toi|anh|chi|em|ban|ong|ba|nay|kia|do|dang|da|se)\b/i;
  
  return vietnameseAccents.test(text) || commonVietnameseWords.test(text);
};
