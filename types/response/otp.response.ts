export interface OtpResponse {
  phone?: string;
  email?: string;
  expiresAt: string;
  message: string;
}