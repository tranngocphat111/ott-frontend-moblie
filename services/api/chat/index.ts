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
  ChatPresignedUrlResponse,
  ChatCategory,
  ChatLinkMessage,
  ChatMessageContextResponse,
  ChatSearchContactItem,
  ChatSearchConversationItem,
  ChatSearchFileItem,
  ChatSearchMediaItem,
  ChatSearchMessageItem,
  ChatSearchOptions,
  ChatSearchResult,
  ChatServiceUser,
  SendMessagePayload,
} from './chat.types';
