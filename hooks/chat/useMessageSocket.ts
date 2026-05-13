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
  onMessageUpdated: (payload: ChatMessage) => void;
  onTypingStart?: (payload: { conversationId?: string; userId?: string }) => void;
  onTypingStop?: (payload: { conversationId?: string; userId?: string }) => void;
  onRemovedFromGroup?: (payload: any) => void;
  onBlockedFromGroup?: (payload: any) => void;
  onGroupDissolved?: (payload: any) => void;
  onConversationSynced?: (payload: any) => void;
  onGroupUpdated?: (payload: any) => void;
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
  onGroupUpdated
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
    chatSocket.on('tin_nhan_cap_nhat', onMessageUpdated);

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

    return () => {
      chatSocket.leaveConversation(conversationId);

      chatSocket.off('tin_nhan', onIncomingMessage);
      chatSocket.off('tin_nhan_reaction', onReactionChanged);
      chatSocket.off('tin_nhan_pin', onMessagePinned);
      chatSocket.off('tin_nhan_thu_hoi', onMessageRevoked);
      chatSocket.off('tin_nhan_da_xoa', onMessageDeleted);
      chatSocket.off('tin_nhan_cap_nhat', onMessageUpdated);

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
    onGroupUpdated
  ]);
}
