export const PhotoType = {
  AVATAR: 'AVATAR',
  COVER: 'COVER',
} as const;

export type PhotoType = (typeof PhotoType)[keyof typeof PhotoType];