export const LoginMethod = {
  LOCAL: 'local',
  OTP: 'otp',
  QR_CODE: 'qr_code',
  GOOGLE: 'google',
} as const;

export type LoginMethod = (typeof LoginMethod)[keyof typeof LoginMethod];

export const LoginStatus = {
  SUCCESS: 'success',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  REQUIRES_2FA: 'requires_2fa',
} as const;

export type LoginStatus = (typeof LoginStatus)[keyof typeof LoginStatus];

export const OtpType = {
  REGISTER: 'register',
  EMAIL_VERIFICATION: 'email_verification',
  LOGIN_OTP_EMAIL: 'login_otp_email',
  TWO_FACTOR_AUTH: 'two_factor_auth',
  RESET_PASSWORD: 'reset_password',
  CHANGE_PASSWORD: 'change_password',
  CHANGE_EMAIL: 'change_email',
  CHANGE_PHONE: 'change_phone',
  LINK_GOOGLE_ACCOUNT: 'link_google_account',
  LINK_PHONE: 'link_phone',
  LINK_EMAIL: 'link_email',
  DELETE_ACCOUNT: 'delete_account',
  ENABLE_TWO_FACTOR: 'enable_two_factor',
  DISABLE_TWO_FACTOR: 'disable_two_factor',
} as const;

export type OtpType = (typeof OtpType)[keyof typeof OtpType];