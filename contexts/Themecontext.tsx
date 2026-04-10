import React, { createContext, useContext, useState, ReactNode } from 'react';
import { THEME_COLORS } from '@/constants/theme';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    primary: string;
    background: string;
    text: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const colors = {
    primary: THEME_COLORS.primary[600],
    background: isDark ? '#000000' : THEME_COLORS.surface.DEFAULT,
    text: isDark ? THEME_COLORS.surface.DEFAULT : THEME_COLORS.chat.otherText,
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
