import { API_CONFIG, CHAT_API_CONFIG } from '@/configuration/api';
import { triggerLogout } from '@/utils/logoutHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ApiError, ApiResponse, DeviceType } from '../../types';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

export const chatApiClient: AxiosInstance = axios.create({
  baseURL: CHAT_API_CONFIG.BASE_URL,
  timeout: CHAT_API_CONFIG.TIMEOUT,
  headers: CHAT_API_CONFIG.HEADERS,
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Refresh queue (tránh gọi refresh nhiều lần cùng lúc) ─
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// ─── Response interceptor ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response.data,

  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const apiError: ApiError = {
      code: error.response?.data?.code ?? error.response?.status ?? 500,
      message: error.response?.data?.message ?? 'An error occurred',
      details: error.response?.data,
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');

      // Skip refresh cho các route public
      const publicRoutes = [
        '/password/forgot',
        '/password/forgot/otp/verify',
        '/password/forgot/verify',
        '/auth/login',
        '/auth/register',
      ];

      const isPublicRoute = publicRoutes.some((route) =>
        originalRequest.url?.includes(route)
      );

      if (isPublicRoute) {
        return Promise.reject(apiError);
      }

      if (!refreshToken) {
        await triggerLogout();
        return Promise.reject(apiError);
      }

      // Nếu đang refresh rồi → queue lại, chờ token mới
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient.request(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const deviceId = await AsyncStorage.getItem('deviceId') ?? undefined;

        const response = await axios.post<ApiResponse<{ token: string; refreshToken: string }>>(
          `${API_CONFIG.BASE_URL}/auth/refresh`,
          { token: refreshToken, deviceId },
          { headers: API_CONFIG.HEADERS }
        );

        const newToken = response.data.result?.token;
        const newRefreshToken = response.data.result?.refreshToken;

        if (!newToken || !newRefreshToken) {
          throw new Error('Invalid refresh response');
        }

        await SecureStore.setItemAsync('accessToken', newToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);

        onRefreshed(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(originalRequest);
      } catch {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        refreshSubscribers = [];
        await triggerLogout();
        return Promise.reject(apiError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(apiError);
  }
);

chatApiClient.interceptors.response.use(
  (response) => {
    console.log('✅ CHAT API Success:', response.config.url, response.status);
    return response.data;
  },
  async (error: AxiosError<ApiResponse>) => {
    const errorPayload = String(error.response?.data?.message || error.response?.data?.message || '');
    const isPinLimitError =
      error.config?.url?.includes('/pin') &&
      error.response?.status === 400 &&
      /toi da 3|tối đa 3|gioi han 3|giới hạn 3/i.test(errorPayload);

    if (!isPinLimitError) {
      console.error('❌ CHAT API Error:', error.config?.url, 'Status:', error.response?.status);
    }

    const isNetworkError = !error.response;

    const apiError: ApiError = {
      code: error.response?.data?.code || (isNetworkError ? 503 : 500),
      message:
        error.response?.data?.message ||
        (isNetworkError
          ? `Cannot connect to chat-service (${CHAT_API_CONFIG.BASE_URL})`
          : 'An error occurred'),
      details:
        error.response?.data ||
        (isNetworkError
          ? {
              reason: error.message,
              baseUrl: CHAT_API_CONFIG.BASE_URL,
            }
          : undefined),
    };

    return Promise.reject(apiError);
  }
);

export const getDeviceInfo = async () => {
  return {
    deviceId:   await getDeviceId(),
    deviceType: getDeviceType(),
    deviceName: getDeviceName(),
    ipAddress:  undefined,
    deviceInfo: `${Platform.OS} ${Platform.Version}`,
  };
};

const getDeviceId = async (): Promise<string> => {
  let deviceId = await AsyncStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `mobile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await AsyncStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

const getDeviceType = (): DeviceType => {
  if (Device.deviceType === Device.DeviceType.TABLET) return 'TABLET' as DeviceType;
  if (Device.deviceType === Device.DeviceType.PHONE)  return 'MOBILE' as DeviceType;
  return 'MOBILE' as DeviceType;
};

const getDeviceName = (): string => {
  return Device.modelName || Device.deviceName || 'Unknown Device';
};