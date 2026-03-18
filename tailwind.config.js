/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          100: '#1a1a1a',
          200: '#2a2a2a',
          300: '#333333',
        }
      }
    },
  },
  plugins: [],
}
