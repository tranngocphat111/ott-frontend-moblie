import type { OtpType } from '../enums';

export interface OtpCode {
  id: string;
  userId?: string;
  phone?: string;
  email?: string;
  code: string;
  type: OtpType;
  isUsed: boolean;
  usedAt?: string;
  expiresAt: string;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
  ipAddress?: string;
  blockedAt?: string;
}