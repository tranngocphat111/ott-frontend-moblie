export const QrCodeStatus = {
  PENDING: 'PENDING',
  SCANNED: 'SCANNED',
  CONFIRMED: 'CONFIRMED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type QrCodeStatus =
  typeof QrCodeStatus[keyof typeof QrCodeStatus];


// QrCodeType
export const QrCodeType = {
  LOGIN: 'LOGIN',
  PAYMENT: 'PAYMENT',
  ADD_FRIEND: 'ADD_FRIEND',
} as const;

export type QrCodeType =
  typeof QrCodeType[keyof typeof QrCodeType];


// QrLoginSessionStatus
export const QrLoginSessionStatus = {
  WAITING: 'WAITING',
  AUTHORIZED: 'AUTHORIZED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

export type QrLoginSessionStatus =
  typeof QrLoginSessionStatus[keyof typeof QrLoginSessionStatus];