import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/contexts/Authcontext';
import { chatSocket } from '@/services/socket/chatSocket';
import { parseBackendDate } from '@/utils/time';

type PresenceEntry = {
  isOnline: boolean;
  lastSeenAt: Date | null;
};

type PresenceContextValue = {
  isUserOnline: (userId?: string | null) => boolean;
  getLastSeen: (userId?: string | null) => Date | null;
  watchUsers: (userIds: Array<string | null | undefined>) => void;
};

const PresenceContext = createContext<PresenceContextValue | undefined>(undefined);

const normalizeId = (value?: string | null) => String(value || '').trim();

export const PresenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, chatUserId, user } = useAuth();
  const currentUserId = normalizeId(chatUserId || user?.id);
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceEntry>>(new Map());
  const watchedRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<string[]>([]);
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePresence = useCallback((userId: string, entry: Partial<PresenceEntry>) => {
    const normalized = normalizeId(userId);
    if (!normalized) return;

    setPresenceMap((current) => {
      const previous = current.get(normalized) || { isOnline: false, lastSeenAt: null };
      const next = new Map(current);
      next.set(normalized, { ...previous, ...entry });
      return next;
    });
  }, []);

  const flushPresenceQuery = useCallback(() => {
    const batch = Array.from(new Set(pendingRef.current));
    pendingRef.current = [];
    if (batch.length > 0) {
      chatSocket.queryPresence(batch);
    }
  }, []);

  const watchUsers = useCallback(
    (userIds: Array<string | null | undefined>) => {
      if (!isAuthenticated) return;

      const nextIds = userIds
        .map((id) => normalizeId(id))
        .filter((id) => id && id !== currentUserId && !watchedRef.current.has(id));

      if (!nextIds.length) return;

      nextIds.forEach((id) => watchedRef.current.add(id));
      pendingRef.current.push(...nextIds);

      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      batchTimerRef.current = setTimeout(flushPresenceQuery, 120);
    },
    [currentUserId, flushPresenceQuery, isAuthenticated],
  );

  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;

    chatSocket.connect();
    chatSocket.joinUserRoom(currentUserId);
    chatSocket.refreshPresence(currentUserId);

    const heartbeat = setInterval(() => {
      chatSocket.refreshPresence(currentUserId);
    }, 30000);

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        chatSocket.refreshPresence(currentUserId);
        const watched = Array.from(watchedRef.current);
        if (watched.length) chatSocket.queryPresence(watched);
      }
    });

    const handlePresenceResult = (
      result: { userId: string; isOnline: boolean; lastSeenAt?: string | null }[],
    ) => {
      setPresenceMap((current) => {
        const next = new Map(current);
        result.forEach((item) => {
          const userId = normalizeId(item.userId);
          if (!userId) return;
          const previous = next.get(userId) || { isOnline: false, lastSeenAt: null };
          next.set(userId, {
            ...previous,
            isOnline: item.isOnline,
            lastSeenAt: parseBackendDate(item.lastSeenAt) || previous.lastSeenAt,
          });
        });
        return next;
      });
    };

    const handlePresenceChanged = (payload: {
      userId: string;
      isOnline: boolean;
      lastSeenAt?: string | null;
    }) => {
      updatePresence(payload.userId, {
        isOnline: payload.isOnline,
        lastSeenAt: parseBackendDate(payload.lastSeenAt),
      });
    };

    chatSocket.on('ket_qua_trang_thai_hoat_dong', handlePresenceResult);
    chatSocket.on('trang_thai_hoat_dong', handlePresenceChanged);

    return () => {
      clearInterval(heartbeat);
      appStateSubscription.remove();
      chatSocket.off('ket_qua_trang_thai_hoat_dong', handlePresenceResult);
      chatSocket.off('trang_thai_hoat_dong', handlePresenceChanged);
    };
  }, [currentUserId, isAuthenticated, updatePresence]);

  useEffect(() => {
    if (isAuthenticated) return;
    watchedRef.current.clear();
    pendingRef.current = [];
    setPresenceMap(new Map());
  }, [isAuthenticated]);

  const isUserOnline = useCallback(
    (userId?: string | null) => {
      const normalized = normalizeId(userId);
      return normalized ? presenceMap.get(normalized)?.isOnline ?? false : false;
    },
    [presenceMap],
  );

  const getLastSeen = useCallback(
    (userId?: string | null) => {
      const normalized = normalizeId(userId);
      return normalized ? presenceMap.get(normalized)?.lastSeenAt ?? null : null;
    },
    [presenceMap],
  );

  return (
    <PresenceContext.Provider value={{ isUserOnline, getLastSeen, watchUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within PresenceProvider');
  }
  return context;
};
