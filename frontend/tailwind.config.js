/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'purple-light': '#f3e8ff',
        'purple-brand': '#9333ea',
      }
    },
  },
  plugins: [],
}
