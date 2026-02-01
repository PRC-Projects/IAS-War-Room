/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'upsc-slate': '#1e293b',
        'upsc-gold': '#f59e0b',
        'migraine-dark': '#0f172a',
      }
    },
  },
  plugins: [],
}