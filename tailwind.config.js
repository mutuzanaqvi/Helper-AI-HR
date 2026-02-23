/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/*.{js,ts,jsx,tsx}", // Yeh line add karein
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}