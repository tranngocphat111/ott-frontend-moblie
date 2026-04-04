import { DeviceType } from '../enums';

export interface QrGenerateRequest {
  deviceId?: string;
  deviceType?: DeviceType;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface QrScanRequest {
  qrData?: string;
  deviceId?: string;
  deviceType?: DeviceType;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
}

export interface QrConfirmRequest {
  qrId: string;
  confirmed: boolean;
}