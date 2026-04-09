/** @type {import('tailwindcss').Config} */
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
        brand: {
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
        surface: {
          DEFAULT: '#ffffff',
          raised: '#fdfaf7',
          sunken: '#f2ede8',
        },
      },
      borderRadius: {
        '2xl': '18px',
      },
      boxShadow: {
        soft: '0 3px 14px rgba(70,52,33,0.08)',
        card: '0 10px 28px rgba(70,52,33,0.12)',
      },
    },
  },
  plugins: [],
}