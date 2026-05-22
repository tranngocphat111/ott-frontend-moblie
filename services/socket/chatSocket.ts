import { io, type Socket } from 'socket.io-client';
import { CHAT_API_CONFIG } from '@/configuration/api';

export type CallType = 'voice' | 'video';

export type CallParticipantDetail = {
	userId?: string;
	user_id?: string;
	id?: string;
	name?: string;
	avatar?: string;
};

type CallSessionAck = {
	ok?: boolean;
	reason?: string;
	conversationId?: string;
	callId?: string;
	callType?: CallType;
	isGroup?: boolean;
	livekitToken?: string | null;
	participants?: string[];
	participantDetails?: CallParticipantDetail[];
	targetUserId?: string;
};

type ChatSocketEventMap = {
	tin_nhan: (payload: any) => void;
	tin_nhan_reaction: (payload: any) => void;
	tin_nhan_thu_hoi: (payload: any) => void;
	tin_nhan_da_xoa: (payload: any) => void;
	tin_nhan_pin: (payload: any) => void;
	nguoi_dung_dang_soan_tin_nhan: (payload: any) => void;
	nguoi_dung_ngung_soan_tin_nhan: (payload: any) => void;
	tao_phong_moi: (payload: any) => void;
	cap_nhat_nhom: (payload: any) => void;
	giai_tan_nhom: (payload: any) => void;
	cap_nhat_role: (payload: any) => void;
	cap_nhat_biet_danh: (payload: any) => void;
	cap_nhat_phan_loai: (payload: any) => void;
	cap_nhat_thong_bao: (payload: any) => void;
	xoa_thanh_vien: (payload: any) => void;
	bi_xoa_khoi_nhom: (payload: any) => void;
	bi_chan_khoi_nhom: (payload: any) => void;
	thanh_vien_bi_chan: (payload: any) => void;
	roi_nhom: (payload: any) => void;
	tin_nhan_cap_nhat: (payload: any) => void;
	participant_cursor_changed: (payload: any) => void;
	conversation_read_synced: (payload: any) => void;
	cap_nhat_quan_he: (payload: any) => void;
	cap_nhat_thong_tin_ca_nhan: (payload: any) => void;
	buoc_dang_xuat: (payload: any) => void;
	thong_bao_moi: (payload: any) => void;
	ket_qua_trang_thai_hoat_dong: (payload: { userId: string; isOnline: boolean; lastSeenAt?: string | null }[]) => void;
	trang_thai_hoat_dong: (payload: { userId: string; isOnline: boolean; lastSeenAt?: string | null }) => void;
	san_sang_de_goi: (payload: { conversationId: string }) => void;
	nguoi_dung_ban_goi: (payload: { conversationId: string; targetUserId: string; reason?: string }) => void;
	khong_the_tham_gia_goi: (payload: { conversationId: string; callId?: string; reason?: string }) => void;
	bat_dau_goi_thanh_cong: (payload: {
		conversationId: string;
		callId?: string;
		callType: CallType;
		participants?: string[];
		participantDetails?: CallParticipantDetail[];
		isGroup?: boolean;
		livekitToken?: string | null;
	}) => void;
	cuoc_goi_den: (payload: {
		conversationId: string;
		callId?: string;
		callerId: string;
		callType: CallType;
		startedAt?: string;
		isGroup?: boolean;
		participants?: string[];
		participantDetails?: CallParticipantDetail[];
		name?: string;
		avatar?: string;
		conversationName?: string;
		conversationAvatar?: string;
		groupName?: string;
		groupAvatar?: string;
		callerName?: string;
		callerAvatar?: string;
	}) => void;
	nguoi_dung_tham_gia_goi: (payload: {
		conversationId: string;
		callId?: string;
		userId: string;
		participants: string[];
		participantDetails?: CallParticipantDetail[];
		callType: CallType;
		isGroup?: boolean;
		livekitToken?: string | null;
	}) => void;
	nguoi_dung_roi_goi: (payload: {
		conversationId: string;
		callId?: string;
		userId: string;
		participants: string[];
		reason?: string;
	}) => void;
	ket_thuc_phong_goi: (payload: {
		conversationId: string;
		callId?: string;
		endedBy?: string | null;
		reason?: string;
	}) => void;
	nguoi_dung_tu_choi_goi: (payload: { conversationId: string; callId?: string; userId: string }) => void;
	nhan_offer: (payload: {
		conversationId: string;
		callId?: string;
		fromUserId: string;
		offer: RTCSessionDescriptionInit;
		callType: CallType;
	}) => void;
	nhan_answer: (payload: {
		conversationId: string;
		callId?: string;
		fromUserId: string;
		answer: RTCSessionDescriptionInit;
	}) => void;
	nhan_ice_candidate: (payload: {
		conversationId: string;
		callId?: string;
		fromUserId: string;
		candidate: RTCIceCandidateInit;
	}) => void;
	thay_doi_trang_thai_camera: (payload: {
		conversationId: string;
		callId?: string;
		userId: string;
		isCameraOff: boolean;
	}) => void;
	cap_nhat_trang_thai_goi_nhom: (payload: any) => void;
};

