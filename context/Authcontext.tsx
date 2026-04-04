import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { profileApi } from '../services/api';
import { setLogoutHandler } from '../utils/logoutHandler';
import type { UserProfileResponse } from '../types';

interface AuthContextType {
  user: UserProfileResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const logout = async () => {
    console.log('AuthContext: logout called');
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        setTokens,
        logout,
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