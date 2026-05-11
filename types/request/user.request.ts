import { Gender } from '../enums';

export interface ForgotPasswordRequest {
  phone?: string;
  email?: string;
  ipAddress?: string;
}

export interface VerifyPasswordResetRequest {
  phone?: string;
  email?: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
  ipAddress?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  ipAddress?: string;
}

export interface SetPasswordRequest {
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  bio?: string;
  work?: string;
  location?: string;
  relationshipStatus?: string;
  dateOfBirth?: string;
  gender?: Gender;
  avatarUrl?: string;
  coverUrl?: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  otp: string;
  ipAddress?: string;
}

export interface ChangePhoneRequest {
  newPhone: string;
  otp: string;
  ipAddress?: string;
}

export interface LinkEmailRequest {
  email?: string;
  otp?: string;
  ipAddress?: string;
}

export interface LinkPhoneRequest {
  phone?: string;
  otp?: string;
  ipAddress?: string;
}

export interface DeleteAccountRequest {
  otp: string;
  password?: string;
  ipAddress?: string;
}

export interface Enable2FARequest {
  otp: string;
}

export interface Disable2FARequest {
  password: string;
  otp: string;
}

export interface VerifyForgotOtpRequest {
  phone: string;
  email: string;
  otp: string;
}