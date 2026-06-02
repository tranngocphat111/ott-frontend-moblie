import { chatSocket, type CallType } from '@/services/socket/chatSocket';

type GroupCallStatus = 'idle' | 'connecting' | 'active' | 'error';

type ParticipantDisplay = {
  name: string;
  avatar?: string;
};

export type MobileGroupCallSnapshot = {
  visible: boolean;
  status: GroupCallStatus;
  conversationId: string;
  callId: string;
  userId: string;
  title: string;
  avatar: string;
  participants: string[];
  participantDetails: Record<string, ParticipantDisplay>;
  participantCount: number;
  error: string;
  startedAt: number | null;
  livekitToken: string;
};

type OpenGroupCallOptions = {
  conversationId: string;
  userId: string;
  title: string;
  avatar?: string;
  callId?: string;
};

type StartGroupCallOptions = OpenGroupCallOptions & {
  invitedUserIds?: string[];
};

const emptySnapshot: MobileGroupCallSnapshot = {
  visible: false,
  status: 'idle',
  conversationId: '',
  callId: '',
  userId: '',
  title: '',
  avatar: '',
  participants: [],
  participantDetails: {},
  participantCount: 0,
  error: '',
  startedAt: null,
  livekitToken: '',
};

let snapshot: MobileGroupCallSnapshot = emptySnapshot;
const listeners = new Set<() => void>();
let socketListenersBound = false;

const normalizeId = (value?: string | null) => String(value || '').trim();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const setSnapshot = (patch: Partial<MobileGroupCallSnapshot>) => {
  snapshot = { ...snapshot, ...patch };
  notify();
};

const ensureSocket = (conversationId: string, userId: string) => {
  chatSocket.connect();
  chatSocket.joinUserRoom(userId);
  chatSocket.joinConversation(conversationId);
  bindSocketListeners();
};

const isCurrentConversation = (conversationId?: string | null) =>
  !!snapshot.visible &&
  !!snapshot.conversationId &&
  normalizeId(conversationId) === normalizeId(snapshot.conversationId);

const normalizeParticipantDetails = (details?: any) => {
  const entries: [string, ParticipantDisplay][] = [];

  if (Array.isArray(details)) {
    details.forEach((detail) => {
      const id = normalizeId(detail?.userId || detail?.user_id || detail?.id);
      if (!id) return;

      const name = String(detail?.name || '').trim();
      const avatar = String(detail?.avatar || '').trim();
      entries.push([
        id,
        {
          name: name || `User ${id.slice(-4)}`,
          avatar,
        },
      ]);
    });
  } else if (details && typeof details === 'object') {
    Object.entries(details).forEach(([rawId, value]) => {
      const id = normalizeId(rawId);
      if (!id) return;

      const detail = value as Partial<ParticipantDisplay>;
      const name = String(detail?.name || '').trim();
      const avatar = String(detail?.avatar || '').trim();
      entries.push([
        id,
        {
          name: name || `User ${id.slice(-4)}`,
          avatar,
        },
      ]);
    });
  }

  return Object.fromEntries(entries);
};

const applyParticipantDetails = (details?: any) => {
  const normalized = normalizeParticipantDetails(details);
  if (Object.keys(normalized).length === 0) return;

  setSnapshot({
    participantDetails: {
      ...snapshot.participantDetails,
      ...normalized,
    },
  });
};

const applyParticipants = (
  participants?: string[],
  participantCount?: number,
  participantDetails?: any,
) => {
  applyParticipantDetails(participantDetails);
  const nextParticipants = Array.isArray(participants)
    ? participants.map((id) => normalizeId(id)).filter(Boolean)
    : snapshot.participants;
  const nextCount = Number.isFinite(Number(participantCount))
    ? Number(participantCount)
    : nextParticipants.length;

  setSnapshot({
    participants: nextParticipants,
    participantCount: Math.max(nextCount, 0),
  });
};

