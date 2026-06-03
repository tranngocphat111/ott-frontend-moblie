import type {
  ChatMessage,
  ChatMessageMediaWarning,
  ChatMessageSystemMeta,
} from '@/types/entities/chat';

const NON_BLOCKING_WARNING_SOURCES = new Set(['rekognition_error']);
const NON_BLOCKING_WARNING_REASONS = new Set([
  'moderation_unavailable',
  'moderation_timeout',
  'moderation_service_error',
]);

const normalizeText = (value: unknown) => String(value || '').trim().toLowerCase();

const pick = <T,>(source: Record<string, unknown>, snakeKey: string, camelKey: string): T | undefined => {
  const snakeValue = source[snakeKey];
  if (snakeValue !== undefined) return snakeValue as T;
  return source[camelKey] as T | undefined;
};

const normalizeWarning = (warning: unknown): ChatMessageMediaWarning => {
  if (!warning || typeof warning !== 'object') return {};

  const raw = warning as Record<string, unknown>;
  return {
    index: typeof raw.index === 'number' ? raw.index : Number(raw.index ?? 0),
    key: String(raw.key || ''),
    source: String(raw.source || ''),
    reason: String(raw.reason || ''),
    severity: String(raw.severity || ''),
    violation_id: String(pick(raw, 'violation_id', 'violationId') || ''),
    request_id: String(pick(raw, 'request_id', 'requestId') || ''),
    detected_at: String(pick(raw, 'detected_at', 'detectedAt') || ''),
  };
};

export const normalizeMessageSystemMeta = (value: unknown): ChatMessageSystemMeta | null => {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;
  const matchedLabels = pick<unknown>(raw, 'moderation_matched_labels', 'moderationMatchedLabels');
  const mediaWarnings = pick<unknown>(raw, 'media_warnings', 'mediaWarnings');

  return {
    ...(raw as ChatMessageSystemMeta),
    action: String(raw.action || ''),
    dissolved_by: String(pick(raw, 'dissolved_by', 'dissolvedBy') || ''),
    removed_user_id: String(pick(raw, 'removed_user_id', 'removedUserId') || ''),
    removed_by: String(pick(raw, 'removed_by', 'removedBy') || ''),
    added_by: String(pick(raw, 'added_by', 'addedBy') || ''),
    added_user_ids: Array.isArray(pick(raw, 'added_user_ids', 'addedUserIds'))
      ? (pick<string[]>(raw, 'added_user_ids', 'addedUserIds') || [])
      : undefined,
    show_delete_for_non_owner: Boolean(pick(raw, 'show_delete_for_non_owner', 'showDeleteForNonOwner')),
    show_delete_action: Boolean(pick(raw, 'show_delete_action', 'showDeleteAction')),
    moderation_status: String(pick(raw, 'moderation_status', 'moderationStatus') || ''),
    moderation_violation_id: String(pick(raw, 'moderation_violation_id', 'moderationViolationId') || ''),
    moderation_request_id: String(pick(raw, 'moderation_request_id', 'moderationRequestId') || ''),
    moderation_severity: String(pick(raw, 'moderation_severity', 'moderationSeverity') || ''),
    moderation_violation_type: String(pick(raw, 'moderation_violation_type', 'moderationViolationType') || ''),
    moderation_matched_labels: Array.isArray(matchedLabels) ? matchedLabels.map(String) : [],
    moderation_reason: (pick(raw, 'moderation_reason', 'moderationReason') as string | null | undefined) ?? null,
    moderation_detected_at: String(pick(raw, 'moderation_detected_at', 'moderationDetectedAt') || ''),
    media_policy_status: String(pick(raw, 'media_policy_status', 'mediaPolicyStatus') || ''),
    media_warnings: Array.isArray(mediaWarnings) ? mediaWarnings.map(normalizeWarning) : [],
  };
};

export const normalizeChatMessage = <T extends ChatMessage | null | undefined>(message: T): T => {
  if (!message || typeof message !== 'object') return message;

  const raw = message as ChatMessage & Record<string, unknown>;
  const rawSystemMeta = raw.system_meta ?? raw.systemMeta;

  const normalized = {
    ...raw,
  } as ChatMessage & Record<string, unknown>;

  if ('system_meta' in raw || 'systemMeta' in raw) {
    normalized.system_meta = normalizeMessageSystemMeta(rawSystemMeta);
  }

  if (raw.conversation_id !== undefined || raw.conversationId !== undefined) {
    normalized.conversation_id = String(raw.conversation_id || raw.conversationId || '');
  }
  if (raw.sender_id !== undefined || raw.senderId !== undefined) {
    normalized.sender_id = String(raw.sender_id || raw.senderId || '');
  }
  if (raw.sender_name !== undefined || raw.senderName !== undefined) {
    normalized.sender_name = String(raw.sender_name || raw.senderName || '');
  }
  if (raw.sender_avatar !== undefined || raw.senderAvatar !== undefined) {
    normalized.sender_avatar = String(raw.sender_avatar || raw.senderAvatar || '');
  }
  if (raw.reply_to_msg_id !== undefined || raw.replyToMsgId !== undefined) {
    normalized.reply_to_msg_id = (raw.reply_to_msg_id ?? raw.replyToMsgId) as string | null | undefined;
  }
  if (raw.local_temp_id !== undefined || raw.localTempId !== undefined) {
    normalized.local_temp_id = String(raw.local_temp_id || raw.localTempId || '');
  }

  return normalized as T;
};

