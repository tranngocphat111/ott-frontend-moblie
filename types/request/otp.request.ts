export interface RequestEmailOtpRequest {
  email: string;
  ipAddress?: string;
}

export interface RequestPhoneOtpRequest {
  phone: string;
  ipAddress?: string;
}

export interface Request2FAOtpRequest {
  identifier: string;
  ipAddress?: string;
  location?: string;
}

export interface RequestChangeEmailOtpRequest {
  newEmail: string;
  ipAddress?: string;
}

export interface RequestChangePhoneOtpRequest {
  newPhone: string;
  ipAddress?: string;
}

export interface Request2FAEnableOtpRequest {
  ipAddress?: string;
}

export interface Request2FADisableOtpRequest {
  password: string;
  ipAddress?: string;
}

export interface RequestDeleteAccountOtpRequest {
  ipAddress?: string;
  password?: string;
}