const applyLiveKitToken = (token?: string | null) => {
  const normalized = String(token || '').trim();
  if (!normalized) return;
  setSnapshot({ livekitToken: normalized });
};

const bindSocketListeners = () => {
  if (socketListenersBound) return;
  socketListenersBound = true;

  chatSocket.on('bat_dau_goi_thanh_cong', ((payload: any) => {
    if (!isCurrentConversation(payload?.conversationId)) return;
    setSnapshot({
      status: 'active',
      callId: normalizeId(payload?.callId) || snapshot.callId,
      error: '',
      startedAt: snapshot.startedAt || Date.now(),
    });
    applyLiveKitToken(payload?.livekitToken);
    applyParticipants(payload?.participants, undefined, payload?.participantDetails);
  }) as any);

  chatSocket.on('nguoi_dung_tham_gia_goi', ((payload: any) => {
    if (!isCurrentConversation(payload?.conversationId)) return;
    setSnapshot({
      status: 'active',
      callId: normalizeId(payload?.callId) || snapshot.callId,
      error: '',
      startedAt: snapshot.startedAt || Date.now(),
    });
    if (normalizeId(payload?.userId) === normalizeId(snapshot.userId)) {
      applyLiveKitToken(payload?.livekitToken);
    }
    applyParticipants(payload?.participants, undefined, payload?.participantDetails);
  }) as any);

  chatSocket.on('nguoi_dung_roi_goi', ((payload: any) => {
    if (!isCurrentConversation(payload?.conversationId)) return;
    applyParticipants(payload?.participants);
  }) as any);

  chatSocket.on('cap_nhat_trang_thai_goi_nhom', ((payload: any) => {
    if (!isCurrentConversation(payload?.conversationId)) return;

    if (!payload?.isCalling) {
      setSnapshot(emptySnapshot);
      return;
    }

    setSnapshot({
      status: 'active',
      callId: normalizeId(payload?.callId) || snapshot.callId,
      startedAt: snapshot.startedAt || Date.now(),
    });
    applyParticipants(
      Array.isArray(payload?.participants) ? payload.participants : undefined,
      Number(payload?.participantCount || 0),
      payload?.participantDetails,
    );
  }) as any);

  chatSocket.on('ket_thuc_phong_goi', ((payload: any) => {
    if (!isCurrentConversation(payload?.conversationId)) return;
    setSnapshot(emptySnapshot);
  }) as any);

  chatSocket.on('cuoc_goi_da_nhan_o_thiet_bi_khac', ((payload: any) => {
    if (!isCurrentConversation(payload?.conversationId)) return;
    if (normalizeId(payload?.userId) !== normalizeId(snapshot.userId)) return;
    setSnapshot(emptySnapshot);
  }) as any);

  chatSocket.on('nguoi_dung_ban_goi', ((payload: any) => {
    if (!isCurrentConversation(payload?.conversationId)) return;
    setSnapshot({
      status: 'error',
      error: 'Bạn hoặc thành viên đang ở trong một cuộc gọi khác.',
    });
  }) as any);

  chatSocket.on('khong_the_tham_gia_goi', ((payload: any) => {
    if (!isCurrentConversation(payload?.conversationId)) return;
    if (/already_active/i.test(String(payload?.reason || ''))) return;

    setSnapshot({
      status: 'error',
      callId: normalizeId(payload?.callId) || snapshot.callId,
      error: normalizeErrorMessage(new Error(payload?.reason || 'join_group_call_failed')),
    });
  }) as any);
};

const openConnecting = (options: OpenGroupCallOptions) => {
  setSnapshot({
    visible: true,
    status: 'connecting',
    conversationId: options.conversationId,
    callId: normalizeId(options.callId),
    userId: options.userId,
    title: options.title || 'Cuộc gọi nhóm',
    avatar: options.avatar || '',
    participants: [options.userId].filter(Boolean),
    participantDetails: {},
    participantCount: 1,
    error: '',
    startedAt: Date.now(),
    livekitToken: '',
  });
};

