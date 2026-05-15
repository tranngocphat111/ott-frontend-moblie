import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';
import { chatSocket, type CallType } from '@/services/socket/chatSocket';

type RemoteStreamItem = {
  userId: string;
  stream: MediaStream;
};

type UseMobileCallOptions = {
  conversationId?: string;
  userId?: string;
};

const buildRtcConfig = () => {
  const iceServers: any[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];

  const turnUrl = process.env.EXPO_PUBLIC_TURN_URL;
  const turnUsername = process.env.EXPO_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.EXPO_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return { iceServers };
};

const rtcConfig = buildRtcConfig();

const stopTrack = (track?: { stop?: () => void; readyState?: string } | null) => {
  if (track?.readyState !== 'ended') {
    track?.stop?.();
  }
};

const normalizeId = (value?: string | null) => String(value || '').trim();

export function useMobileCall({ conversationId, userId }: UseMobileCallOptions) {
  const [callType, setCallType] = useState<CallType | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamItem[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [busyUserIds, setBusyUserIds] = useState<string[]>([]);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamRef = useRef<Map<string, MediaStream>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, any[]>>(new Map());
  const activeConversationRef = useRef<string | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const userIdRef = useRef(userId);
  const callTypeRef = useRef<CallType | null>(callType);
  const isGroupRef = useRef(false);
  const hasRemoteConnectedRef = useRef(false);
  const callConnectedAtRef = useRef<number | null>(null);
  const hasEmittedCallEndRef = useRef(false);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  useEffect(() => {
    isGroupRef.current = isGroup;
  }, [isGroup]);

  const setActiveCallId = useCallback((nextCallId?: string | null) => {
    const normalized = normalizeId(nextCallId);
    activeCallIdRef.current = normalized || null;
    setCurrentCallId(normalized || null);
  }, []);

  const isPayloadForActiveCall = useCallback(
    (payload: { conversationId?: string; callId?: string | null }) => {
      if (
        !activeConversationRef.current ||
        String(payload.conversationId || '') !== String(activeConversationRef.current)
      ) {
        return false;
      }

      const activeCallId = activeCallIdRef.current;
      const payloadCallId = normalizeId(payload.callId);

      if (activeCallId && !payloadCallId) return false;
      if (activeCallId && payloadCallId && payloadCallId !== activeCallId) return false;
      if (!activeCallId && payloadCallId) setActiveCallId(payloadCallId);

      return true;
    },
    [setActiveCallId],
  );

  const resetCallState = useCallback(() => {
    setCallType(null);
    setIsInCall(false);
    setIsConnecting(false);
    setRemoteStreams([]);
    setParticipants([]);
    setIsMuted(false);
    setIsCameraOff(false);
    setBusyUserIds([]);
    setIsGroup(false);
    setCurrentCallId(null);
    activeConversationRef.current = null;
    activeCallIdRef.current = null;
    remoteStreamRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    hasRemoteConnectedRef.current = false;
    callConnectedAtRef.current = null;
    hasEmittedCallEndRef.current = false;
  }, []);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(stopTrack);
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const cleanupPeer = useCallback((targetUserId: string) => {
    const pc = peerConnectionsRef.current.get(targetUserId);
    if (pc) {
      const peer = pc as any;
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onaddstream = null;
      peer.onconnectionstatechange = null;
      pc.close();
    }

    peerConnectionsRef.current.delete(targetUserId);
    remoteStreamRef.current.delete(targetUserId);
    pendingIceCandidatesRef.current.delete(targetUserId);
    setRemoteStreams((current) => current.filter((item) => item.userId !== targetUserId));
  }, []);

  const cleanupAllPeers = useCallback(() => {
    Array.from(peerConnectionsRef.current.keys()).forEach(cleanupPeer);
  }, [cleanupPeer]);

  const closeCallLocally = useCallback(() => {
    cleanupAllPeers();
    stopLocalStream();
    resetCallState();
  }, [cleanupAllPeers, resetCallState, stopLocalStream]);

  const markRemoteConnected = useCallback(() => {
    hasRemoteConnectedRef.current = true;
    if (!callConnectedAtRef.current) {
      callConnectedAtRef.current = Date.now();
    }
  }, []);

  const emitEndCallOnce = useCallback((activeConversationId: string) => {
    const activeUserId = userIdRef.current;
    if (!activeUserId || hasEmittedCallEndRef.current) {
      return Promise.resolve(null);
    }

    hasEmittedCallEndRef.current = true;
    const durationSeconds = callConnectedAtRef.current
      ? Math.max(0, Math.floor((Date.now() - callConnectedAtRef.current) / 1000))
      : 0;

    return chatSocket.endCall(activeConversationId, activeUserId, {
      callId: activeCallIdRef.current,
      callType: callTypeRef.current || undefined,
      wasConnected: hasRemoteConnectedRef.current,
      durationSeconds,
    });
  }, []);

  const ensureLocalStream = useCallback(async (mode: CallType) => {
    const existing = localStreamRef.current;
    if (existing) {
      const hasLiveVideo = existing
        .getVideoTracks()
        .some((track) => track.readyState === 'live');

      if (mode === 'voice' || hasLiveVideo) return existing;
      existing.getTracks().forEach(stopTrack);
    }

    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video:
        mode === 'video'
          ? {
              facingMode: 'user',
              width: 640,
              height: 480,
              frameRate: 24,
            }
          : false,
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    setIsMuted(false);
    setIsCameraOff(mode === 'voice');
    return stream;
  }, []);

  const upsertRemoteStream = useCallback((targetUserId: string, stream: MediaStream) => {
    markRemoteConnected();
    remoteStreamRef.current.set(targetUserId, stream);
    setRemoteStreams((current) => {
      const index = current.findIndex((item) => item.userId === targetUserId);
      if (index === -1) return [...current, { userId: targetUserId, stream }];
      const copy = [...current];
      copy[index] = { userId: targetUserId, stream };
      return copy;
    });
  }, [markRemoteConnected]);

  const getOrCreatePeer = useCallback(
    (targetUserId: string, mode: CallType) => {
      const existing = peerConnectionsRef.current.get(targetUserId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(rtcConfig as any);
      const stream = localStreamRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      const peer = pc as any;

      peer.onicecandidate = (event: any) => {
        if (!event.candidate || !activeConversationRef.current || !userIdRef.current) return;

        chatSocket.sendIceCandidate(
          activeConversationRef.current,
          activeCallIdRef.current,
          userIdRef.current,
          targetUserId,
          event.candidate.toJSON(),
        );
      };

      peer.ontrack = (event: any) => {
        const [streamFromEvent] = event.streams || [];
        if (streamFromEvent) {
          upsertRemoteStream(targetUserId, streamFromEvent);
        }
      };

      peer.onaddstream = (event: { stream?: MediaStream }) => {
        if (event.stream) {
          upsertRemoteStream(targetUserId, event.stream);
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') {
          markRemoteConnected();
          return;
        }

        if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
          cleanupPeer(targetUserId);
        }
      };

      peerConnectionsRef.current.set(targetUserId, pc);
      setCallType(mode);
      return pc;
    },
    [cleanupPeer, markRemoteConnected, upsertRemoteStream],
  );

  const flushPendingIceCandidates = useCallback(async (targetUserId: string, pc: RTCPeerConnection) => {
    const pending = pendingIceCandidatesRef.current.get(targetUserId);
    if (!pending?.length) return;

    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('Không thể thêm ICE candidate chờ:', error);
      }
    }

    pendingIceCandidatesRef.current.delete(targetUserId);
  }, []);

  const createOfferFor = useCallback(
    async (targetUserId: string, mode: CallType) => {
      if (!activeConversationRef.current || !userIdRef.current) return;

      const pc = getOrCreatePeer(targetUserId, mode);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: mode === 'video',
      });

      await pc.setLocalDescription(offer);
      chatSocket.sendOffer(
        activeConversationRef.current,
        activeCallIdRef.current,
        userIdRef.current,
        targetUserId,
        offer,
        mode,
      );
    },
    [getOrCreatePeer],
  );

  const startCall = useCallback(
    async (mode: CallType, invitedUserIds?: string[], isGroupCall?: boolean) => {
      if (!conversationId || !userId) return;

      try {
        setIsConnecting(true);
        setBusyUserIds([]);
        await ensureLocalStream(mode);

        activeConversationRef.current = conversationId;
        setCallType(mode);
        setIsGroup(!!isGroupCall);
        isGroupRef.current = !!isGroupCall;
        setIsInCall(true);

        const response = await chatSocket.startCall(
          conversationId,
          userId,
          mode,
          invitedUserIds,
        );

        if (!response?.ok && response?.reason === 'busy' && response.targetUserId) {
          setBusyUserIds([response.targetUserId]);
          closeCallLocally();
          return;
        }

        if (!response?.ok) {
          throw new Error(response?.reason || 'start_call_failed');
        }

        setActiveCallId(response.callId || null);
        setParticipants(response.participants || [userId]);
        setIsGroup(!!response.isGroup || !!isGroupCall);
      } finally {
        setIsConnecting(false);
      }
    },
    [closeCallLocally, conversationId, ensureLocalStream, setActiveCallId, userId],
  );

  const joinExistingCall = useCallback(
    async (mode: CallType, isGroupCall?: boolean, callId?: string | null) => {
      if (!conversationId || !userId) return;

      try {
        setIsConnecting(true);
        await ensureLocalStream(mode);

        activeConversationRef.current = conversationId;
        setCallType(mode);
        setIsGroup(!!isGroupCall);
        isGroupRef.current = !!isGroupCall;
        setIsInCall(true);
        setActiveCallId(callId || null);

        const response = await chatSocket.joinCall(
          conversationId,
          userId,
          mode,
          callId || activeCallIdRef.current,
        );

        if (!response?.ok) {
          throw new Error(response?.reason || 'join_call_failed');
        }

        setActiveCallId(response.callId || callId || null);
        setParticipants(response.participants || [userId]);
        setIsGroup(!!response.isGroup || !!isGroupCall);
      } finally {
        setIsConnecting(false);
      }
    },
    [conversationId, ensureLocalStream, setActiveCallId, userId],
  );

  const endCall = useCallback(async (notifyRemote = true) => {
    const activeConversationId = activeConversationRef.current;
    let signalPromise = Promise.resolve(null as any);

    if (notifyRemote && activeConversationId && userIdRef.current) {
      if (isGroupRef.current) {
        signalPromise = chatSocket.leaveCall(
          activeConversationId,
          userIdRef.current,
          activeCallIdRef.current,
        );
      } else {
        signalPromise = emitEndCallOnce(activeConversationId);
      }
    }

    closeCallLocally();
    await signalPromise.catch(() => null);
  }, [closeCallLocally, emitEndCallOnce]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setIsMuted((current) => !current);
  }, []);

  const toggleCamera = useCallback(() => {
    if (callTypeRef.current !== 'video') return;
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextIsCameraOff = !isCameraOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextIsCameraOff;
    });

    setIsCameraOff(nextIsCameraOff);
    if (activeConversationRef.current && userIdRef.current) {
      chatSocket.emitCameraState(
        activeConversationRef.current,
        userIdRef.current,
        nextIsCameraOff,
        activeCallIdRef.current,
      );
    }
  }, [isCameraOff]);

  useEffect(() => {
    const handleCallJoined = async (payload: {
      conversationId: string;
      callId?: string;
      userId: string;
      participants: string[];
      callType: CallType;
      isGroup?: boolean;
    }) => {
      if (!userIdRef.current || !isPayloadForActiveCall(payload)) return;

      setParticipants(payload.participants || []);
      setCallType(payload.callType);
      setIsGroup(!!payload.isGroup);

      if (payload.participants?.some((id) => String(id) !== String(userIdRef.current))) {
        markRemoteConnected();
      }

      if (String(payload.userId) === String(userIdRef.current)) return;
      if (!localStreamRef.current) return;
      if (peerConnectionsRef.current.has(payload.userId)) return;

      try {
        await createOfferFor(payload.userId, payload.callType);
      } catch (error) {
        console.error('Không thể tạo offer:', error);
      }
    };

    const handleOffer = async (payload: {
      conversationId: string;
      callId?: string;
      fromUserId: string;
      offer: any;
      callType: CallType;
    }) => {
      if (!userIdRef.current || !isPayloadForActiveCall(payload)) return;

      try {
        const pc = getOrCreatePeer(payload.fromUserId, payload.callType);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        await flushPendingIceCandidates(payload.fromUserId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        chatSocket.sendAnswer(
          payload.conversationId,
          activeCallIdRef.current,
          userIdRef.current,
          payload.fromUserId,
          answer,
        );
      } catch (error) {
        console.error('Xử lý offer thất bại:', error);
      }
    };

    const handleAnswer = async (payload: {
      conversationId: string;
      callId?: string;
      fromUserId: string;
      answer: any;
    }) => {
      if (!isPayloadForActiveCall(payload)) return;

      try {
        const pc = peerConnectionsRef.current.get(payload.fromUserId);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        await flushPendingIceCandidates(payload.fromUserId, pc);
      } catch (error) {
        console.error('Xử lý answer thất bại:', error);
      }
    };

    const handleIceCandidate = async (payload: {
      conversationId: string;
      callId?: string;
      fromUserId: string;
      candidate: any;
    }) => {
      if (!isPayloadForActiveCall(payload)) return;

      try {
        const pc = peerConnectionsRef.current.get(payload.fromUserId);
        if (!pc || !pc.remoteDescription) {
          const pending = pendingIceCandidatesRef.current.get(payload.fromUserId) || [];
          pending.push(payload.candidate);
          pendingIceCandidatesRef.current.set(payload.fromUserId, pending);
          return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (error) {
        console.error('Xử lý ICE candidate thất bại:', error);
      }
    };

    const handleCallLeft = (payload: {
      conversationId: string;
      callId?: string;
      userId: string;
      participants: string[];
    }) => {
      if (!isPayloadForActiveCall(payload)) return;
      cleanupPeer(payload.userId);
      setParticipants(payload.participants || []);
    };

    const handleCallEnded = (payload: { conversationId: string; callId?: string }) => {
      if (!isPayloadForActiveCall(payload)) return;
      void endCall(false);
    };

    const handleCallBusy = (payload: { conversationId: string; targetUserId: string }) => {
      if (String(payload.conversationId) !== String(activeConversationRef.current)) return;
      setBusyUserIds((current) =>
        current.includes(payload.targetUserId)
          ? current
          : [...current, payload.targetUserId],
      );
    };

    chatSocket.on('nguoi_dung_tham_gia_goi', handleCallJoined as any);
    chatSocket.on('nhan_offer', handleOffer as any);
    chatSocket.on('nhan_answer', handleAnswer as any);
    chatSocket.on('nhan_ice_candidate', handleIceCandidate as any);
    chatSocket.on('nguoi_dung_roi_goi', handleCallLeft as any);
    chatSocket.on('ket_thuc_phong_goi', handleCallEnded as any);
    chatSocket.on('nguoi_dung_ban_goi', handleCallBusy as any);

    return () => {
      chatSocket.off('nguoi_dung_tham_gia_goi', handleCallJoined as any);
      chatSocket.off('nhan_offer', handleOffer as any);
      chatSocket.off('nhan_answer', handleAnswer as any);
      chatSocket.off('nhan_ice_candidate', handleIceCandidate as any);
      chatSocket.off('nguoi_dung_roi_goi', handleCallLeft as any);
      chatSocket.off('ket_thuc_phong_goi', handleCallEnded as any);
      chatSocket.off('nguoi_dung_ban_goi', handleCallBusy as any);
    };
  }, [
    cleanupPeer,
    createOfferFor,
    endCall,
    flushPendingIceCandidates,
    getOrCreatePeer,
    isPayloadForActiveCall,
    markRemoteConnected,
  ]);

  useEffect(() => {
    return () => {
      const activeConversationId = activeConversationRef.current;
      const activeUserId = userIdRef.current;

      if (activeConversationId && activeUserId) {
        if (isGroupRef.current) {
          void chatSocket.leaveCall(activeConversationId, activeUserId, activeCallIdRef.current);
        } else {
          void emitEndCallOnce(activeConversationId);
        }
      }

      cleanupAllPeers();
      stopLocalStream();
    };
  }, [cleanupAllPeers, emitEndCallOnce, stopLocalStream]);

  return useMemo(
    () => ({
      callType,
      isInCall,
      isConnecting,
      localStream,
      remoteStreams,
      participants,
      isMuted,
      isCameraOff,
      busyUserIds,
      currentCallId,
      isGroup,
      startCall,
      joinExistingCall,
      endCall,
      toggleMic,
      toggleCamera,
    }),
    [
      busyUserIds,
      callType,
      currentCallId,
      endCall,
      isCameraOff,
      isConnecting,
      isGroup,
      isInCall,
      isMuted,
      joinExistingCall,
      localStream,
      participants,
      remoteStreams,
      startCall,
      toggleCamera,
      toggleMic,
    ],
  );
}
