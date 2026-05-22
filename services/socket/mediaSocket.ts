import { MEDIA_SOCKET_CONFIG } from '@/configuration/api';
import * as SecureStore from 'expo-secure-store';
import { io, type Socket } from 'socket.io-client';

export type MediaRealtimeUpdate = {
  mediaId?: string | null;
  s3Key?: string | null;
  orderIndex?: number | null;
};

export type MediaRealtimePayload = {
  contentId?: string | null;
  contentTargetType?: string | null;
  operation?: string | null;
  mediaUpdates?: MediaRealtimeUpdate[];
  s3Keys?: string[];
  status?: string;
  timestamp?: string;
};

export type PostActivityPayload = {
  postId: string;
  activityType: 'COMMENT' | 'REACTION' | 'SHARE' | 'VIEW';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  data?: any;
};

type MediaSocketEventMap = {
  media_content_updated: (payload: MediaRealtimePayload) => void;
  post_activity_updated: (payload: PostActivityPayload) => void;
};

class MediaSocketService {
  private socket: Socket | null = null;
  private readonly endpoint = MEDIA_SOCKET_CONFIG.URL;

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

    socket.on('connect', () => console.log('[MediaSocket] connected', socket.id));
    socket.on('disconnect', () => console.log('[MediaSocket] disconnected'));
    socket.on('connect_error', (error) => console.warn('[MediaSocket] connect_error', error?.message));

    this.socket = socket;
    return socket;
  }

  async connect() {
    return this.ensureSocket();
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  async on<K extends keyof MediaSocketEventMap>(event: K, callback: MediaSocketEventMap[K]) {
    const socket = await this.ensureSocket();
    socket?.on(event, callback as any);
  }

  off<K extends keyof MediaSocketEventMap>(event: K, callback?: MediaSocketEventMap[K]) {
    if (callback) {
      this.socket?.off(event, callback as any);
      return;
    }
    this.socket?.removeAllListeners(event);
  }

  async onMediaUpdate(callback: (payload: MediaRealtimePayload) => void) {
    await this.on('media_content_updated', callback);
  }

  offMediaUpdate(callback?: (payload: MediaRealtimePayload) => void) {
    this.off('media_content_updated', callback);
  }

  async onPostActivity(callback: (payload: PostActivityPayload) => void) {
    await this.on('post_activity_updated', callback);
  }

  offPostActivity(callback?: (payload: PostActivityPayload) => void) {
    this.off('post_activity_updated', callback);
  }
}

export const mediaSocket = new MediaSocketService();