const assertOk = (response: any, fallbackReason: string) => {
  if (response?.ok) return;
  throw new Error(response?.reason || fallbackReason);
};

const normalizeErrorMessage = (error: unknown) => {
  const reason = String((error as any)?.message || '').trim();
  if (/busy|caller_busy/i.test(reason)) {
    return 'Bạn hoặc thành viên đang ở trong một cuộc gọi khác.';
  }
  if (/call_not_found|ended/i.test(reason)) {
    return 'Cuộc gọi này đã kết thúc hoặc không còn tồn tại.';
  }
  if (/already_joined_elsewhere|stale_device_ignored/i.test(reason)) {
    return 'Cuộc gọi này đã được nhận trên thiết bị khác.';
  }
  if (/already_active/i.test(reason)) {
    return 'Cuộc gọi nhóm đang diễn ra. Hãy bấm tham gia lại.';
  }
  if (/group_call_full/i.test(reason)) {
    return 'Cuộc gọi nhóm đã đủ 8 người tham gia.';
  }
  return 'Không thể kết nối cuộc gọi nhóm. Vui lòng thử lại.';
};

export const mobileGroupCallSession = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot() {
    return snapshot;
  },

  async startGroupCall(options: StartGroupCallOptions) {
    if (!options.conversationId || !options.userId) return;

    openConnecting(options);
    ensureSocket(options.conversationId, options.userId);

    try {
      let response = await chatSocket.startCall(
        options.conversationId,
        options.userId,
        'video',
        options.invitedUserIds,
      );

      if (!response?.ok && response?.reason === 'already_active') {
        response = await chatSocket.joinCall(
          options.conversationId,
          options.userId,
          'video',
          response.callId || options.callId || null,
        );
      }

      assertOk(response, 'start_group_call_failed');
      setSnapshot({
        status: 'active',
        callId: normalizeId(response?.callId) || snapshot.callId,
        participants: response?.participants || snapshot.participants,
        participantDetails: {
          ...snapshot.participantDetails,
          ...normalizeParticipantDetails(response?.participantDetails),
        },
        participantCount: Math.max(
          response?.participants?.length || 0,
          snapshot.participantCount || 1,
        ),
        error: '',
        startedAt: snapshot.startedAt || Date.now(),
        livekitToken: String(response?.livekitToken || snapshot.livekitToken || '').trim(),
      });
    } catch (error) {
      setSnapshot({
        status: 'error',
        error: normalizeErrorMessage(error),
      });
    }
  },

  async joinGroupCall(options: OpenGroupCallOptions) {
    if (!options.conversationId || !options.userId) return;

    openConnecting(options);
    ensureSocket(options.conversationId, options.userId);

    try {
      const response = await chatSocket.joinCall(
        options.conversationId,
        options.userId,
        'video',
        options.callId || null,
      );

      assertOk(response, 'join_group_call_failed');
      setSnapshot({
        status: 'active',
        callId: normalizeId(response?.callId) || snapshot.callId,
        participants: response?.participants || snapshot.participants,
        participantDetails: {
          ...snapshot.participantDetails,
          ...normalizeParticipantDetails(response?.participantDetails),
        },
        participantCount: Math.max(
          response?.participants?.length || 0,
          snapshot.participantCount || 1,
        ),
        error: '',
        startedAt: snapshot.startedAt || Date.now(),
        livekitToken: String(response?.livekitToken || snapshot.livekitToken || '').trim(),
      });
    } catch (error) {
      setSnapshot({
        status: 'error',
        error: normalizeErrorMessage(error),
      });
    }
  },

  async leaveCurrentCall() {
    const current = snapshot;
    setSnapshot(emptySnapshot);

    if (!current.conversationId || !current.userId) return;

    await chatSocket
      .leaveCall(current.conversationId, current.userId, current.callId || null)
      .catch(() => null);
  },

  closeError() {
    setSnapshot(emptySnapshot);
  },
};

export type { CallType };
