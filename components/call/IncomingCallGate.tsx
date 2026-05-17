import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/Authcontext';
import { mobileGroupCallSession } from '@/services/call/mobileGroupCallSession';
import { chatSocket, type CallType } from '@/services/socket/chatSocket';
import { ChatApi } from '@/services/api';
import { getAvatarFallbackLabel, getConversationAvatar, getConversationTitle, resolveMediaUrl } from '@/utils/chat';
import { DEFAULT_SYSTEM_BACKGROUND, setSystemBackgroundAsync } from '@/utils/useSystemBackground';

type IncomingCallPayload = {
  conversationId: string;
  callId?: string;
  callerId: string;
  callType: CallType;
  isGroup?: boolean;
  participants?: string[];
  name?: string;
  avatar?: string;
  conversationName?: string;
  conversationAvatar?: string;
  groupName?: string;
  groupAvatar?: string;
  callerName?: string;
  callerAvatar?: string;
  caller?: {
    name?: string;
    display_name?: string;
    avatar?: string;
  };
};

type IncomingCallDisplay = {
  name: string;
  avatar: string;
};

type IncomingCallState = {
  payload: IncomingCallPayload;
  display: IncomingCallDisplay;
};

const IncomingAvatar = ({ name, avatar }: IncomingCallDisplay) => {
  const [broken, setBroken] = useState(false);
  const avatarUrl = resolveMediaUrl(avatar);
  const showAvatar = !!avatarUrl && !broken;

  return (
    <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#d0a97e]/40 bg-[#5b422f]">
      {showAvatar ? (
        <Image
          source={{ uri: avatarUrl }}
          className="h-full w-full"
          resizeMode="cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <Text className="text-3xl font-bold text-white">{getAvatarFallbackLabel(name)}</Text>
      )}
    </View>
  );
};

