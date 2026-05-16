import { useEffect } from 'react';
import * as SystemUI from 'expo-system-ui';
import { THEME_COLORS } from '@/constants/theme';

export const DEFAULT_SYSTEM_BACKGROUND = THEME_COLORS.surface.DEFAULT;

export const useSystemBackground = (
  backgroundColor: string,
  restoreColor: string = DEFAULT_SYSTEM_BACKGROUND,
) => {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(backgroundColor);

    return () => {
      void SystemUI.setBackgroundColorAsync(restoreColor);
    };
  }, [backgroundColor, restoreColor]);
};

