import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/Authcontext';
import { chatSocket, type CallType } from '@/services/socket/chatSocket';
import { ChatApi } from '@/services/api';
import { getConversationAvatar, getConversationTitle } from '@/utils/chat';

type IncomingCallPayload = {
  conversationId: string;
  callId?: string;
  callerId: string;
  callType: CallType;
  isGroup?: boolean;
};

type IncomingCallDisplay = {
  name: string;
  avatar: string;
};

export const IncomingCallGate: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, chatUserId } = useAuth();
  const userId = chatUserId || user?.id || '';
  const activeCallKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    chatSocket.connect();
    chatSocket.joinUserRoom(userId);

    const loadIncomingCallDisplay = async (
      payload: IncomingCallPayload,
    ): Promise<IncomingCallDisplay> => {
      try {
        const conversation = await ChatApi.getConversationById(payload.conversationId);
        return {
          name: getConversationTitle(conversation, userId),
          avatar: getConversationAvatar(conversation, userId),
        };
      } catch {
        return {
          name: payload.isGroup ? 'Cuộc gọi nhóm' : 'Cuộc gọi',
          avatar: '',
        };
      }
    };

    const acceptCall = (payload: IncomingCallPayload, display: IncomingCallDisplay) => {
      activeCallKeyRef.current = null;
      router.push({
        pathname: '/(main)/call',
        params: {
          conversationId: payload.conversationId,
          callId: payload.callId || '',
          type: payload.callType,
          action: 'join',
          isGroup: payload.isGroup ? 'true' : 'false',
          name: display.name,
          avatar: display.avatar,
        },
      } as any);
    };

    const declineCall = (payload: IncomingCallPayload) => {
      activeCallKeyRef.current = null;
      chatSocket.declineCall(
        payload.conversationId,
        userId,
        payload.callerId,
        payload.callId,
      );
    };

    const onIncomingCall = async (payload: IncomingCallPayload) => {
      if (!payload?.conversationId || String(payload.callerId) === String(userId)) return;
      if (pathname?.includes('/call')) return;

      const key = payload.callId || payload.conversationId;
      if (activeCallKeyRef.current === key) return;
      activeCallKeyRef.current = key;

      const display = await loadIncomingCallDisplay(payload);
      if (activeCallKeyRef.current !== key) return;

      Alert.alert(
        payload.isGroup
          ? payload.callType === 'video'
            ? 'Cuộc gọi video nhóm'
            : 'Cuộc gọi thoại nhóm'
          : payload.callType === 'video'
            ? 'Cuộc gọi video'
            : 'Cuộc gọi thoại',
        `${display.name} đang gọi cho bạn.`,
        [
          {
            text: 'Từ chối',
            style: 'destructive',
            onPress: () => declineCall(payload),
          },
          {
            text: 'Chấp nhận',
            onPress: () => acceptCall(payload, display),
          },
        ],
        {
          cancelable: false,
        },
      );
    };

    const clearIncoming = (payload: { conversationId: string; callId?: string }) => {
      const key = payload.callId || payload.conversationId;
      if (activeCallKeyRef.current === key) {
        activeCallKeyRef.current = null;
      }
    };

    chatSocket.on('cuoc_goi_den', onIncomingCall as any);
    chatSocket.on('ket_thuc_phong_goi', clearIncoming as any);
    chatSocket.on('nguoi_dung_tu_choi_goi', clearIncoming as any);

    return () => {
      chatSocket.off('cuoc_goi_den', onIncomingCall as any);
      chatSocket.off('ket_thuc_phong_goi', clearIncoming as any);
      chatSocket.off('nguoi_dung_tu_choi_goi', clearIncoming as any);
    };
  }, [pathname, router, userId]);

  return null;
};
