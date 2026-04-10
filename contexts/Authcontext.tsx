import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { authApi, profileApi, userApi } from '../services/api';
import { setLogoutHandler } from '../utils/logoutHandler';
import type { UserProfileResponse } from '../types';

interface AuthContextType {
  user: UserProfileResponse | null;
  chatUserId: string | null; // Từ file ngắn: ID cho chat (mock hoặc real)
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    phone: string,
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
  request2FAOtp: (phone: string) => Promise<void>;
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
  setChatUserId: (userId: string) => Promise<void>; // Từ file ngắn
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [chatUserId, setChatUserIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Hợp nhất logic logout: Xóa token, xóa chat ID và gọi API logout
  const logout = async () => {
    console.log('AuthContext: logout called');
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        // Gọi API để revoke token phía server (từ file dài)
        await authApi.logout({ token });
        console.log('AuthContext: Logout API call successful');
      }
    } catch (error) {
      console.error('AuthContext: Logout API error:', error);
    } finally {
      // Xóa tất cả storage (kết hợp cả 2 file)
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('mockChatUserId');
      
      // Reset state
      setUser(null);
      setChatUserIdState(null);
      
      router.replace('/login');
      console.log('AuthContext: Logout completed, tokens and chat user cleared');
    }
  };

  const fetchUser = async () => {
    try {
      console.log('AuthContext: Fetching user profile...');
      const response = await profileApi.getCurrentProfile();
      if (response.result) {
        console.log('AuthContext: User profile fetched:', response.result);
        setUser(response.result);
        return response.result;
      } else {
        throw new Error('No user data in response');
      }
    } catch (error) {
      console.error('AuthContext: Failed to fetch user:', error);
      await logout(); // File ngắn yêu cầu logout khi fetch lỗi
      throw error;
    }
  };

  const checkAuth = async () => {
    try {
      // 1. Kiểm tra mock chat user ID (từ file ngắn)
      const mockChatUserIdFromStorage = await SecureStore.getItemAsync('mockChatUserId');
      if (mockChatUserIdFromStorage) {
        console.log('[AuthContext] Found mock chat user ID:', mockChatUserIdFromStorage);
        setChatUserIdState(mockChatUserIdFromStorage);
      }

      // 2. Kiểm tra token đăng nhập (từ file dài)
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        console.log('AuthContext: Found token in SecureStore, fetching user...');
        await fetchUser();
      }
    } catch (error) {
      console.error('AuthContext: checkAuth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Đăng ký logout handler để interceptor có thể gọi khi gặp 401
  useEffect(() => {
    setLogoutHandler(logout);
    console.log('AuthContext: logout handler registered');
  }, []);

  // Polling logic: Kiểm tra session mỗi 15 giây (có trong cả 2 file)
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('AuthContext: starting session polling (15s interval)');
    const poll = setInterval(async () => {
      try {
        await profileApi.getCurrentProfile();
        console.log('AuthContext: session still valid');
      } catch {
        // Interceptor sẽ tự trigger logout thông qua logoutHandler đã set ở trên
      }
    }, 15000);

    return () => {
      console.log('AuthContext: stopping session polling');
      clearInterval(poll);
    };
  }, [isAuthenticated]);

  // --- Các hàm chức năng từ file dài ---

  const login = async (phone: string, password: string, otpCode?: string) => {
    const response = await authApi.localLogin({ phone, password, otpCode });

    if (response.result) {
      if (response.result.requires2FA && response.result.tempToken) {
        return {
          requires2FA: true,
          tempToken: response.result.tempToken,
          authenticated: false,
        };
      }

      if (response.result.token && response.result.refreshToken) {
        await SecureStore.setItemAsync('accessToken', response.result.token);
        await SecureStore.setItemAsync('refreshToken', response.result.refreshToken);
        await fetchUser();
        return { authenticated: true };
      }
    }
    throw new Error(response.message || 'Login failed');
  };

  const verify2FA = async (tempToken: string, otpCode: string, isBackupCode: boolean = false) => {
    const response = await authApi.verify2FAOtp({ tempToken, otpCode, isBackupCode });
    if (response.result?.token && response.result?.refreshToken) {
      await SecureStore.setItemAsync('accessToken', response.result.token);
      await SecureStore.setItemAsync('refreshToken', response.result.refreshToken);
      await fetchUser();
      return { authenticated: true };
    }
    throw new Error(response.message || '2FA verification failed');
  };

  const request2FAOtp = async (phone: string) => {
    const response = await authApi.request2FAOtp({ phone });
    if (!response.result) throw new Error(response.message || 'Failed to send OTP');
  };

  const setTokens = async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await fetchUser();
  };

  const register = async (phone: string, email: string, password: string, fullName: string, otp: string) => {
    const response = await userApi.register({ phone, email, password, fullName, otp });
    if (response.result) {
      await login(phone, password);
    }
  };

  const updateProfile = (updates: Partial<UserProfileResponse>) => {
    if (user) setUser({ ...user, ...updates });
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  // --- Hàm chức năng từ file ngắn ---

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
        login,
        verify2FA,
        request2FAOtp,
        setTokens,
        logout,
        register,
        updateProfile,
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