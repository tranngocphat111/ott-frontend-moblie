import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import { authApi, profileApi, userApi } from '../services/api';
import { authTokenStore } from '../services/api/client';
import { setLogoutHandler } from '../utils/logoutHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfileResponse } from '../types';
import { AppState } from 'react-native';
import {
  registerNativePushNotifications,
  unregisterNativePushNotifications,
} from '@/services/notifications/nativeNotifications';

interface AuthContextType {
  user: UserProfileResponse | null;
  chatUserId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    identifier: string,
    password: string,
    otpCode?: string
  ) => Promise<{
    requires2FA?: boolean;
    tempToken?: string;
    authenticated?: boolean;
  }>;
  verify2FA: (
    tempToken: string,
    otpCode: string,
    isBackupCode: boolean
  ) => Promise<{ authenticated: boolean }>;
  request2FAOtp: (identifier: string) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    phone: string,
    email: string,
    password: string,
    fullName: string,
    otp: string
  ) => Promise<void>;
  updateProfile: (updates: Partial<UserProfileResponse>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const FORCED_LOGOUT_NOTICE_KEY = 'riff_forced_logout_notice';

const FORCED_LOGOUT_NOTICE_MESSAGE =
  'Tài khoản của bạn vừa được đăng nhập ở thiết bị khác. Phiên hiện tại đã được đăng xuất để bảo vệ tài khoản.';

const CACHED_USER_PROFILE_KEY = 'riff_cached_user_profile';

const getErrorCode = (error: unknown): number | undefined => {
  const candidate = error as {
    code?: unknown;
    status?: unknown;
    response?: { status?: unknown };
    details?: { code?: unknown; status?: unknown };
  };

  const value =
    candidate?.response?.status ??
    candidate?.status ??
    candidate?.code ??
    candidate?.details?.status ??
    candidate?.details?.code;

  return typeof value === 'number' ? value : undefined;
};

const isAuthSessionError = (error: unknown) => {
  const code = getErrorCode(error);
  if (code === 401 || code === 403 || code === 1006 || code === 2005 || code === 2006) {
    return true;
  }

  const message = error instanceof Error ? error.message : '';
  return /no refresh token|invalid refresh response/i.test(message);
};

const readCachedUserProfile = async () => {
  const raw = await AsyncStorage.getItem(CACHED_USER_PROFILE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserProfileResponse;
  } catch {
    await AsyncStorage.removeItem(CACHED_USER_PROFILE_KEY);
    return null;
  }
};

const cacheUserProfile = async (profile: UserProfileResponse) => {
  await AsyncStorage.setItem(CACHED_USER_PROFILE_KEY, JSON.stringify(profile));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutInProgressRef = useRef(false);

  const isAuthenticated = !!user;
  const chatUserId = user?.id || null;

  const clearLocalSession = async () => {
    await authTokenStore.clearTokens();
    await AsyncStorage.removeItem(CACHED_USER_PROFILE_KEY);
    setUser(null);
  };

  const forceLocalLogout = async (showNotice = true) => {
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;

    try {
      if (showNotice) {
        await AsyncStorage.setItem(FORCED_LOGOUT_NOTICE_KEY, FORCED_LOGOUT_NOTICE_MESSAGE);
      }

      try {
        const { chatSocket } = await import('../services/socket/chatSocket');
        chatSocket.disconnect();
      } catch (error) {
        console.error('AuthContext: socket cleanup on forced logout failed:', error);
      }

      const currentUserId = user?.id || (await readCachedUserProfile())?.id || null;
      if (currentUserId) {
        await unregisterNativePushNotifications(currentUserId).catch((error) => {
          console.error('AuthContext: push unregister on forced logout failed:', error);
        });
      }

      await clearLocalSession();
      router.replace('/(auth)/login');
    } finally {
      logoutInProgressRef.current = false;
    }
  };

  const refreshStoredSession = async () => {
    const refreshToken = await authTokenStore.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await authApi.refresh({
      token: refreshToken,
      deviceId: (await AsyncStorage.getItem('deviceId')) ?? undefined,
    });

    const nextToken = response.result?.token;
    const nextRefreshToken = response.result?.refreshToken;

    if (!nextToken || !nextRefreshToken) {
      throw new Error('Invalid refresh response');
    }

    await authTokenStore.setTokens(nextToken, nextRefreshToken);

    return nextToken;
  };

  const ensureCurrentTokenActive = async () => {
    const token = await authTokenStore.getAccessToken();
    if (!token) {
      await refreshStoredSession();
      return;
    }

    const response = await authApi.introspect({ token });
    if (response.result?.valid) return;

    await refreshStoredSession();
  };

  const loadCurrentUser = async () => {
    console.log('AuthContext: Fetching user profile...');
    await ensureCurrentTokenActive();
    const response = await profileApi.getCurrentProfile();
    if (response.result) {
      console.log('AuthContext: User profile fetched:', response.result);
      setUser(response.result);
      await cacheUserProfile(response.result);
      return response.result;
    }

    throw new Error('No user data in response');
  };

  // Hợp nhất logic logout: Xóa token và gọi API logout
  const logout = async () => {
    console.log('AuthContext: logout called');
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;

    const logoutUserId = user?.id || null;
    const socketCleanupPromise = import('../services/socket/chatSocket')
      .then(async ({ chatSocket }) => {
        if (logoutUserId) {
          await chatSocket.leaveAllCallsForLogout(logoutUserId);
        }
        chatSocket.disconnect();
      })
      .catch((error) => {
        console.error('AuthContext: call cleanup on logout failed:', error);
      });

    try {
      await unregisterNativePushNotifications(logoutUserId);

      const token = await authTokenStore.getAccessToken();
      if (token) {
        await authApi.logout({
          token,
          deviceId: (await AsyncStorage.getItem('deviceId')) ?? undefined,
        });
        console.log('AuthContext: Logout API call successful');
      }
    } catch (error) {
      console.error('AuthContext: Logout API error:', error);
    } finally {
      await socketCleanupPromise;
      await AsyncStorage.removeItem(FORCED_LOGOUT_NOTICE_KEY);
      await clearLocalSession();

      router.replace('/(auth)/login');
      console.log('AuthContext: Logout completed, tokens cleared');
      logoutInProgressRef.current = false;
    }
  };

  const fetchUser = async () => {
    return await loadCurrentUser();
  };

  const checkAuth = async () => {
    try {
      const token = await authTokenStore.getAccessToken();
      const refreshToken = await authTokenStore.getRefreshToken();
      if (!token && !refreshToken) return;

      const cachedUser = await readCachedUserProfile();
      if (cachedUser) {
        setUser(cachedUser);
      }

      console.log('AuthContext: Found token in SecureStore, fetching user...');
      await loadCurrentUser();
    } catch (error) {
      console.error('AuthContext: checkAuth error:', error);
      if (isAuthSessionError(error)) {
        await forceLocalLogout(false);
        return;
      }

      const cachedUser = await readCachedUserProfile();
      if (cachedUser) {
        setUser(cachedUser);
        console.warn('AuthContext: Keeping cached mobile session after temporary auth bootstrap error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    setLogoutHandler((showNotice = false) => forceLocalLogout(showNotice));
    console.log('AuthContext: logout handler registered');
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const handleUserInfoUpdated = (payload: {
      userId: string;
      fullName?: string;
      avatarUrl?: string;
      coverUrl?: string;
      bio?: string;
      work?: string;
      location?: string;
      relationshipStatus?: string;
      email?: string;
      phone?: string;
    }) => {
      setUser((prevUser) => {
        if (prevUser && prevUser.id === payload.userId) {
          return {
            ...prevUser,
            fullName: payload.fullName ?? prevUser.fullName,
            avatarUrl: payload.avatarUrl ?? prevUser.avatarUrl,
            coverUrl: payload.coverUrl ?? prevUser.coverUrl,
            bio: payload.bio ?? prevUser.bio,
            work: payload.work ?? prevUser.work,
            location: payload.location ?? prevUser.location,
            relationshipStatus: payload.relationshipStatus ?? prevUser.relationshipStatus,
            email: payload.email ?? prevUser.email,
            phone: payload.phone ?? prevUser.phone,
          };
        }
        return prevUser;
      });
    };

    const handleForceLogout = async (payload: { action: string; deviceId?: string; revokedDeviceIds?: string[] }) => {
      console.log('AuthContext: Received buoc_dang_xuat event', payload);
      const { action } = payload;
      const myDeviceId = await AsyncStorage.getItem('deviceId');

      if (action === 'ALL') {
        await forceLocalLogout();
      } else if (action === 'SPECIFIC' && payload.deviceId && myDeviceId === payload.deviceId) {
        await forceLocalLogout();
      } else if (action === 'OTHERS' && myDeviceId && payload.revokedDeviceIds?.includes(myDeviceId)) {
        await forceLocalLogout();
      } else if (action === 'SPECIFIC' || action === 'OTHERS') {
        fetchUser().catch((error) => {
          if (isAuthSessionError(error)) {
            forceLocalLogout(false);
          }
        });
      }
    };

    // Lazy load socket
    import('../services/socket/chatSocket').then(({ chatSocket }) => {
      chatSocket.connect();
      chatSocket.joinUserRoom(user.id);
      chatSocket.on('cap_nhat_thong_tin_ca_nhan', handleUserInfoUpdated);
      chatSocket.on('buoc_dang_xuat', handleForceLogout);
    });

    return () => {
      import('../services/socket/chatSocket').then(({ chatSocket }) => {
        chatSocket.off('cap_nhat_thong_tin_ca_nhan', handleUserInfoUpdated);
        chatSocket.off('buoc_dang_xuat', handleForceLogout);
      });
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attemptCount = 0;

    const clearRetryTimer = () => {
      if (!retryTimer) return;
      clearTimeout(retryTimer);
      retryTimer = null;
    };

    const registerPushToken = async (retry = true) => {
      if (cancelled || !user?.id) return;

      attemptCount += 1;
      try {
        const token = await registerNativePushNotifications(user.id);
        if (token || cancelled || !retry) return;

        if (attemptCount < 5) {
          clearRetryTimer();
          retryTimer = setTimeout(() => {
            void registerPushToken(true);
          }, 15000);
        }
      } catch (error) {
        console.warn('AuthContext: register push notification failed:', error);
        if (!cancelled && retry && attemptCount < 5) {
          clearRetryTimer();
          retryTimer = setTimeout(() => {
            void registerPushToken(true);
          }, 15000);
        }
      }
    };

    void registerPushToken(true);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        attemptCount = 0;
        clearRetryTimer();
        void registerPushToken(true);
      }
    });

    return () => {
      cancelled = true;
      clearRetryTimer();
      subscription.remove();
    };
  }, [isAuthenticated, user?.id]);

  // Removed aggressive 15s polling - the interceptor handles token refresh on 401
  useEffect(() => {
    if (!isAuthenticated) return;

    let lastTokenCheckAt = 0;
    const checkCurrentSession = () => {
      const now = Date.now();
      if (now - lastTokenCheckAt < 15000) return;
      lastTokenCheckAt = now;

      ensureCurrentTokenActive().catch((error) => {
        if (isAuthSessionError(error)) {
          forceLocalLogout(false);
          return;
        }

        console.warn('AuthContext: Session check failed temporarily, keeping stored mobile session:', error);
      });
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkCurrentSession();
      }
    });

    const timer = setInterval(checkCurrentSession, 30000);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [isAuthenticated]);

  const login = async (identifier: string, password: string, otpCode?: string) => {
    const response = await authApi.localLogin({ identifier, password, otpCode });

    if (response.result) {
      if (response.result.requires2FA && response.result.tempToken) {
        return {
          requires2FA: true,
          tempToken: response.result.tempToken,
          authenticated: false,
        };
      }

      if (response.result.token && response.result.refreshToken) {
        await authTokenStore.setTokens(response.result.token, response.result.refreshToken);
        await fetchUser();
        return { authenticated: true };
      }
    }
    throw new Error(response.message || 'Login failed');
  };

  const verify2FA = async (tempToken: string, otpCode: string, isBackupCode: boolean = false) => {
    const response = await authApi.verify2FAOtp({ tempToken, otpCode, isBackupCode });
    if (response.result?.token && response.result?.refreshToken) {
      await authTokenStore.setTokens(response.result.token, response.result.refreshToken);
      await fetchUser();
      return { authenticated: true };
    }
    throw new Error(response.message || '2FA verification failed');
  };

  const request2FAOtp = async (identifier: string) => {
    const response = await authApi.request2FAOtp({ identifier });
    if (!response.result) throw new Error(response.message || 'Failed to send OTP');
  };

  const setTokens = async (accessToken: string, refreshToken: string) => {
    await authTokenStore.setTokens(accessToken, refreshToken);
    await fetchUser();
  };

  const register = async (phone: string, email: string, password: string, fullName: string, otp: string) => {
    const response = await userApi.register({ phone, email, password, fullName, otp });
    if (response.result) {
      await login(phone, password); // Dùng phone khi đăng ký vì đăng ký yêu cầu phone
    }
  };

  const updateProfile = (updates: Partial<UserProfileResponse>) => {
    if (user) {
      const nextUser = { ...user, ...updates };
      setUser(nextUser);
      void cacheUserProfile(nextUser).catch((error) => {
        console.warn('AuthContext: cache updated profile failed:', error);
      });
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        chatUserId,
        isAuthenticated,
        isLoading,
        login,
        verify2FA,
        request2FAOtp,
        setTokens,
        logout,
        register,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
