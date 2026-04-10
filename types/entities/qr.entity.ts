import type { DeviceType, QrCodeStatus, QrCodeType, QrLoginSessionStatus } from '../enums';

export interface QrCode {
  id: string;
  userId?: string;
  qrType: QrCodeType;
  qrData: string;
  deviceId?: string;
  deviceType?: DeviceType;
  deviceInfo?: string;
  ipAddress?: string;
  scannedDeviceId?: string;
  scannedDeviceType?: DeviceType;
  scannedDeviceInfo?: string;
  scannedIpAddress?: string;
  status: QrCodeStatus;
  scannedAt?: string;
  confirmedAt?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  location?: string;
  failedAttempts: number;
}

export interface QrLoginSession {
  id: string;
  qrCodeId: string;
  userId?: string;
  sessionId?: string;
  status: QrLoginSessionStatus;
  authorizedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}