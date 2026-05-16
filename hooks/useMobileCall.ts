import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chatSocket, type CallType } from '@/services/socket/chatSocket';

declare const require: any;

type RemoteStreamItem = {
  userId: string;
  stream: any;
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
type MobileMediaTrack = any;

type WebRtcModule = {
  mediaDevices: any;
  MediaStream: any;
  RTCIceCandidate: any;
  RTCPeerConnection: any;
  RTCSessionDescription: any;
};

let cachedWebRtcModule: WebRtcModule | null | false = null;

const getWebRtcModule = (): WebRtcModule | null => {
  if (cachedWebRtcModule === false) return null;
  if (cachedWebRtcModule) return cachedWebRtcModule;

  try {
    // Keep this lazy. Importing the native module at route-load time can crash review builds.
    cachedWebRtcModule = require('@livekit/react-native-webrtc') as WebRtcModule;
    return cachedWebRtcModule;
  } catch (error) {
    console.warn('Không thể tải WebRTC native module:', error);
    cachedWebRtcModule = false;
    return null;
  }
};

const createMediaStream = (tracks: MobileMediaTrack[] = []) => {
  const rtc = getWebRtcModule();
  if (!rtc?.MediaStream) return null;
  return new rtc.MediaStream(tracks);
};

const isLiveTrack = (track?: MobileMediaTrack | null) =>
  Boolean(track && track.readyState === 'live');

const ensureTransceivers = (pc: any, mode: CallType) => {
  try {
    const peer = pc as any;
    const transceivers = typeof peer.getTransceivers === 'function'
      ? peer.getTransceivers()
      : [];
    const hasAudio = transceivers.some((item: any) => item.receiver?.track?.kind === 'audio');
    const hasVideo = transceivers.some((item: any) => item.receiver?.track?.kind === 'video');

    if (!hasAudio && typeof peer.addTransceiver === 'function') {
      peer.addTransceiver('audio', { direction: 'sendrecv' });
    }

    if (mode === 'video' && !hasVideo && typeof peer.addTransceiver === 'function') {
      peer.addTransceiver('video', { direction: 'sendrecv' });
    }
  } catch (error) {
    console.warn('Không thể chuẩn bị transceiver cuộc gọi:', error);
  }
};

export function useMobileCall({ conversationId, userId }: UseMobileCallOptions) {
  const [callType, setCallType] = useState<CallType | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamItem[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteCameraStates, setRemoteCameraStates] = useState<Record<string, boolean>>({});
  const [busyUserIds, setBusyUserIds] = useState<string[]>([]);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);

  const localStreamRef = useRef<any | null>(null);
  const peerConnectionsRef = useRef<Map<string, any>>(new Map());
  const remoteStreamRef = useRef<Map<string, any>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, any[]>>(new Map());
  const activeConversationRef = useRef<string | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const livekitTokenRef = useRef<string | null>(null);
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

  const setActiveLiveKitToken = useCallback((nextToken?: string | null) => {
    const normalized = normalizeId(nextToken);
    livekitTokenRef.current = normalized || null;
    setLivekitToken(normalized || null);
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
    setRemoteCameraStates({});
    setBusyUserIds([]);
    setIsGroup(false);
    setCurrentCallId(null);
    setLivekitToken(null);
    activeConversationRef.current = null;
    activeCallIdRef.current = null;
    livekitTokenRef.current = null;
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
    setRemoteCameraStates((current) => {
      if (!(targetUserId in current)) return current;
      const copy = { ...current };
      delete copy[targetUserId];
      return copy;
    });
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

  const prepareCallSocket = useCallback(() => {
    if (!conversationId || !userId) return;

    chatSocket.connect();
    chatSocket.joinUserRoom(userId);
    chatSocket.joinConversation(conversationId);
  }, [conversationId, userId]);

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

  const commitLocalStream = useCallback((stream: any | null) => {
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  const acquireAudioTrack = useCallback(async () => {
    const rtc = getWebRtcModule();
    if (!rtc?.mediaDevices?.getUserMedia) return null;

    try {
      const media = await rtc.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      media.getVideoTracks().forEach(stopTrack);
      return media.getAudioTracks()[0] || null;
    } catch (error) {
      console.warn('Không thể bật micro, sẽ vào cuộc gọi ở trạng thái tắt mic:', error);
      return null;
    }
  }, []);

  const acquireVideoTrack = useCallback(async () => {
    const rtc = getWebRtcModule();
    if (!rtc?.mediaDevices?.getUserMedia) return null;

    try {
      const media = await rtc.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: 640,
          height: 480,
          frameRate: 24,
        },
      });
      media.getAudioTracks().forEach(stopTrack);
      return media.getVideoTracks()[0] || null;
    } catch (error) {
      console.warn('Không thể bật camera, sẽ vào cuộc gọi ở trạng thái tắt cam:', error);
      return null;
    }
  }, []);

  const ensureLocalStream = useCallback(async (mode: CallType) => {
    const existing = localStreamRef.current;
    if (existing) {
      const hasLiveAudio = existing.getAudioTracks().some(isLiveTrack);
      const hasLiveVideo = existing.getVideoTracks().some(isLiveTrack);

      if (hasLiveAudio && (mode === 'voice' || hasLiveVideo)) {
        existing.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        existing.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
        setIsMuted(false);
        setIsCameraOff(mode === 'voice' || !hasLiveVideo);
        return existing;
      }
      existing.getTracks().forEach(stopTrack);
    }

    const audioTrack = await acquireAudioTrack();
    const videoTrack = mode === 'video' ? await acquireVideoTrack() : null;
    const tracks = [audioTrack, videoTrack].filter(
      (track): track is MobileMediaTrack => Boolean(track),
    );
    const stream = createMediaStream(tracks);

    commitLocalStream(stream);
    setIsMuted(!audioTrack);
    setIsCameraOff(mode === 'voice' || !videoTrack);
    return stream;
  }, [acquireAudioTrack, acquireVideoTrack, commitLocalStream]);

  const upsertRemoteStream = useCallback((targetUserId: string, stream: any) => {
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

      const rtc = getWebRtcModule();
      if (!rtc?.RTCPeerConnection) return null;

      const pc = new rtc.RTCPeerConnection(rtcConfig as any);
      const stream = localStreamRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      }

      ensureTransceivers(pc, mode);

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

      peer.onaddstream = (event: { stream?: any }) => {
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

  const replaceOutgoingTrack = useCallback(
    (kind: 'audio' | 'video', nextTrack: MobileMediaTrack | null) => {
      peerConnectionsRef.current.forEach((pc) => {
        const peer = pc as any;
        const sender =
          (typeof peer.getTransceivers === 'function'
            ? peer
                .getTransceivers()
                .find(
                  (item: any) =>
                    item.sender?.track?.kind === kind ||
                    item.receiver?.track?.kind === kind,
                )?.sender
            : null) ||
          (typeof peer.getSenders === 'function'
            ? peer.getSenders().find((item: any) => item.track?.kind === kind)
            : null);

        if (sender && typeof sender.replaceTrack === 'function') {
          sender.replaceTrack(nextTrack).catch((error: unknown) => {
            console.error(`Không thể cập nhật ${kind} track:`, error);
          });
          return;
        }

        if (nextTrack && localStreamRef.current) {
          try {
            pc.addTrack(nextTrack, localStreamRef.current);
          } catch (error) {
            console.error(`Không thể thêm ${kind} track:`, error);
          }
        }
      });
    },
    [],
  );

  const emitLocalCameraState = useCallback((cameraOff: boolean) => {
    if (!activeConversationRef.current || !userIdRef.current) return;
    chatSocket.emitCameraState(
      activeConversationRef.current,
      userIdRef.current,
      cameraOff,
      activeCallIdRef.current,
    );
  }, []);

  const flushPendingIceCandidates = useCallback(async (targetUserId: string, pc: any) => {
    const pending = pendingIceCandidatesRef.current.get(targetUserId);
    if (!pending?.length) return;

    const rtc = getWebRtcModule();
    if (!rtc?.RTCIceCandidate) return;

    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new rtc.RTCIceCandidate(candidate));
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
      if (!pc) return;
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
        const effectiveMode: CallType = isGroupCall ? 'video' : mode;
        const isGroupSession = !!isGroupCall;
        setIsConnecting(true);
        setBusyUserIds([]);
        prepareCallSocket();
        if (!isGroupSession) {
          await ensureLocalStream(effectiveMode);
        }

        activeConversationRef.current = conversationId;
        setCallType(effectiveMode);
        setIsGroup(isGroupSession);
        isGroupRef.current = isGroupSession;
        setIsInCall(true);

        let response = await chatSocket.startCall(
          conversationId,
          userId,
          effectiveMode,
          invitedUserIds,
        );

        if (!response?.ok && response?.reason === 'already_active' && isGroupSession) {
          setActiveCallId(response.callId || null);
          response = await chatSocket.joinCall(
            conversationId,
            userId,
            effectiveMode,
            response.callId || null,
          );
        }

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
        const nextIsGroup = !!response.isGroup || isGroupSession;
        setIsGroup(nextIsGroup);
        isGroupRef.current = nextIsGroup;
        setActiveLiveKitToken(response.livekitToken || null);

        if (nextIsGroup && response.livekitToken) {
          setIsMuted(false);
          setIsCameraOff(false);
          return;
        }

        if (nextIsGroup && !localStreamRef.current) {
          await ensureLocalStream(effectiveMode);
        }

        if (effectiveMode === 'video') {
          emitLocalCameraState(
            !localStreamRef.current?.getVideoTracks().some(isLiveTrack),
          );
        }
      } catch (error) {
        closeCallLocally();
        throw error;
      } finally {
        setIsConnecting(false);
      }
    },
    [
      closeCallLocally,
      conversationId,
      emitLocalCameraState,
      ensureLocalStream,
      prepareCallSocket,
      setActiveCallId,
      setActiveLiveKitToken,
      userId,
    ],
  );

  const joinExistingCall = useCallback(
    async (mode: CallType, isGroupCall?: boolean, callId?: string | null) => {
      if (!conversationId || !userId) return;

      try {
        const effectiveMode: CallType = isGroupCall ? 'video' : mode;
        const isGroupSession = !!isGroupCall;
        setIsConnecting(true);
        prepareCallSocket();
        if (!isGroupSession) {
          await ensureLocalStream(effectiveMode);
        }

        activeConversationRef.current = conversationId;
        setCallType(effectiveMode);
        setIsGroup(isGroupSession);
        isGroupRef.current = isGroupSession;
        setIsInCall(true);
        setActiveCallId(callId || null);

        const response = await chatSocket.joinCall(
          conversationId,
          userId,
          effectiveMode,
          callId || activeCallIdRef.current,
        );

        if (!response?.ok) {
          throw new Error(response?.reason || 'join_call_failed');
        }

        setActiveCallId(response.callId || callId || null);
        setParticipants(response.participants || [userId]);
        const nextIsGroup = !!response.isGroup || isGroupSession;
        setIsGroup(nextIsGroup);
        isGroupRef.current = nextIsGroup;
        setActiveLiveKitToken(response.livekitToken || null);

        if (nextIsGroup && response.livekitToken) {
          setIsMuted(false);
          setIsCameraOff(false);
          return;
        }

        if (nextIsGroup && !localStreamRef.current) {
          await ensureLocalStream(effectiveMode);
        }

        if (effectiveMode === 'video') {
          emitLocalCameraState(
            !localStreamRef.current?.getVideoTracks().some(isLiveTrack),
          );
        }
      } catch (error) {
        closeCallLocally();
        throw error;
      } finally {
        setIsConnecting(false);
      }
    },
    [
      conversationId,
      emitLocalCameraState,
      ensureLocalStream,
      prepareCallSocket,
      setActiveCallId,
      setActiveLiveKitToken,
      userId,
    ],
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

    if (!isMuted) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setIsMuted(true);
      return;
    }

    void (async () => {
      const liveAudioTracks = stream.getAudioTracks().filter(isLiveTrack);
      if (liveAudioTracks.length > 0) {
        liveAudioTracks.forEach((track) => {
          track.enabled = true;
        });
        setIsMuted(false);
        return;
      }

      const nextTrack = await acquireAudioTrack();
      if (!nextTrack) {
        setIsMuted(true);
        return;
      }

      stream.getAudioTracks().forEach((track) => {
        stream.removeTrack(track);
        stopTrack(track);
      });
      stream.addTrack(nextTrack);
      replaceOutgoingTrack('audio', nextTrack);
      commitLocalStream(createMediaStream(stream.getTracks()) || stream);
      setIsMuted(false);
    })();
  }, [acquireAudioTrack, commitLocalStream, isMuted, replaceOutgoingTrack]);

  const toggleCamera = useCallback(() => {
    if (callTypeRef.current !== 'video') return;
    const stream = localStreamRef.current;
    if (!stream) return;

    if (!isCameraOff) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
      setIsCameraOff(true);
      emitLocalCameraState(true);
      return;
    }

    void (async () => {
      const liveVideoTracks = stream.getVideoTracks().filter(isLiveTrack);
      if (liveVideoTracks.length > 0) {
        liveVideoTracks.forEach((track) => {
          track.enabled = true;
        });
        setIsCameraOff(false);
        emitLocalCameraState(false);
        return;
      }

      const nextTrack = await acquireVideoTrack();
      if (!nextTrack) {
        setIsCameraOff(true);
        emitLocalCameraState(true);
        return;
      }

      stream.getVideoTracks().forEach((track) => {
        stream.removeTrack(track);
        stopTrack(track);
      });
      stream.addTrack(nextTrack);
      replaceOutgoingTrack('video', nextTrack);
      commitLocalStream(createMediaStream(stream.getTracks()) || stream);
      setIsCameraOff(false);
      emitLocalCameraState(false);
    })();
  }, [
    acquireVideoTrack,
    callTypeRef,
    commitLocalStream,
    emitLocalCameraState,
    isCameraOff,
    replaceOutgoingTrack,
  ]);

  useEffect(() => {
    const handleCallJoined = async (payload: {
      conversationId: string;
      callId?: string;
      userId: string;
      participants: string[];
      callType: CallType;
      isGroup?: boolean;
      livekitToken?: string | null;
    }) => {
      if (!userIdRef.current || !isPayloadForActiveCall(payload)) return;

      setParticipants(payload.participants || []);
      setCallType(payload.callType);
      setIsGroup(!!payload.isGroup);
      if (payload.livekitToken && String(payload.userId) === String(userIdRef.current)) {
        setActiveLiveKitToken(payload.livekitToken);
      }

      if (payload.participants?.some((id) => String(id) !== String(userIdRef.current))) {
        markRemoteConnected();
      }

      if (String(payload.userId) === String(userIdRef.current)) return;
      if (payload.isGroup && (payload.livekitToken || livekitTokenRef.current)) return;
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
      if (isGroupRef.current && livekitTokenRef.current) return;

      try {
        const rtc = getWebRtcModule();
        if (!rtc?.RTCSessionDescription) return;
        const pc = getOrCreatePeer(payload.fromUserId, payload.callType);
        if (!pc) return;
        await pc.setRemoteDescription(new rtc.RTCSessionDescription(payload.offer));
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
        const rtc = getWebRtcModule();
        if (!rtc?.RTCSessionDescription) return;
        const pc = peerConnectionsRef.current.get(payload.fromUserId);
        if (!pc) return;
        await pc.setRemoteDescription(new rtc.RTCSessionDescription(payload.answer));
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
        const rtc = getWebRtcModule();
        if (!rtc?.RTCIceCandidate) return;
        const pc = peerConnectionsRef.current.get(payload.fromUserId);
        if (!pc || !pc.remoteDescription) {
          const pending = pendingIceCandidatesRef.current.get(payload.fromUserId) || [];
          pending.push(payload.candidate);
          pendingIceCandidatesRef.current.set(payload.fromUserId, pending);
          return;
        }

        await pc.addIceCandidate(new rtc.RTCIceCandidate(payload.candidate));
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

    const handleCallDeclined = (payload: {
      conversationId: string;
      callId?: string;
      userId: string;
    }) => {
      if (!isPayloadForActiveCall(payload)) return;
      if (!isGroupRef.current) {
        void endCall(false);
      }
    };

    const handleStartCallSuccess = (payload: {
      conversationId: string;
      callId?: string;
      callType: CallType;
      participants?: string[];
      isGroup?: boolean;
      livekitToken?: string | null;
    }) => {
      if (!isPayloadForActiveCall(payload)) return;
      setCallType(payload.callType);
      if (payload.callId) setActiveCallId(payload.callId);
      if (payload.participants) setParticipants(payload.participants);
      if (payload.livekitToken) setActiveLiveKitToken(payload.livekitToken);
      if (payload.isGroup) {
        isGroupRef.current = true;
        setIsGroup(true);
      }
    };

    const handleCameraStateChanged = (payload: {
      conversationId: string;
      callId?: string;
      userId: string;
      isCameraOff: boolean;
    }) => {
      if (!isPayloadForActiveCall(payload)) return;
      setRemoteCameraStates((current) => ({
        ...current,
        [payload.userId]: payload.isCameraOff,
      }));
    };

    chatSocket.on('bat_dau_goi_thanh_cong', handleStartCallSuccess as any);
    chatSocket.on('nguoi_dung_tham_gia_goi', handleCallJoined as any);
    chatSocket.on('nhan_offer', handleOffer as any);
    chatSocket.on('nhan_answer', handleAnswer as any);
    chatSocket.on('nhan_ice_candidate', handleIceCandidate as any);
    chatSocket.on('nguoi_dung_roi_goi', handleCallLeft as any);
    chatSocket.on('ket_thuc_phong_goi', handleCallEnded as any);
    chatSocket.on('nguoi_dung_tu_choi_goi', handleCallDeclined as any);
    chatSocket.on('nguoi_dung_ban_goi', handleCallBusy as any);
    chatSocket.on('thay_doi_trang_thai_camera', handleCameraStateChanged as any);

    return () => {
      chatSocket.off('bat_dau_goi_thanh_cong', handleStartCallSuccess as any);
      chatSocket.off('nguoi_dung_tham_gia_goi', handleCallJoined as any);
      chatSocket.off('nhan_offer', handleOffer as any);
      chatSocket.off('nhan_answer', handleAnswer as any);
      chatSocket.off('nhan_ice_candidate', handleIceCandidate as any);
      chatSocket.off('nguoi_dung_roi_goi', handleCallLeft as any);
      chatSocket.off('ket_thuc_phong_goi', handleCallEnded as any);
      chatSocket.off('nguoi_dung_tu_choi_goi', handleCallDeclined as any);
      chatSocket.off('nguoi_dung_ban_goi', handleCallBusy as any);
      chatSocket.off('thay_doi_trang_thai_camera', handleCameraStateChanged as any);
    };
  }, [
    cleanupPeer,
    createOfferFor,
    endCall,
    flushPendingIceCandidates,
    getOrCreatePeer,
    isPayloadForActiveCall,
    markRemoteConnected,
    setActiveCallId,
    setActiveLiveKitToken,
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
      remoteCameraStates,
      busyUserIds,
      currentCallId,
      isGroup,
      livekitToken,
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
      remoteCameraStates,
      isConnecting,
      isGroup,
      isInCall,
      isMuted,
      joinExistingCall,
      livekitToken,
      localStream,
      participants,
      remoteStreams,
      startCall,
      toggleCamera,
      toggleMic,
    ],
  );
}
