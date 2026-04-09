import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { profileApi } from '../services/api';
import { setLogoutHandler } from '../utils/logoutHandler';
import type { UserProfileResponse } from '../types';

interface AuthContextType {
  user: UserProfileResponse | null;
  chatUserId: string | null; // Separate ID for chat queries (mock or real)
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setChatUserId: (userId: string) => Promise<void>; // Set mock chat user ID
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [chatUserId, setChatUserIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const logout = async () => {
    console.log('AuthContext: logout called');
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    // Also clear mock chat user
    await SecureStore.deleteItemAsync('mockChatUserId');
    setChatUserIdState(null);
    setUser(null);
    router.replace('/login');
  };

  const fetchUser = async () => {
    try {
      const response = await profileApi.getCurrentProfile();
      if (response.result) {
        setUser(response.result);
      }
    } catch (error) {
      await logout();
    }
  };

  const checkAuth = async () => {
    try {
      // Check for mock chat user ID (for demo mode)
      const mockChatUserIdFromStorage = await SecureStore.getItemAsync('mockChatUserId');
      if (mockChatUserIdFromStorage) {
        console.log('[AuthContext] Using mock chat user ID:', mockChatUserIdFromStorage);
        setChatUserIdState(mockChatUserIdFromStorage);
      }

      // Always try to fetch real user from auth token
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        await fetchUser();
      }
    } catch (error) {
      console.error('checkAuth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Đăng ký logout handler để interceptor có thể gọi
  useEffect(() => {
    setLogoutHandler(logout);
    console.log('AuthContext: logout handler registered');
  }, []);

  // Poll mỗi 15 giây để detect session bị revoke từ thiết bị khác
  // Khi đổi mật khẩu trên web/app khác → token bị revoke → poll nhận 401
  // → interceptor tự xử lý refresh → refresh cũng 401 → triggerLogout → logout
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('AuthContext: starting session polling (15s interval)');

    const poll = setInterval(async () => {
      try {
        await profileApi.getCurrentProfile();
        console.log('AuthContext: session still valid');
      } catch {
        // Interceptor tự xử lý 401 → triggerLogout
        // Không cần làm gì ở đây
      }
    }, 15000); // 15 giây

    return () => {
      console.log('AuthContext: stopping session polling');
      clearInterval(poll);
    };
  }, [isAuthenticated]);

  const setTokens = async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await fetchUser();
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const setChatUserId = async (userId: string) => {
    await SecureStore.setItemAsync('mockChatUserId', userId);
    setChatUserIdState(userId);
    console.log('[AuthContext] Set mock chat user ID:', userId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        chatUserId,
        isAuthenticated,
        isLoading,
        setTokens,
        logout,
        refreshUser,
        setChatUserId,
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