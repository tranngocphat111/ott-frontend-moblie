import type { EmailStatus, EmailType } from '../enums';

export interface EmailLog {
  id: string;
  userId?: string;
  emailTo: string;
  emailType: EmailType;
  subject?: string;
  templateName?: string;
  status: EmailStatus;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  sentAt?: string;
  failedAt?: string;
}