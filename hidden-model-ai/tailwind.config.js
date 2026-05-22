/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#2C0505', // Very dark red for main background
          dark: '#5C0B0B', // Dark red for panels
          primary: '#8B0000', // Crimson for primary actions
          accent: '#FFD700', // Gold/Lightning color
          cream: '#FFFDD0', // Cream for text
        },
      },
    },
  },
  plugins: [],
};
