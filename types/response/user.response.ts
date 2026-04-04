import { AccountType, Gender, DeviceType, LoginMethod } from '../enums';

export interface UserResponse {
  id: string;
  phone: string;
  email?: string;
  googleId?: string;
  fullName: string;
  avatarUrl?: string;
  accountType: AccountType;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  hasPassword: boolean;
  hasGoogleLinked: boolean;
  is2FAEnabled: boolean;
  createdAt: string;
}

export interface UserProfileResponse {
  id: string;
  phone: string;
  email?: string;
  googleId?: string;
  fullName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: Gender;
  accountType: AccountType;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  hasPassword: boolean;
  hasGoogleLinked: boolean;
  is2FAEnabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  emailChangedAt?: string;
  phoneChangedAt?: string;
}

export interface SessionInfo {
  id: string;
  deviceId?: string;
  deviceType?: DeviceType;
  deviceName?: string;
  ipAddress?: string;
  location?: string;
  loginMethod?: LoginMethod;
  createdAt: string;
  lastActiveAt?: string;
  expiresAt: string;
  isActive: boolean;
  isCurrent: boolean;
  twoFactorVerified: boolean;
}

export interface UserSessionsResponse {
  sessions: SessionInfo[];
  total: number;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
  sessionsRevoked: number;
}

export interface EmailChangeResponse {
  success: boolean;
  newEmail: string;
  message: string;
  sessionsRevoked: number;
}

export interface PhoneChangeResponse {
  success: boolean;
  newPhone: string;
  message: string;
  sessionsRevoked: number;
}

export interface AccountDeletionResponse {
  success: boolean;
  message: string;
  deletedAt: string;
}

export interface TwoFactorAuthStatus {
  enabled: boolean;
  enabledAt?: string;
  lastUsedAt?: string;
  remainingBackupCodes: number;
}

export interface Enable2FAResponse {
  enabled: boolean;
  backupCodes: string[];
  message: string;
}