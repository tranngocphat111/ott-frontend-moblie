export const DeviceType = {
  MOBILE: 'MOBILE',
  TABLET: 'TABLET',
  TV: 'TV',
  DESKTOP: 'DESKTOP',
  UNKNOWN: 'UNKNOWN',
} as const;

export type DeviceType = typeof DeviceType[keyof typeof DeviceType];