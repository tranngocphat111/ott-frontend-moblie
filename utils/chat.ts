import type { ChatConversation, ChatMessage } from '@/types';
import { MEDIA_CONFIG } from '@/configuration/api';

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
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const base = String(MEDIA_CONFIG.BASE_URL || '').replace(/\/$/, '');
  const suffix = String(value).replace(/^\//, '');

  if (!base) return `/${suffix}`;

  return `${base}/${suffix}`;
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

  return String(rawValue || '').trim() || 'Tin nhắn';
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

  if (dayDiff <= 0) return timePart;
  if (dayDiff === 1) return `${timePart} Hôm qua`;
  if (dayDiff > 2) {
    const fullDate = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${timePart} ${fullDate}`;
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

const normalizeId = (value?: string | null) => String(value || '').trim();

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

  if (conversation.avatar) return conversation.avatar;

  const otherParticipant = conversation.participants?.find(
    (participant) => normalizeId(participant.user_id) !== normalizeId(currentUserId || ''),
  );

  return otherParticipant?.avatar || '';
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
  if (fallbackAvatar) return fallbackAvatar;
  if (!conversation || !senderId) return '';

  if (conversation.type === 'private') {
    return getConversationAvatar(conversation, currentUserId);
  }

  return findParticipantByUserId(conversation, senderId)?.avatar || '';
};
