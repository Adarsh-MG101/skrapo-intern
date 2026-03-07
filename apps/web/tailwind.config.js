/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F7ED',
          100: '#DCE9D6',
          200: '#B9D4AD',
          300: '#97BF85',
          400: '#8CBC7E',
          500: '#6B9B5E',
          600: '#5A8A4D',
          700: '#4A7A3D',
          800: '#3A6A2D',
          900: '#2A5A1D',
        },
        cream: '#F5F5ED',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