const CALL_ACK_TIMEOUT_MS = 10000;

class ChatSocketService {
	private socket: Socket | null = null;
	private userRoomId: string | null = null;

	private getSocketBaseUrl() {
		// Extract origin (protocol://host:port) to hit the gateway's socket.io proxy
		try {
			const url = new URL(CHAT_API_CONFIG.BASE_URL);
			return `${url.protocol}//${url.host}`;
		} catch {
			return CHAT_API_CONFIG.BASE_URL.replace(/\/riff\/api\/chat\/?$/, '');
		}
	}

	private ensureSocket() {
		if (this.socket) {
			return this.socket;
		}

		const socket = io(this.getSocketBaseUrl(), {
			transports: ['polling', 'websocket'],
			reconnectionAttempts: 10,
			reconnectionDelay: 1200,
			timeout: 10000,
		});

		socket.on('connect', () => {
			console.log('[ChatSocket] connected', socket.id);
		});

		socket.on('disconnect', () => {
			console.log('[ChatSocket] disconnected');
		});

		socket.on('connect_error', (error) => {
			console.error('[ChatSocket] connect_error', error?.message);
		});

		this.socket = socket;
		return socket;
	}

	connect() {
		return this.ensureSocket();
	}

	getSocket() {
		return this.socket;
	}

	disconnect() {
		if (!this.socket) return;
		this.socket.disconnect();
		this.socket = null;
	}

	private emitWhenConnected(event: string, payload: unknown) {
		const socket = this.ensureSocket();
		const action = () => socket.emit(event, payload);

		if (socket.connected) {
			action();
		} else {
			socket.once('connect', action);
		}
	}

	private emitWithAck<T = unknown>(
		event: string,
		payload: unknown,
		timeoutMs = 8000,
	): Promise<T | null> {
		const socket = this.ensureSocket();

		return new Promise((resolve) => {
			let settled = false;
			let connectHandler: (() => void) | null = null;
			let timer: ReturnType<typeof setTimeout> | null = null;
			const finish = (value: T | null) => {
				if (settled) return;
				settled = true;
				if (timer) {
					clearTimeout(timer);
					timer = null;
				}
				if (connectHandler) {
					socket.off('connect', connectHandler);
					connectHandler = null;
				}
				resolve(value);
			};

			const action = () => {
				try {
					socket.timeout(timeoutMs).emit(
						event,
						payload,
						(error: Error | null, response: T) => {
							if (error) {
								finish(null);
								return;
							}
							finish(response ?? null);
						},
					);
				} catch {
					socket.emit(event, payload);
					setTimeout(() => finish(null), 150);
				}
			};

			if (socket.connected) {
				action();
				return;
			}

			timer = setTimeout(() => finish(null), timeoutMs);
			connectHandler = () => {
				if (timer) {
					clearTimeout(timer);
					timer = null;
				}
				action();
			};
			socket.once('connect', connectHandler);
			socket.connect();
		});
	}

	joinUserRoom(userId: string) {
		const socket = this.ensureSocket();
		this.userRoomId = userId;
		const joinAction = () => socket.emit('tham_gia_user_room', userId);

		if (socket.connected) {
			joinAction();
		} else {
			socket.once('connect', joinAction);
		}
	}

	joinConversation(conversationId: string) {
		const socket = this.ensureSocket();
		const joinAction = () => socket.emit('tham_gia_nhom', conversationId);

		if (socket.connected) {
			joinAction();
		} else {
			socket.once('connect', joinAction);
		}
	}

	leaveConversation(conversationId: string) {
		if (!this.socket) return;
		this.socket.emit('roi_nhom_chat', conversationId);
	}

	startTyping(conversationId: string, userId: string) {
		const socket = this.ensureSocket();
		const action = () =>
			socket.emit('nguoi_dung_dang_soan_tin_nhan', { conversationId, userId });

		if (socket.connected) {
			action();
		} else {
			socket.once('connect', action);
		}
	}

	stopTyping(conversationId: string, userId: string) {
		const socket = this.ensureSocket();
		const action = () =>
			socket.emit('nguoi_dung_ngung_soan_tin_nhan', { conversationId, userId });

		if (socket.connected) {
			action();
		} else {
			socket.once('connect', action);
		}
	}

	markMessagesDeliveredUpTo(conversationId: string, userId: string, msgId: string) {
		this.emitWhenConnected('messages_delivered_up_to', {
			conversationId,
			userId,
			msgId,
		});
	}

