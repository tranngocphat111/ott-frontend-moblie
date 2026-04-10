export const colors = {
  primary: {
    50: '#f7f3f0',
    100: '#efe7e0',
    200: '#dfc0a4',
    300: '#d0a97e',
    400: '#bc9166',
    500: '#ae7f53',
    600: '#8b6642',
    700: '#694d31',
    800: '#463421',
    900: '#231a10',
  },

  success: {
    bg: '#e8f7ef',
    text: '#1d6f4a',
    border: '#2d9764',
  },

  error: {
    bg: '#fdeaea',
    text: '#9b2c2c',
    border: '#d94f4f',
  },

  warning: {
    bg: '#fff7e6',
    text: '#92400e',
    border: '#d97706',
  },

  info: {
    bg: '#f7f3f0',
    text: '#694d31',
    border: '#bc9166',
  },

  chat: {
    meBg: '#efdccb',
    meText: '#101828',
    otherBg: '#ffffff',
    otherBorder: '#e5e7eb',
    otherText: '#111827',
  },

  surface: '#ffffff',
  surfaceRaised: '#fdfaf7',
  surfaceSunken: '#f2ede8',
} as const;

export const fonts = {
  display: 'Fraunces',
  body: 'SpaceGrotesk',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#463421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#463421',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#463421',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 40,
    elevation: 8,
  },
  xl: {
    shadowColor: '#463421',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 64,
    elevation: 12,
  },
} as const;

export const duration = {
  fast: 150,
  base: 250,
  slow: 400,
  slower: 600,
} as const;

export const tw = {
  bg: {
    primary: 'bg-[#ae7f53]',
    primaryLight: 'bg-[#f7f3f0]',
    primaryDark: 'bg-[#694d31]',
    surface: 'bg-white',
    surfaceRaised: 'bg-[#fdfaf7]',
    surfaceSunken: 'bg-[#f2ede8]',
    success: 'bg-[#e8f7ef]',
    error: 'bg-[#fdeaea]',
    warning: 'bg-[#fff7e6]',
    info: 'bg-[#f7f3f0]',
    chatMe: 'bg-[#efdccb]',
    chatOther: 'bg-white',
    border: 'border-[#e5e7eb]',
  },
  text: {
    primary: 'text-[#ae7f53]',
    primaryDark: 'text-[#231a10]',
    primaryMuted: 'text-[#694d31]',
    success: 'text-[#1d6f4a]',
    error: 'text-[#9b2c2c]',
    warning: 'text-[#92400e]',
    info: 'text-[#694d31]',
    chatMe: 'text-[#101828]',
    chatOther: 'text-[#111827]',
  },
  border: {
    primary: 'border-[#bc9166]',
    primaryLight: 'border-[#efe7e0]',
    success: 'border-[#2d9764]',
    error: 'border-[#d94f4f]',
    warning: 'border-[#d97706]',
    info: 'border-[#bc9166]',
    chatOther: 'border-[#e5e7eb]',
  },
} as const;