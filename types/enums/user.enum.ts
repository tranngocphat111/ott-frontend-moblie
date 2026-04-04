export const AccountType = {
  USER: 'user',
  OA: 'oa',
  ADMIN: 'admin',
} as const;

export type AccountType =
  typeof AccountType[keyof typeof AccountType];


export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;

export type Gender = typeof Gender[keyof typeof Gender];
