import { API_CONFIG } from '@/configuration/api';
import { triggerLogout } from '@/utils/logoutHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios, { AxiosError } from 'axios';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ApiError, ApiResponse } from '../../types';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
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

apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', response.config.url, response.status);
    return response.data;
  },
  async (error: AxiosError<ApiResponse>) => {
    console.error('❌ API Error:', error.config?.url, 'Status:', error.response?.status);

    const apiError: ApiError = {
      code: error.response?.data?.code || 500,
      message: error.response?.data?.message || 'An error occurred',
      details: error.response?.data,
    };

    if (error.response?.status === 401) {
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');

        if (!refreshToken) {
          console.log('No refresh token, triggering logout...');
          await triggerLogout();
          return Promise.reject(apiError);
        }

        console.log('Attempting token refresh...');
        const response = await axios.post<ApiResponse>(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { token: refreshToken }
        );

        if (response.data.result) {
          const { token, refreshToken: newRefreshToken } = response.data.result;
          await SecureStore.setItemAsync('accessToken', token);
          await SecureStore.setItemAsync('refreshToken', newRefreshToken);

          if (error.config) {
            error.config.headers.Authorization = `Bearer ${token}`;
            return apiClient.request(error.config);
          }
        }
      } catch (refreshError: any) {
        console.log('🔴 Refresh failed:', refreshError?.response?.status, refreshError?.message);
        // Refresh thất bại → xóa token và logout
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        await triggerLogout();
      }
    }

    return Promise.reject(apiError);
  }
);

export const getDeviceInfo = async () => {
  return {
    deviceId: await getDeviceId(),
    deviceType: getDeviceType(),
    deviceName: getDeviceName(),
    ipAddress: undefined,
    deviceInfo: `${Platform.OS} ${Platform.Version}`,
  };
};

const getDeviceId = async (): Promise<string> => {
  let deviceId = await AsyncStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await AsyncStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

const getDeviceType = (): string => {
  if (Device.deviceType === Device.DeviceType.TABLET) return 'TABLET';
  if (Device.deviceType === Device.DeviceType.PHONE) return 'MOBILE';
  return 'MOBILE';
};

const getDeviceName = (): string => {
  return Device.modelName || Device.deviceName || 'Unknown Device';
};