export const IncomingCallGate: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, chatUserId } = useAuth();
  const userId = chatUserId || user?.id || '';
  const activeCallKeyRef = useRef<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(null);
  const bottomDockPadding = Math.max(insets.bottom + 10, 24);

  const acceptIncomingCall = useCallback((state: IncomingCallState) => {
    const { payload, display } = state;
    activeCallKeyRef.current = null;
    setIncomingCall(null);

    if (payload.isGroup) {
      void mobileGroupCallSession.joinGroupCall({
        conversationId: payload.conversationId,
        callId: payload.callId || '',
        userId,
        title: display.name || 'Cuộc gọi nhóm',
        avatar: display.avatar || '',
      });
      return;
    }

    router.push({
      pathname: '/(main)/call',
      params: {
        conversationId: payload.conversationId,
        callId: payload.callId || '',
        type: payload.callType,
        action: 'join',
        isGroup: 'false',
        name: display.name,
        avatar: display.avatar,
      },
    } as any);
  }, [router, userId]);

  const declineIncomingCall = useCallback((payload: IncomingCallPayload) => {
    activeCallKeyRef.current = null;
    setIncomingCall(null);
    chatSocket.declineCall(
      payload.conversationId,
      userId,
      payload.callerId,
      payload.callId,
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    chatSocket.connect();
    chatSocket.joinUserRoom(userId);

    const loadIncomingCallDisplay = async (
      payload: IncomingCallPayload,
    ): Promise<IncomingCallDisplay> => {
      const payloadConversationName = String(
        payload.conversationName ||
          payload.groupName ||
          payload.name ||
          '',
      ).trim();
      const payloadCallerName = String(
        payload.callerName ||
          payload.caller?.display_name ||
          payload.caller?.name ||
          '',
      ).trim();
      const payloadName = payload.isGroup
        ? payloadConversationName
        : payloadConversationName || payloadCallerName;
      const payloadConversationAvatar = String(
        payload.conversationAvatar ||
          payload.groupAvatar ||
          payload.avatar ||
          '',
      ).trim();
      const payloadCallerAvatar = String(
          payload.callerAvatar ||
          payload.caller?.avatar ||
          '',
      ).trim();
      const payloadAvatar = payload.isGroup
        ? payloadConversationAvatar
        : payloadConversationAvatar || payloadCallerAvatar;

      const displayFromConversation = (conversation: any): IncomingCallDisplay | null => {
        if (!conversation) return null;
        const name = getConversationTitle(conversation, userId);
        const avatar = getConversationAvatar(conversation, userId);
        return {
          name: name || payloadName || (payload.isGroup ? 'Cuộc gọi nhóm' : 'Cuộc gọi'),
          avatar: avatar || payloadAvatar,
        };
      };

      try {
        const conversation = await ChatApi.getConversationById(payload.conversationId);
        const display = displayFromConversation(conversation);
        if (display) return display;
      } catch {
        // Older review backends may not expose GET /conversations/:id yet.
      }

      try {
        const conversations = await ChatApi.getUserConversations(userId);
        const matched = conversations.find(
          (item: any) =>
            String(item?.conversation?._id || item?._id || '') ===
            String(payload.conversationId),
        );
        const display = displayFromConversation(matched?.conversation || matched);
        if (display) return display;
      } catch {
        // Keep the payload fallback below.
      }

      return {
        name: payloadName || (payload.isGroup ? 'Cuộc gọi nhóm' : 'Cuộc gọi'),
        avatar: payloadAvatar,
      };
    };

    const onIncomingCall = async (payload: IncomingCallPayload) => {
      if (!payload?.conversationId || String(payload.callerId) === String(userId)) return;

      if (payload.isGroup) {
        const activeGroupCall = mobileGroupCallSession.getSnapshot();
        const sameConversation =
          activeGroupCall.visible &&
          String(activeGroupCall.conversationId) === String(payload.conversationId);
        const sameCall =
          !payload.callId ||
          !activeGroupCall.callId ||
          String(activeGroupCall.callId) === String(payload.callId);
        const isAlreadyParticipant =
          Array.isArray(payload.participants) &&
          payload.participants.some((id) => String(id) === String(userId));

        if ((sameConversation && sameCall) || isAlreadyParticipant) {
          return;
        }

        if (activeGroupCall.visible) {
          declineIncomingCall(payload);
          return;
        }
      }

      if (pathname?.includes('/call')) {
        declineIncomingCall(payload);
        return;
      }

      const key = payload.callId || payload.conversationId;
      if (activeCallKeyRef.current === key) return;
      activeCallKeyRef.current = key;

      const display = await loadIncomingCallDisplay(payload);
      if (activeCallKeyRef.current !== key) return;

      setIncomingCall({ payload, display });
    };

    const clearIncoming = (payload: { conversationId: string; callId?: string }) => {
      const key = payload.callId || payload.conversationId;
      if (activeCallKeyRef.current === key) {
        activeCallKeyRef.current = null;
        setIncomingCall(null);
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
  }, [declineIncomingCall, pathname, userId]);

  const callTitle = incomingCall?.payload.isGroup
    ? incomingCall.payload.callType === 'video'
      ? 'Cuộc gọi video nhóm'
      : 'Cuộc gọi thoại nhóm'
    : incomingCall?.payload.callType === 'video'
      ? 'Cuộc gọi video'
      : 'Cuộc gọi thoại';

  useEffect(() => {
    if (!incomingCall) return;

    void setSystemBackgroundAsync('#100b07', 'light');
    return () => {
      void setSystemBackgroundAsync(DEFAULT_SYSTEM_BACKGROUND, 'dark');
    };
  }, [incomingCall]);

  return (
    <Modal
      visible={!!incomingCall}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (incomingCall) declineIncomingCall(incomingCall.payload);
      }}
    >
      <LinearGradient
        colors={['rgba(35,26,16,0.96)', 'rgba(16,11,7,0.96)']}
        style={{ flex: 1 }}
      >
        <SafeAreaView
          edges={['top', 'left', 'right']}
          className="flex-1 justify-between px-6 pt-9"
          style={{ paddingBottom: bottomDockPadding }}
        >
          <View className="items-center pt-10">
            {incomingCall && <IncomingAvatar {...incomingCall.display} />}
            <Text className="mt-6 text-center text-2xl font-bold text-white">
              {incomingCall?.display.name || 'Cuộc gọi'}
            </Text>
            <Text className="mt-2 text-center text-sm font-semibold uppercase text-[#dfc0a4]">
              {callTitle}
            </Text>
            <Text className="mt-3 text-center text-sm text-white/70">
              Đang gọi cho bạn
            </Text>
          </View>

          <View className="rounded-[32px] border border-[#d0a97e]/25 bg-[#231a10]/85 px-5 py-5">
            <View className="flex-row items-center justify-around">
              <View className="items-center">
                <Pressable
                  onPress={() => incomingCall && declineIncomingCall(incomingCall.payload)}
                  className="h-16 w-16 items-center justify-center rounded-full bg-[#ef4444]"
                >
                  <Feather name="phone-off" size={26} color="#fff" />
                </Pressable>
                <Text className="mt-2 text-xs font-bold text-white/80">Từ chối</Text>
              </View>

              <View className="items-center">
                <Pressable
                  onPress={() => incomingCall && acceptIncomingCall(incomingCall)}
                  className="h-16 w-16 items-center justify-center rounded-full bg-[#16a34a]"
                >
                  <Feather
                    name={incomingCall?.payload.callType === 'voice' ? 'phone' : 'video'}
                    size={26}
                    color="#fff"
                  />
                </Pressable>
                <Text className="mt-2 text-xs font-bold text-white/80">Chấp nhận</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};
