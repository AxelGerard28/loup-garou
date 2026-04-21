/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-dark': '#1a1a1a',
        'game-blood': '#8b0000',
        'game-night': '#12122b',
      }
    },
  },
  plugins: [],
}
