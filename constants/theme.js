const THEME_TOKENS = {
  colors: {
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
      me: '#efdccb',
      meText: '#101828',
      other: '#ffffff',
      otherBorder: '#e5e7eb',
      otherText: '#111827',
    },
    surface: {
      DEFAULT: '#ffffff',
      raised: '#fdfaf7',
      sunken: '#f2ede8',
    },
    neutral: {
      white: '#ffffff',
      black: '#000000',
      slate300: '#cbd5e1',
      slate400: '#94a3b8',
      slate500: '#64748b',
      slate600: '#475569',
      slate700: '#334155',
      gray500: '#6b7280',
      gray700: '#374151',
      blue500: '#3b82f6',
      blue600: '#2563eb',
      red500: '#ef4444',
      red600: '#dc2626',
      green500: '#22c55e',
      amber500: '#f59e0b',
    },
  },
  backgroundImage: {
    gradientPrimary: 'linear-gradient(135deg, #ae7f53, #dfc0a4)',
    gradientSidebar: 'linear-gradient(180deg, #8b6642, #bc9166)',
    gradientChat: 'linear-gradient(135deg, #efe7e0, #dfc0a4)',
    gradientSubtle: 'linear-gradient(180deg, #f7f3f0 0%, #ffffff 100%)',
  },
  boxShadow: {
    sm: '0 1px 3px rgba(70,52,33,0.08), 0 1px 2px rgba(70,52,33,0.04)',
    md: '0 4px 16px rgba(70,52,33,0.10), 0 1px 4px rgba(70,52,33,0.06)',
    lg: '0 12px 40px rgba(70,52,33,0.14), 0 4px 12px rgba(70,52,33,0.08)',
    xl: '0 24px 64px rgba(70,52,33,0.18), 0 8px 24px rgba(70,52,33,0.10)',
    soft: '0 3px 14px rgba(70,52,33,0.08)',
    card: '0 10px 28px rgba(70,52,33,0.12)',
  },
  duration: {
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
    slower: '600ms',
  },
  easing: {
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
  fontFamily: {
    display: ['Fraunces', 'Georgia', 'serif'],
    body: ['Space Grotesk', 'system-ui', 'sans-serif'],
  },
};

const THEME_COLORS = THEME_TOKENS.colors;

const colors = {
  primary: THEME_COLORS.primary,
  success: THEME_COLORS.success,
  error: THEME_COLORS.error,
  warning: THEME_COLORS.warning,
  info: THEME_COLORS.info,
  chat: {
    meBg: THEME_COLORS.chat.me,
    meText: THEME_COLORS.chat.meText,
    otherBg: THEME_COLORS.chat.other,
    otherBorder: THEME_COLORS.chat.otherBorder,
    otherText: THEME_COLORS.chat.otherText,
  },
  surface: THEME_COLORS.surface.DEFAULT,
  surfaceRaised: THEME_COLORS.surface.raised,
  surfaceSunken: THEME_COLORS.surface.sunken,
};

const fonts = {
  display: 'Fraunces',
  body: 'SpaceGrotesk',
};

const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const spacing = {
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
};

const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

const shadows = {
  sm: {
    shadowColor: colors.primary[800],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: colors.primary[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.primary[800],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 40,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.primary[800],
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 64,
    elevation: 12,
  },
};

const duration = {
  fast: 150,
  base: 250,
  slow: 400,
  slower: 600,
};

const tw = {
  bg: {
    primary: 'bg-primary-500',
    primaryLight: 'bg-primary-50',
    primaryDark: 'bg-primary-700',
    surface: 'bg-surface',
    surfaceRaised: 'bg-surface-raised',
    surfaceSunken: 'bg-surface-sunken',
    success: 'bg-success-bg',
    error: 'bg-error-bg',
    warning: 'bg-warning-bg',
    info: 'bg-info-bg',
    chatMe: 'bg-chat-me',
    chatOther: 'bg-chat-other',
    border: 'border-chat-otherBorder',
  },
  text: {
    primary: 'text-primary-500',
    primaryDark: 'text-primary-900',
    primaryMuted: 'text-primary-700',
    success: 'text-success-text',
    error: 'text-error-text',
    warning: 'text-warning-text',
    info: 'text-info-text',
    chatMe: 'text-chat-meText',
    chatOther: 'text-chat-otherText',
  },
  border: {
    primary: 'border-primary-400',
    primaryLight: 'border-primary-100',
    success: 'border-success-border',
    error: 'border-error-border',
    warning: 'border-warning-border',
    info: 'border-info-border',
    chatOther: 'border-chat-otherBorder',
  },
};

const transitions = {
  duration: THEME_TOKENS.duration,
  easing: THEME_TOKENS.easing,
};

module.exports = {
  THEME_TOKENS,
  THEME_COLORS,
  colors,
  fonts,
  fontSizes,
  fontWeights,
  spacing,
  radius,
  shadows,
  duration,
  tw,
  transitions,
};