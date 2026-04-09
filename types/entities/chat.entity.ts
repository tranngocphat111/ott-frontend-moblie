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

export interface ChatParticipantSettings {
  category_id?: string | null;
  is_pinned: boolean;
  pinned_at?: string | null;
  notification_status: 'on' | 'mute' | 'off';
  mute_until?: string | null;
}

export interface ChatParticipant {
  _id: string;
  user_id: string;
  conversation_id: string;
  settings: ChatParticipantSettings;
  last_read_message_id: string;
  last_read_at: string;
  deleted_msg_id: string;
  unread_count?: number;
  nickname?: string;
  joined_at: string;
  roles: 'admin' | 'user';
}

export interface ChatConversationParticipant {
  _id: string;
  user_id?: string;
  display_name: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  role?: 'admin' | 'member' | 'owner';
  joined_at?: string;
}

export interface ChatConversation {
  _id: string;
  type: 'private' | 'group';
  name: string;
  avatar: string;
  created_by: string;
  member_count: number;
  last_message?: {
    msg_id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    type: 'text' | 'link' | 'image' | 'video' | 'file' | 'audio';
    createdAt: string;
  };
  is_deleted: boolean;
  is_self_conversation?: boolean;
  self_owner_id?: string | null;
  background: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  participants?: ChatConversationParticipant[];
}

export interface ChatConversationWithParticipant {
  conversation: ChatConversation;
  participant: ChatParticipant;
}

export interface ChatMessagesResponse {
  success: boolean;
  conversationId: string;
  messageCount: number;
  source?: string;
  messages: ChatMessage[];
}

export interface ChatOlderMessagesResponse {
  success: boolean;
  conversationId: string;
  messageCount: number;
  hasMore: boolean;
  messages: ChatMessage[];
}
