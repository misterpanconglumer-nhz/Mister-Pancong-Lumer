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
        brand: {
          50: '#fdf8f2',
          100: '#f9eee2',
          200: '#f2d6c1',
          300: '#e5b697',
          400: '#d58e69',
          500: '#c56d44',
          600: '#a75232',
          700: '#8a3e29',
          800: '#6b3023',
          900: '#52251d',
          dark: '#3d1a14',
        },
        cream: {
          50: '#fcfaf7',
          100: '#f7f2eb',
          200: '#ebe1d3',
          300: '#dfcfba',
        },
        accent: {
          50: '#fff3e0',
          100: '#ffe0b2',
          500: '#ff6d00',
          600: '#e65100',
          700: '#bf360c',
        }
      },
    },
  },
  plugins: [],
};
export default config;