export const normalizeChatMessages = (messages: ChatMessage[]) =>
  messages.map((message) => normalizeChatMessage(message));

export const isBlockingMediaWarning = (warning?: ChatMessageMediaWarning | null) => {
  if (!warning) return false;

  const source = normalizeText(warning.source);
  const reason = normalizeText(warning.reason);

  if (NON_BLOCKING_WARNING_SOURCES.has(source)) return false;
  if (NON_BLOCKING_WARNING_REASONS.has(reason)) return false;

  return true;
};

export const isMessageMediaFlagged = (message: ChatMessage, index = 0) => {
  const warnings = message.system_meta?.media_warnings || [];
  const matchingWarnings = warnings.filter((warning) => Number(warning.index ?? 0) === index);

  if (matchingWarnings.length > 0) {
    return matchingWarnings.some(isBlockingMediaWarning);
  }

  return (
    warnings.length === 0 &&
    normalizeText(message.system_meta?.media_policy_status) === 'flagged'
  );
};

export const isModerationRejected = (message: ChatMessage) =>
  normalizeText(message.system_meta?.moderation_status) === 'rejected';

const normalizeMessageId = (value: unknown) => String(value || '').trim();

const getMessagePatchIds = (message: ChatMessage) => ({
  msgId: normalizeMessageId(message?.msg_id),
  dbId: normalizeMessageId(message?._id),
  localId: normalizeMessageId(message?.local_temp_id),
});

const hasSameMessageIdentity = (left: ChatMessage, right: ChatMessage) => {
  const leftIds = getMessagePatchIds(left);
  const rightIds = getMessagePatchIds(right);

  return (
    (rightIds.msgId && leftIds.msgId === rightIds.msgId) ||
    (rightIds.dbId && leftIds.dbId === rightIds.dbId) ||
    (rightIds.msgId && leftIds.dbId === rightIds.msgId) ||
    (rightIds.dbId && leftIds.msgId === rightIds.dbId) ||
    (rightIds.localId && leftIds.localId === rightIds.localId)
  );
};

const isSameMessagePayload = (left: ChatMessage, right: ChatMessage) =>
  JSON.stringify(left) === JSON.stringify(right);

export const patchChatMessageList = (
  source: ChatMessage[],
  incomingPayload: ChatMessage,
  options?: { remove?: boolean },
  normalizeMessages?: (messages: ChatMessage[]) => ChatMessage[],
) => {
  const incoming = normalizeChatMessage(incomingPayload);
  const ids = getMessagePatchIds(incoming);
  if (!ids.msgId && !ids.dbId && !ids.localId) return source;

  const idx = source.findIndex((item) => hasSameMessageIdentity(item, incoming));

  if (options?.remove) {
    if (idx < 0) return source;
    const next = source.slice();
    next.splice(idx, 1);
    return normalizeMessages ? normalizeMessages(next) : next;
  }

  if (idx >= 0) {
    const hasIncomingSystemMeta = Object.prototype.hasOwnProperty.call(incoming, 'system_meta');
    const hasSourceSystemMeta = Object.prototype.hasOwnProperty.call(source[idx], 'system_meta');
    const mergedSystemMeta = hasIncomingSystemMeta
      ? incoming.system_meta === null
        ? null
        : normalizeMessageSystemMeta({
            ...(source[idx].system_meta || {}),
            ...(incoming.system_meta || {}),
          })
      : source[idx].system_meta;

    const mergedPayload: ChatMessage = {
      ...source[idx],
      ...incoming,
      local_temp_id: source[idx].local_temp_id || incoming.local_temp_id,
    };

    if (hasIncomingSystemMeta || hasSourceSystemMeta) {
      mergedPayload.system_meta = mergedSystemMeta;
    }

    const merged = normalizeChatMessage(mergedPayload);

    if (isSameMessagePayload(source[idx], merged)) return source;

    const next = source.slice();
    next[idx] = merged;
    return normalizeMessages ? normalizeMessages(next) : next;
  }

  const next = [...source, incoming];
  return normalizeMessages ? normalizeMessages(next) : next;
};
