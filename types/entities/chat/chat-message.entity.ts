export interface ChatMessageContent {
  type: 'text' | 'link' | 'image' | 'file' | 'video' | 'audio';
  text?: string;
  url?: string;
  name?: string;
  size?: number;
}

export type ChatSystemMessageType = `system_${string}`;
export type ChatCallMessageType =
  | 'call_start'
  | 'call_join'
  | 'call_end'
  | 'call_missed'
  | 'call_cancel'
  | 'call_no_answer';

export type ChatMessageType =
  | 'text'
  | 'link'
  | 'image'
  | 'file'
  | 'video'
  | 'audio'
  | 'poll'
  | 'system_poll'
  | ChatCallMessageType
  | ChatSystemMessageType;

export interface ChatMessageReaction {
  user_id: string;
  type: string;
}

export type ChatModerationStatus = 'pending' | 'approved' | 'rejected' | string;
export type ChatMediaPolicyStatus = 'pending' | 'clean' | 'flagged' | string;

export interface ChatMessageMediaWarning {
  index?: number;
  key?: string;
  source?: string;
  reason?: string;
  severity?: string;
  violation_id?: string;
  request_id?: string;
  detected_at?: string;
}

export interface ChatMessageSystemMeta {
  action?: 'group_dissolved' | 'removed_from_group' | 'member_removed' | string;
  dissolved_by?: string;
  removed_user_id?: string;
  removed_by?: string;
  added_by?: string;
  added_user_ids?: string[];
  show_delete_for_non_owner?: boolean;
  show_delete_action?: boolean;
  moderation_status?: ChatModerationStatus;
  moderation_violation_id?: string;
  moderation_request_id?: string;
  moderation_severity?: string;
  moderation_violation_type?: string;
  moderation_matched_labels?: string[];
  moderation_reason?: string | null;
  moderation_detected_at?: string;
  media_policy_status?: ChatMediaPolicyStatus;
  media_warnings?: ChatMessageMediaWarning[];
}

export interface ChatMessageReplyPreview {
  msg_id?: string;
  sender_id: string;
  sender_name?: string;
  type: ChatMessageType;
  content: string;
  raw_content?: string;
  file_name?: string;
  url?: string;
  media_urls?: string[];
  media_count?: number;
  is_deleted?: boolean;
  is_revoked?: boolean;
  poll_question?: string | null;
  poll_options?: any[];
  poll_multiple_choice?: boolean;
}

export interface ChatMessage {
  _id: string;
  msg_id?: string;
  content: Array<string | ChatMessageContent>;
  type: ChatMessageType;
  created_at: string;
  createdAt?: string;
  sender_id: string;
  conversation_id?: string;
  size?: number;
  sender_name?: string;
  sender_avatar?: string;
  reply_to_msg_id?: string | null;
  reply_to?: ChatMessageReplyPreview | null;
  reactions?: ChatMessageReaction[];
  attachments?: Array<{
    id: string;
    type: 'image' | 'file' | 'video' | 'audio' | 'link';
    url: string;
    name: string;
    size?: number;
  }>;
  is_deleted?: boolean;
  is_revoked?: boolean;
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by?: string | null;
  system_meta?: ChatMessageSystemMeta | null;
  poll_question?: string | null;
  poll_multiple_choice?: boolean;
  poll_options?: Array<{ id: string; name: string; voters: string[] }>;
  poll_locked?: boolean;
  local_temp_id?: string;
  local_status?: 'uploading' | 'pending' | 'success' | 'error';
  local_upload_progress?: number;
  local_error?: string;
}
