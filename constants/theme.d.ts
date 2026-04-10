export interface ThemeTokenScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface ThemeTokens {
  colors: {
    primary: ThemeTokenScale;
    success: { bg: string; text: string; border: string };
    error: { bg: string; text: string; border: string };
    warning: { bg: string; text: string; border: string };
    info: { bg: string; text: string; border: string };
    chat: {
      me: string;
      meText: string;
      other: string;
      otherBorder: string;
      otherText: string;
    };
    surface: { DEFAULT: string; raised: string; sunken: string };
    neutral: {
      white: string;
      black: string;
      slate300: string;
      slate400: string;
      slate500: string;
      slate600: string;
      slate700: string;
      gray500: string;
      gray700: string;
      blue500: string;
      blue600: string;
      red500: string;
      red600: string;
      green500: string;
      amber500: string;
    };
  };
  backgroundImage: Record<string, string>;
  boxShadow: Record<string, string>;
  duration: Record<string, string>;
  easing: Record<string, string>;
  fontFamily: Record<string, string[]>;
}

export declare const THEME_TOKENS: ThemeTokens;

export declare const THEME_COLORS: ThemeTokens['colors'];

export declare const colors: {
  primary: ThemeTokenScale;
  success: { bg: string; text: string; border: string };
  error: { bg: string; text: string; border: string };
  warning: { bg: string; text: string; border: string };
  info: { bg: string; text: string; border: string };
  chat: {
    meBg: string;
    meText: string;
    otherBg: string;
    otherBorder: string;
    otherText: string;
  };
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
};

export declare const fonts: Record<string, string>;
export declare const fontSizes: Record<string, number>;
export declare const fontWeights: Record<string, string>;
export declare const spacing: Record<string, number>;
export declare const radius: Record<string, number>;
export declare const shadows: Record<string, { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number }>;
export declare const duration: Record<string, number>;
export declare const tw: Record<string, Record<string, string>>;
export declare const transitions: {
  duration: Record<string, string>;
  easing: Record<string, string>;
};