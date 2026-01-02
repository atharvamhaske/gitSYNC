/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['"Instrument Serif"', 'serif'],
        'sans': ['Satoshi', 'sans-serif']
      }
    }
  },
  plugins: []
};
