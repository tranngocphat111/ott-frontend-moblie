export const DeviceType = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  TV: 'tv',
  DESKTOP: 'desktop',
  UNKNOWN: 'unknown',
} as const;

export type DeviceType = typeof DeviceType[keyof typeof DeviceType];