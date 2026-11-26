/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#14213D', 700: '#1E2E52', 600: '#2A3C66', 300: '#8C98B3' },
        volt: { DEFAULT: '#FFC629', soft: '#FFF3CC' },
        plus: '#D7263D',
        steel: { DEFAULT: '#E6EAF1', 50: '#F4F6FA', 400: '#A9B3C4' },
        graphite: '#3A4150',
        ok: '#177A52',
        page: '#EEF1F5',
        buy: { DEFAULT: '#E8651A', hover: '#D2560F' },
        link: '#1F5FBF',
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
      },
      boxShadow: { plate: '0 1px 0 rgba(255,255,255,.06) inset, 0 18px 40px -18px rgba(20,33,61,.55)' },
    },
  },
  plugins: [],
};
