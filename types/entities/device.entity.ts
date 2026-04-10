import type { DeviceType } from '../enums';

export interface DeviceToken {
  id: string;
  userId: string;
  deviceId: string;
  deviceType: DeviceType;
  deviceName?: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}