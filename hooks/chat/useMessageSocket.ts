import { useEffect } from 'react';
import { chatSocket } from '@/services/api';
import type { ChatMessage } from '@/types/entities/chat';

interface UseMessageSocketProps {
  conversationId: string | undefined;
  userIdForChat: string | undefined;
  onIncomingMessage: (payload: ChatMessage) => void;
  onReactionChanged: (payload: ChatMessage) => void;
  onMessagePinned: (payload: ChatMessage) => void;
  onMessageRevoked: (payload: ChatMessage) => void;
  onMessageDeleted: (payload: ChatMessage) => void;
  onTypingStart?: (payload: { conversationId?: string; userId?: string }) => void;
  onTypingStop?: (payload: { conversationId?: string; userId?: string }) => void;
}

export function useMessageSocket({
  conversationId,
  userIdForChat,
  onIncomingMessage,
  onReactionChanged,
  onMessagePinned,
  onMessageRevoked,
  onMessageDeleted,
  onTypingStart,
  onTypingStop,
}: UseMessageSocketProps) {
  useEffect(() => {
    if (!conversationId || !userIdForChat) return;

    chatSocket.connect();
    chatSocket.joinUserRoom(userIdForChat);
    chatSocket.joinConversation(conversationId);

    chatSocket.on('tin_nhan', onIncomingMessage);
    chatSocket.on('tin_nhan_reaction', onReactionChanged);
    chatSocket.on('tin_nhan_pin', onMessagePinned);
    chatSocket.on('tin_nhan_thu_hoi', onMessageRevoked);
    chatSocket.on('tin_nhan_da_xoa', onMessageDeleted);

    if (onTypingStart) {
      chatSocket.on('nguoi_dung_dang_soan_tin_nhan', onTypingStart as any);
    }

    if (onTypingStop) {
      chatSocket.on('nguoi_dung_ngung_soan_tin_nhan', onTypingStop as any);
    }

    return () => {
      chatSocket.off('tin_nhan', onIncomingMessage);
      chatSocket.off('tin_nhan_reaction', onReactionChanged);
      chatSocket.off('tin_nhan_pin', onMessagePinned);
      chatSocket.off('tin_nhan_thu_hoi', onMessageRevoked);
      chatSocket.off('tin_nhan_da_xoa', onMessageDeleted);

      if (onTypingStart) {
        chatSocket.off('nguoi_dung_dang_soan_tin_nhan', onTypingStart as any);
      }

      if (onTypingStop) {
        chatSocket.off('nguoi_dung_ngung_soan_tin_nhan', onTypingStop as any);
      }
    };
  }, [
    conversationId,
    userIdForChat,
    onIncomingMessage,
    onReactionChanged,
    onMessagePinned,
    onMessageRevoked,
    onMessageDeleted,
    onTypingStart,
    onTypingStop,
  ]);
}
