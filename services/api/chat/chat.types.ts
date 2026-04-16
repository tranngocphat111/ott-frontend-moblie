import type {
  ChatConversationWithParticipant,
  ChatMessage,
  ChatParticipant,
} from '@/types/entities/chat';

export interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  content: string | string[];
  type?: ChatMessage['type'];
  size?: number;
  fileName?: string;
  replyToMsgId?: string;
}

export interface ChatPresignedUrlResponse {
  uploadUrl: string;
  fileUrl?: string;
  key?: string;
  fileCategory?: 'image' | 'video' | 'file' | 'audio';
}

export interface ChatMessageContextResponse {
  success: boolean;
  conversationId: string;
  messageId: string;
  beforeCount: number;
  afterCount: number;
  messages: ChatMessage[];
  target?: ChatMessage | null;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
}

export interface ChatForwardMessageResponse {
  success?: boolean;
  message?: string;
  results?: Array<{
    conversationId?: string;
    msgId?: string;
    success?: boolean;
    error?: string;
  }>;
}

export interface ChatServiceUser {
  _id?: string;
  user_id: string;
  name?: string;
  avatar?: string;
  is_online?: boolean;
}

export interface ChatCategory {
  _id: string;
  user_id: string;
  name: string;
  color?: string;
  icon?: string;
  order?: number;
  is_default?: boolean;
}

export interface ChatLinkMessage {
  _id: string;
  msg_id?: string;
  sender_id?: string;
  sender_name?: string;
  createdAt?: string;
  created_at?: string;
  links: string[];
}

export interface ChatSearchContactItem {
  user_id: string;
  name: string;
  avatar?: string;
  phone?: string;
  conversation_ids: string[];
}

export interface ChatSearchConversationItem {
  conversation_id: string;
  type: 'private' | 'group';
  name: string;
  avatar?: string;
  member_count?: number;
  updatedAt?: string;
  last_message?: {
    msg_id?: string;
    sender_id?: string;
    sender_name?: string;
    content?: string;
    type?: string;
    createdAt?: string;
  } | null;
}

export interface ChatSearchMessageItem {
  _id: string;
  msg_id?: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  type: string;
  preview: string;
  createdAt?: string;
}

export interface ChatSearchFileItem {
  _id: string;
  msg_id?: string;
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  key: string;
  file_name: string;
  createdAt?: string;
}

export interface ChatSearchMediaItem {
  _id: string;
  msg_id?: string;
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  key: string;
  media_type: 'image' | 'video' | string;
  createdAt?: string;
}

export interface ChatSearchResult {
  contacts: ChatSearchContactItem[];
  conversations: ChatSearchConversationItem[];
  messages: ChatSearchMessageItem[];
  files: ChatSearchFileItem[];
  media: ChatSearchMediaItem[];
  total: number;
}

export interface ChatSearchOptions {
  limit?: number;
  senderId?: string;
}

export type ChatParticipantMutationResult = ChatParticipant;
