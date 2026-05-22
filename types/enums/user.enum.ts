export const AccountType = {
  USER: 'user',
  OA: 'oa',
  ADMIN: 'admin',
} as const;

export type AccountType =
  typeof AccountType[keyof typeof AccountType];


export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;

export type Gender = typeof Gender[keyof typeof Gender];