	markMessageSeenUpTo(conversationId: string, userId: string, msgId: string) {
		this.emitWhenConnected('message_seen_up_to', {
			conversationId,
			userId,
			msgId,
		});
	}

	refreshPresence(userId?: string) {
		const activeUserId = userId || this.userRoomId;
		if (!activeUserId) return;
		this.userRoomId = activeUserId;
		this.emitWhenConnected('presence_heartbeat', { userId: activeUserId });
	}

	queryPresence(userIds: string[]) {
		const uniqueUserIds = Array.from(new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean)));
		if (!uniqueUserIds.length) return;
		this.emitWhenConnected('hoi_trang_thai_hoat_dong', { userIds: uniqueUserIds });
	}

	startCall(
		conversationId: string,
		callerId: string,
		callType: CallType,
		invitedUserIds?: string[],
	) {
		return this.emitWithAck<CallSessionAck>('bat_dau_goi', {
			conversationId,
			callerId,
			callType,
			invitedUserIds,
		}, CALL_ACK_TIMEOUT_MS);
	}

	joinCall(
		conversationId: string,
		userId: string,
		callType: CallType,
		callId?: string | null,
	) {
		return this.emitWithAck<CallSessionAck>('tham_gia_cuoc_goi', {
			conversationId,
			callId,
			userId,
			callType,
		}, CALL_ACK_TIMEOUT_MS);
	}

	leaveCall(conversationId: string, userId: string, callId?: string | null) {
		return this.emitWithAck<CallSessionAck>('roi_cuoc_goi', {
			conversationId,
			callId,
			userId,
		}, 1500);
	}

	leaveAllCallsForLogout(userId: string) {
		return this.emitWithAck<{ ok?: boolean }>('dang_xuat', { userId }, 1200);
	}

	endCall(
		conversationId: string,
		userId: string,
		metadata?: {
			callId?: string | null;
			callType?: CallType;
			wasConnected?: boolean;
			durationSeconds?: number;
		},
	) {
		return this.emitWithAck<{ ok?: boolean }>('ket_thuc_goi', {
			conversationId,
			userId,
			...(metadata || {}),
		});
	}

	declineCall(
		conversationId: string,
		userId: string,
		callerId: string,
		callId?: string | null,
	) {
		this.emitWhenConnected('tu_choi_goi', {
			conversationId,
			callId,
			userId,
			callerId,
		});
	}

	checkCallAvailability(conversationId: string, callerId: string) {
		this.emitWhenConnected('kiem_tra_ban_goi', { conversationId, callerId });
	}

	sendOffer(
		conversationId: string,
		callId: string | null | undefined,
		fromUserId: string,
		targetUserId: string,
		offer: RTCSessionDescriptionInit,
		callType: CallType,
	) {
		this.emitWhenConnected('gui_offer', {
			conversationId,
			callId,
			fromUserId,
			targetUserId,
			offer,
			callType,
		});
	}

	sendAnswer(
		conversationId: string,
		callId: string | null | undefined,
		fromUserId: string,
		targetUserId: string,
		answer: RTCSessionDescriptionInit,
	) {
		this.emitWhenConnected('gui_answer', {
			conversationId,
			callId,
			fromUserId,
			targetUserId,
			answer,
		});
	}

	sendIceCandidate(
		conversationId: string,
		callId: string | null | undefined,
		fromUserId: string,
		targetUserId: string,
		candidate: RTCIceCandidateInit,
	) {
		this.emitWhenConnected('gui_ice_candidate', {
			conversationId,
			callId,
			fromUserId,
			targetUserId,
			candidate,
		});
	}

	emitCameraState(
		conversationId: string,
		userId: string,
		isCameraOff: boolean,
		callId?: string | null,
	) {
		this.emitWhenConnected('trang_thai_camera', {
			conversationId,
			callId,
			userId,
			isCameraOff,
		});
	}

	inviteCallMembers(
		conversationId: string,
		callId: string | null | undefined,
		targetUserIds: string[],
		callerId: string,
	) {
		this.emitWhenConnected('moi_them_thanh_vien_goi', {
			conversationId,
			callId,
			targetUserIds,
			callerId,
		});
	}

	on<K extends keyof ChatSocketEventMap>(event: K, callback: ChatSocketEventMap[K]) {
		this.ensureSocket().on(event, callback as any);
	}

	off<K extends keyof ChatSocketEventMap>(event: K, callback?: ChatSocketEventMap[K]) {
		if (!this.socket) return;
		if (callback) {
			this.socket.off(event, callback as any);
			return;
		}
		this.socket.removeAllListeners(event);
	}
}

export const chatSocket = new ChatSocketService();
