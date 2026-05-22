import type { AccountType, Gender } from '../enums';

export interface User {
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
  phoneVerifiedAt?: string;
  emailVerifiedAt?: string;
  passwordChangedAt?: string;
  emailChangedAt?: string;
  phoneChangedAt?: string;
  isActive: boolean;
  isBlocked: boolean;
  blockedUntil?: string;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  lastLoginAt?: string;
  isFirstLogin: boolean;
  welcomeEmailSent: boolean;
  welcomeEmailSentAt?: string;
};

export interface TwoFactorAuth {
  userId: string;
  isEnabled: boolean;
  secretKey?: string;
  backupCodes?: string[];
  enabledAt?: string;
  disabledAt?: string;
  lastUsedAt?: string;
  backupCodesUsed: number;
  totalBackupCodes: number;
  createdAt: string;
  updatedAt: string;
}