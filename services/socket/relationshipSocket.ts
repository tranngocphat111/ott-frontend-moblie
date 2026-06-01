import { RELATIONSHIP_SOCKET_CONFIG } from '@/configuration/api';
import * as SecureStore from 'expo-secure-store';
import { io, type Socket } from 'socket.io-client';

export type RelationshipEventType =
  | 'REQUEST_SENT'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_CANCELED'
  | 'REQUEST_CANCELLED'
  | 'UNFRIENDED'
  | 'BLOCKED'
  | 'USER_BLOCKED';

export type RelationshipRealtimePayload = {
  type: RelationshipEventType;
  relationshipId: string;
  requesterId?: string | null;
  receiverId?: string | null;
  status?: string | null;
  actorId?: string | null;
  timestamp?: string;
  targetUserIds?: string[];
};

type RelationshipSocketEventMap = {
  cap_nhat_quan_he: (payload: RelationshipRealtimePayload) => void;
  relationship_updated: (payload: RelationshipRealtimePayload) => void;
};

class RelationshipSocketService {
  private socket: Socket | null = null;
  private readonly endpoint = RELATIONSHIP_SOCKET_CONFIG.URL;
  private userRoomId: string | null = null;
  private joinedUserRoomKey: string | null = null;

  private emitJoinUserRoom(socket: Socket, userId: string) {
    const joinKey = `${socket.id || 'pending'}:${userId}`;
    if (this.joinedUserRoomKey === joinKey) return;

    socket.emit('tham_gia_user_room', userId);
    this.joinedUserRoomKey = joinKey;
    console.log(`[RelationshipSocket] joined user room: user:${userId}`);
  }

  async joinUserRoom(userId: string) {
    const socket = await this.ensureSocket();
    this.userRoomId = userId;

    if (socket && socket.connected) {
      this.emitJoinUserRoom(socket, userId);
    }
  }

  private async ensureSocket() {
    if (this.socket) return this.socket;
    if (!this.endpoint) return null;

    const token = await SecureStore.getItemAsync('accessToken');
    const socket = io(this.endpoint, {
      transports: ['websocket', 'polling'],
      timeout: 8000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1200,
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('[RelationshipSocket] connected', socket.id);
      this.joinedUserRoomKey = null;
      if (this.userRoomId) {
        this.emitJoinUserRoom(socket, this.userRoomId);
      }
    });
    socket.on('disconnect', () => {
      console.log('[RelationshipSocket] disconnected');
      this.joinedUserRoomKey = null;
    });
    socket.on('connect_error', (error) => console.warn('[RelationshipSocket] connect_error', error?.message));

    this.socket = socket;
    return socket;
  }

  async connect() {
    return this.ensureSocket();
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.userRoomId = null;
    this.joinedUserRoomKey = null;
  }

  async on<K extends keyof RelationshipSocketEventMap>(event: K, callback: RelationshipSocketEventMap[K]) {
    const socket = await this.ensureSocket();
    socket?.on(event, callback as any);
  }

  off<K extends keyof RelationshipSocketEventMap>(event: K, callback?: RelationshipSocketEventMap[K]) {
    if (callback) {
      this.socket?.off(event, callback as any);
      return;
    }
    this.socket?.removeAllListeners(event);
  }

  async onRelationshipUpdate(callback: (payload: RelationshipRealtimePayload) => void) {
    await this.on('cap_nhat_quan_he', callback);
    await this.on('relationship_updated', callback);
  }

  offRelationshipUpdate(callback?: (payload: RelationshipRealtimePayload) => void) {
    this.off('cap_nhat_quan_he', callback);
    this.off('relationship_updated', callback);
  }
}

export const relationshipSocket = new RelationshipSocketService();
