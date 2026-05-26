/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#fdfbf7',
          50: '#fffefb',
          100: '#f8f3e6',
          200: '#e5e0d8',
          300: '#cfc8b9',
        },
        ink: {
          DEFAULT: '#2d2d2d',
          soft: '#5a5a5a',
          muted: '#8a8576',
        },
        sticky: {
          yellow: '#fff9c4',
          pink: '#fbcfe8',
          green: '#d9f99d',
          blue: '#bae6fd',
        },
        accent: {
          DEFAULT: '#ff4d4d',
          dark: '#e23a3a',
        },
      },
      fontFamily: {
        hand: ['Kalam', 'Caveat', 'cursive'],
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      borderRadius: {
        sketch: '255px 15px 225px 15px / 15px 225px 15px 255px',
        'sketch-alt': '15px 225px 15px 255px / 225px 15px 255px 15px',
        'sketch-sm': '15px 30px 15px 30px / 30px 15px 30px 15px',
        blob: '55% 45% 60% 40% / 50% 60% 40% 50%',
      },
      boxShadow: {
        sketch: '4px 4px 0 0 #2d2d2d',
        'sketch-sm': '2px 2px 0 0 #2d2d2d',
        'sketch-lg': '6px 6px 0 0 #2d2d2d',
        'sketch-press': '1px 1px 0 0 #2d2d2d',
      },
    },
  },
  plugins: [],
};
