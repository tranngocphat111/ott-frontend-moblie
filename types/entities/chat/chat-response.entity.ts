import type { ChatConversation } from './chat-conversation.entity';
import type { ChatMessage } from './chat-message.entity';
import type { ChatParticipant } from './chat-participant.entity';

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
