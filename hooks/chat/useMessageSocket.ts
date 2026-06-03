import { useEffect } from 'react';
import { chatSocket } from '@/services/api';
import type { ChatMessage } from '@/types/entities/chat';
import { normalizeChatMessage } from '@/utils/chatModeration';

interface UseMessageSocketProps {
  conversationId: string | undefined;
  userIdForChat: string | undefined;
  onIncomingMessage: (payload: ChatMessage) => void;
  onReactionChanged: (payload: ChatMessage) => void;
  onMessagePinned: (payload: ChatMessage) => void;
  onMessageRevoked: (payload: ChatMessage) => void;
  onMessageDeleted: (payload: ChatMessage) => void;
  onMessageUpdated: (payload: ChatMessage) => void;
  onTypingStart?: (payload: { conversationId?: string; userId?: string }) => void;
  onTypingStop?: (payload: { conversationId?: string; userId?: string }) => void;
  onRemovedFromGroup?: (payload: any) => void;
  onBlockedFromGroup?: (payload: any) => void;
  onGroupDissolved?: (payload: any) => void;
  onConversationSynced?: (payload: any) => void;
  onGroupUpdated?: (payload: any) => void;
  onGroupCallUpdated?: (payload: any) => void;
  onParticipantCursorChanged?: (payload: any) => void;
  onConversationReadSynced?: (payload: any) => void;
}

export function useMessageSocket({
  conversationId,
  userIdForChat,
  onIncomingMessage,
  onReactionChanged,
  onMessagePinned,
  onMessageRevoked,
  onMessageDeleted,
  onMessageUpdated,
  onTypingStart,
  onTypingStop,
  onRemovedFromGroup,
  onBlockedFromGroup,
  onGroupDissolved,
  onConversationSynced,
  onGroupUpdated,
  onGroupCallUpdated,
  onParticipantCursorChanged,
  onConversationReadSynced
}: UseMessageSocketProps) {
  useEffect(() => {
    if (!conversationId || !userIdForChat) return;

    const normalizeMessageHandler =
      (handler: (payload: ChatMessage) => void) =>
      (payload: ChatMessage) =>
        handler(normalizeChatMessage(payload));

    chatSocket.connect();
    chatSocket.joinUserRoom(userIdForChat);
    chatSocket.joinConversation(conversationId);

    const handleIncomingMessage = normalizeMessageHandler(onIncomingMessage);
    const handleReactionChanged = normalizeMessageHandler(onReactionChanged);
    const handleMessagePinned = normalizeMessageHandler(onMessagePinned);
    const handleMessageRevoked = normalizeMessageHandler(onMessageRevoked);
    const handleMessageDeleted = normalizeMessageHandler(onMessageDeleted);
    const handleMessageUpdated = normalizeMessageHandler(onMessageUpdated);

    chatSocket.on('tin_nhan', handleIncomingMessage);
    chatSocket.on('tin_nhan_reaction', handleReactionChanged);
    chatSocket.on('tin_nhan_pin', handleMessagePinned);
    chatSocket.on('tin_nhan_thu_hoi', handleMessageRevoked);
    chatSocket.on('tin_nhan_da_xoa', handleMessageDeleted);
    chatSocket.on('tin_nhan_cap_nhat', handleMessageUpdated);

    if (onTypingStart) {
      chatSocket.on('nguoi_dung_dang_soan_tin_nhan', onTypingStart as any);
    }

    if (onTypingStop) {
      chatSocket.on('nguoi_dung_ngung_soan_tin_nhan', onTypingStop as any);
    }

    if (onRemovedFromGroup) {
      chatSocket.on('bi_xoa_khoi_nhom', onRemovedFromGroup as any);
    }
    
    if (onBlockedFromGroup) {
      chatSocket.on('bi_chan_khoi_nhom', onBlockedFromGroup as any);
    }

    if (onGroupDissolved) {
      chatSocket.on('giai_tan_nhom', onGroupDissolved as any);
    }

    if (onConversationSynced) {
      chatSocket.on('tao_phong_moi', onConversationSynced as any);
    }

    if (onGroupUpdated) {
      chatSocket.on('cap_nhat_nhom', onGroupUpdated as any);
    }

    if (onGroupCallUpdated) {
      chatSocket.on('cap_nhat_trang_thai_goi_nhom', onGroupCallUpdated as any);
    }

    if (onParticipantCursorChanged) {
      chatSocket.on('participant_cursor_changed', onParticipantCursorChanged as any);
    }

    if (onConversationReadSynced) {
      chatSocket.on('conversation_read_synced', onConversationReadSynced as any);
    }

    return () => {
      chatSocket.leaveConversation(conversationId);

      chatSocket.off('tin_nhan', handleIncomingMessage);
      chatSocket.off('tin_nhan_reaction', handleReactionChanged);
      chatSocket.off('tin_nhan_pin', handleMessagePinned);
      chatSocket.off('tin_nhan_thu_hoi', handleMessageRevoked);
      chatSocket.off('tin_nhan_da_xoa', handleMessageDeleted);
      chatSocket.off('tin_nhan_cap_nhat', handleMessageUpdated);

      if (onTypingStart) {
        chatSocket.off('nguoi_dung_dang_soan_tin_nhan', onTypingStart as any);
      }

      if (onTypingStop) {
        chatSocket.off('nguoi_dung_ngung_soan_tin_nhan', onTypingStop as any);
      }

      if (onRemovedFromGroup) {
        chatSocket.off('bi_xoa_khoi_nhom', onRemovedFromGroup as any);
      }
      
      if (onBlockedFromGroup) {
        chatSocket.off('bi_chan_khoi_nhom', onBlockedFromGroup as any);
      }

      if (onGroupDissolved) {
        chatSocket.off('giai_tan_nhom', onGroupDissolved as any);
      }

      if (onConversationSynced) {
        chatSocket.off('tao_phong_moi', onConversationSynced as any);
      }

      if (onGroupUpdated) {
        chatSocket.off('cap_nhat_nhom', onGroupUpdated as any);
      }

      if (onGroupCallUpdated) {
        chatSocket.off('cap_nhat_trang_thai_goi_nhom', onGroupCallUpdated as any);
      }

      if (onParticipantCursorChanged) {
        chatSocket.off('participant_cursor_changed', onParticipantCursorChanged as any);
      }

      if (onConversationReadSynced) {
        chatSocket.off('conversation_read_synced', onConversationReadSynced as any);
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
    onMessageUpdated,
    onTypingStart,
    onTypingStop,
    onRemovedFromGroup,
    onBlockedFromGroup,
    onGroupDissolved,
    onConversationSynced,
    onGroupUpdated,
    onGroupCallUpdated,
    onParticipantCursorChanged,
    onConversationReadSynced
  ]);
}
