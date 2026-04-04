export const QrCodeStatus = {
  PENDING: 'pending',
  SCANNED: 'scanned',
  CONFIRMED: 'confirmed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type QrCodeStatus =
  typeof QrCodeStatus[keyof typeof QrCodeStatus];


// QrCodeType
export const QrCodeType = {
  LOGIN: 'login',
  PAYMENT: 'payment',
  ADD_FRIEND: 'add_friend',
} as const;

export type QrCodeType =
  typeof QrCodeType[keyof typeof QrCodeType];


// QrLoginSessionStatus
export const QrLoginSessionStatus = {
  WAITING: 'waiting',
  AUTHORIZED: 'authorized',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type QrLoginSessionStatus =
  typeof QrLoginSessionStatus[keyof typeof QrLoginSessionStatus];
