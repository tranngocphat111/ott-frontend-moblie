import type {
  ChatConversationWithParticipant,
  ChatMessage,
  ChatParticipant,
} from '@/types/entities/chat';

export interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  content: string | string[];
  type?: 'text' | 'link' | 'image' | 'file' | 'video' | 'audio' | 'system_add';
  size?: number;
  fileName?: string;
  replyToMsgId?: string;
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

export interface ChatSearchResult {
  conversations?: ChatConversationWithParticipant[];
  messages?: ChatMessage[];
  files?: ChatMessage[];
  media?: ChatMessage[];
  links?: ChatLinkMessage[];
  users?: ChatServiceUser[];
}

export type ChatParticipantMutationResult = ChatParticipant;
