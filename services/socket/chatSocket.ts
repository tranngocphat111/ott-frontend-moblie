import { io, type Socket } from 'socket.io-client';
import { CHAT_API_CONFIG } from '@/configuration/api';

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
	xoa_thanh_vien: (payload: any) => void;
	bi_xoa_khoi_nhom: (payload: any) => void;
	roi_nhom: (payload: any) => void;
	tin_nhan_cap_nhat: (payload: any) => void;
	cap_nhat_quan_he: (payload: any) => void;
	cap_nhat_thong_tin_ca_nhan: (payload: any) => void;
	buoc_dang_xuat: (payload: any) => void;
};

class ChatSocketService {
	private socket: Socket | null = null;

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

	disconnect() {
		if (!this.socket) return;
		this.socket.disconnect();
		this.socket = null;
	}

	joinUserRoom(userId: string) {
		const socket = this.ensureSocket();
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
