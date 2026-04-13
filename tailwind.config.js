/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#10B981',
          foreground: '#ffffff',
        },
        expense: {
          DEFAULT: '#EF4444',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
