/** @type {import('tailwindcss').Config} */
const { THEME_TOKENS: tokens } = require('./constants/theme.js');

module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        brand: tokens.colors.primary,
        success: tokens.colors.success,
        error: tokens.colors.error,
        warning: tokens.colors.warning,
        info: tokens.colors.info,
        chat: tokens.colors.chat,
        surface: tokens.colors.surface,
      },
      backgroundImage: tokens.backgroundImage,
      fontFamily: tokens.fontFamily,
      transitionDuration: tokens.duration,
      transitionTimingFunction: tokens.easing,
      borderRadius: {
        '2xl': '18px',
      },
      boxShadow: tokens.boxShadow,
    },
  },
  plugins: [],
}