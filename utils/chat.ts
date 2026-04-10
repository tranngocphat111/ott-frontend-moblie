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

export const getConversationAvatar = (
  conversation?: ChatConversation | null,
  currentUserId?: string | null,
) => {
  if (!conversation) return '';

  if (conversation.avatar) return conversation.avatar;

  const otherParticipant = conversation.participants?.find(
    (participant) => String(participant.user_id || '') !== String(currentUserId || ''),
  );

  return otherParticipant?.avatar || '';
};
