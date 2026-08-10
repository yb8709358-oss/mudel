import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8f6',
          100: '#f9efe9',
          200: '#f2d5c9',
          300: '#e8b49f',
          400: '#dc8d74',
          500: '#c2644a',
          600: '#a85138',
          700: '#8b402a',
          800: '#733623',
          900: '#5e2c1b',
        },
        neutral: {
          50: '#fafaf9',
          100: '#f5f4f2',
          200: '#e8e6e0',
          300: '#d4d0c8',
          400: '#a8a296',
          500: '#7c7568',
          600: '#655f54',
          700: '#4f4a41',
          800: '#3a3730',
          900: '#27251f',
        },
        accent: {
          500: '#d4a74a',
          600: '#b88d33',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-noto-kufi)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
      },
      maxWidth: {
        content: '1152px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;