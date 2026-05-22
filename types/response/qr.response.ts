import { QrCodeStatus } from '../enums';

export interface QrCodeResponse {
  qrId: string;
  qrData: string;
  status: QrCodeStatus;
  expiresAt: string;
  expirySeconds: number;
}

export interface QrStatusResponse {
  qrId: string;
  status: QrCodeStatus;
  message?: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
  sessionToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}