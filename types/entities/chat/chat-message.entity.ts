export interface ChatMessageContent {
  type: 'text' | 'link' | 'image' | 'file' | 'video' | 'audio';
  text?: string;
  url?: string;
  name?: string;
  size?: number;
}

export interface ChatMessageReaction {
  user_id: string;
  type: string;
}

export interface ChatMessageReplyPreview {
  msg_id?: string;
  sender_id: string;
  sender_name?: string;
  type: 'text' | 'link' | 'image' | 'video' | 'file' | 'audio' | 'system_add';
  content: string;
  raw_content?: string;
  file_name?: string;
  url?: string;
  media_urls?: string[];
  media_count?: number;
  is_deleted?: boolean;
  is_revoked?: boolean;
}

export interface ChatMessage {
  _id: string;
  msg_id?: string;
  content: Array<string | ChatMessageContent>;
  type: 'text' | 'link' | 'image' | 'file' | 'video' | 'audio' | 'system_add';
  created_at: string;
  createdAt?: string;
  sender_id: string;
  conversation_id?: string;
  size?: number;
  sender_name?: string;
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
}
