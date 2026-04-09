import { chatConversationApi } from './chat-conversation.api';
import { chatMessageApi } from './chat-message.api';
import { chatParticipantApi } from './chat-participant.api';
import { chatUserApi } from './chat-user.api';

export const ChatApi = {
  ...chatUserApi,
  ...chatConversationApi,
  ...chatParticipantApi,
  ...chatMessageApi,
};

export type {
  ChatCategory,
  ChatLinkMessage,
  ChatMessageContextResponse,
  ChatSearchResult,
  ChatServiceUser,
  SendMessagePayload,
} from './chat.types';
