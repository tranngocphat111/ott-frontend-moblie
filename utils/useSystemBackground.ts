import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { THEME_COLORS } from '@/constants/theme';

export const DEFAULT_SYSTEM_BACKGROUND = THEME_COLORS.surface.DEFAULT;
const DEFAULT_NAVIGATION_BUTTON_STYLE = 'dark';

export const setSystemBackgroundAsync = async (
  backgroundColor: string,
  buttonStyle: 'light' | 'dark' = 'dark',
) => {
  await SystemUI.setBackgroundColorAsync(backgroundColor);

  if (Platform.OS !== 'android') return;

  await Promise.allSettled([
    NavigationBar.setBackgroundColorAsync(backgroundColor),
    NavigationBar.setButtonStyleAsync(buttonStyle),
  ]);
};

export const useSystemBackground = (
  backgroundColor: string,
  restoreColor: string = DEFAULT_SYSTEM_BACKGROUND,
  buttonStyle: 'light' | 'dark' = 'dark',
  restoreButtonStyle: 'light' | 'dark' = DEFAULT_NAVIGATION_BUTTON_STYLE,
) => {
  useEffect(() => {
    void setSystemBackgroundAsync(backgroundColor, buttonStyle);

    return () => {
      void setSystemBackgroundAsync(restoreColor, restoreButtonStyle);
    };
  }, [backgroundColor, buttonStyle, restoreButtonStyle, restoreColor]);
};
