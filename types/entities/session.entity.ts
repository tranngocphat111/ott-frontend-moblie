import type { DeviceType, LoginMethod } from '../enums';

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken?: string;
  deviceId?: string;
  deviceType?: DeviceType;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  loginMethod?: LoginMethod;
  twoFactorVerified: boolean;
  twoFactorVerifiedAt?: string;
  isActive: boolean;
  expiresAt: string;
  refreshExpiresAt?: string;
  createdAt: string;
  lastActiveAt?: string;
  revokedAt?: string;
  revokedReason?: string;
}

export interface InvalidatedToken {
  id: string;
  expiryTime: string;
  userId?: string;
  tokenType?: string;
  invalidatedAt: string;
  reason?: string;
}

export interface LoginHistory {
  id: string;
  userId?: string;
  ipAddress?: string;
  deviceType?: DeviceType;
  deviceId?: string;
  userAgent?: string;
  loginMethod: LoginMethod;
  status: LoginStatus;
  location?: string;
  qrCodeId?: string;
  failureReason?: string;
  createdAt: string;
}