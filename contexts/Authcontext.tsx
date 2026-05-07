import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { authApi, profileApi, userApi } from '../services/api';
import { setLogoutHandler } from '../utils/logoutHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfileResponse } from '../types';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const chatUserId = user?.id || null;

  // Hợp nhất logic logout: Xóa token và gọi API logout
  const logout = async () => {
    console.log('AuthContext: logout called');
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        await authApi.logout({ token });
        console.log('AuthContext: Logout API call successful');
      }
    } catch (error) {
      console.error('AuthContext: Logout API error:', error);
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('mockChatUserId'); // Clean up any legacy mock data

      setUser(null);

      router.replace('/login');
      console.log('AuthContext: Logout completed, tokens cleared');
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
      await logout();
      throw error;
    }
  };

  const checkAuth = async () => {
    try {
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

  useEffect(() => {
    setLogoutHandler(logout);
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
        await logout();
      } else if (action === 'SPECIFIC' && payload.deviceId && myDeviceId === payload.deviceId) {
        await logout();
      } else if (action === 'OTHERS' && myDeviceId && payload.revokedDeviceIds?.includes(myDeviceId)) {
        await logout();
      } else if (action === 'SPECIFIC' || action === 'OTHERS') {
        fetchUser().catch(() => {
          logout();
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
    if (!isAuthenticated) return;

    const poll = setInterval(async () => {
      try {
        await profileApi.getCurrentProfile();
      } catch {
        // Interceptor handles logout
      }
    }, 15000);

    return () => clearInterval(poll);
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

  const request2FAOtp = async (identifier: string) => {
    const response = await authApi.request2FAOtp({ identifier });
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
      await login(phone, password); // Dùng phone khi đăng ký vì đăng ký yêu cầu phone
    }
  };

  const updateProfile = (updates: Partial<UserProfileResponse>) => {
    if (user) setUser({ ...user, ...updates });
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