import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#B8860B',
          50: '#FDF8E6',
          100: '#FAEECC',
          200: '#F4DA94',
          300: '#EDC359',
          400: '#D4A529',
          500: '#B8860B',
          600: '#9A6E08',
          700: '#785406',
          800: '#5A3E04',
          900: '#3D2903',
        },
        navy: {
          DEFAULT: '#1B365D',
          50: '#EEF3FA',
          100: '#D4E0F2',
          200: '#A9C1E5',
          300: '#7BA0D6',
          400: '#4E7BBF',
          500: '#2E5899',
          600: '#1B365D',
          700: '#142947',
          800: '#0E1D33',
          900: '#08111F',
        },
        cream: {
          DEFAULT: '#FFF8DC',
          50: '#FFFEFA',
          100: '#FFFDF2',
          200: '#FFF8DC',
          300: '#FFF1B8',
          400: '#FFE88F',
          500: '#F5DA73',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      boxShadow: {
        luxury: '0 20px 50px -12px rgba(27, 54, 93, 0.14)',
        gold: '0 10px 30px -8px rgba(184, 134, 11, 0.28)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #B8860B 0%, #D4A529 50%, #9A6E08 100%)',
        'navy-gradient': 'linear-gradient(135deg, #0E1D33 0%, #1B365D 60%, #24477A 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
