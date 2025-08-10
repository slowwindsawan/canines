/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        albert: ['AlbertSans', 'sans-serif'],
        instrument: ['InstrumentSans', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#F8F8F6',
          100: '#F4F4F1',
          200: '#F0F0EC',
          300: '#E6E6E1',
          400: '#DCDCD6',
          500: '#D2D2CB',
          600: '#C8C8C0',
          700: '#BEBEB5',
          800: '#B4B4AA',
          900: '#AAAA9F',
        },
        dark: {
          50: '#F7F7F7',
          100: '#E3E3E3',
          200: '#C8C8C8',
          300: '#A4A4A4',
          400: '#818181',
          500: '#666666',
          600: '#515151',
          700: '#434343',
          800: '#383838',
          900: '#373737',
        },
        brand: {
          offwhite: '#f0f0ec',
          charcoal: '#373737',
          midgrey: '#5A5A5A',
        }
      }
    },
  },
  plugins: [],
};
