/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        swjtu: { DEFAULT: '#003087', light: '#0052cc' },
      },
    },
  },
  plugins: [],
}
