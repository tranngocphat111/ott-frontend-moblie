import type { DeviceType } from '../enums';

export interface LocalLoginRequest {
  phone: string;
  password: string;
  otpCode?: string;
  deviceId?: string;
  deviceType?: DeviceType;
  deviceName?: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
}

export interface GoogleAuthRequest {
  code: string;
  redirectUri?: string;
  deviceId?: string;
  deviceType?: DeviceType;
  deviceName?: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
}

export interface Verify2FARequest {
  tempToken: string;
  otpCode: string;
  deviceId?: string;
  deviceType?: DeviceType;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface RefreshRequest {
  token: string;
  deviceId?: string;
}

export interface LogoutRequest {
  token?: string;
  deviceId?: string;
}

export interface IntrospectRequest {
  token: string;
}

export interface RequestRegisterOtpRequest {
  phone: string;
  fullName: string;
  email: string;
  ipAddress?: string;
  location?: string;
}

export interface RegisterRequest {
  phone: string;
  email: string;
  password: string;
  fullName: string;
  otp: string;
  deviceId?: string;
  deviceType?: DeviceType;
  deviceName?: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
}

export interface CompleteGoogleRegistrationRequest {
  tempToken: string;
  phone: string;
  deviceId?: string;
  deviceType?: DeviceType;
  deviceName?: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
}