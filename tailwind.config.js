/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}"
  ],
  safelist: [
    'chip-current',
    'chip-previous',
    'chip-project',
    'chip-marketing',
    'toast-success',
    'toast-error',
    'toast-warning',
    'toast-info'
  ],
  theme: {
    extend: {
      colors: {
        amlaak: {
          navy: '#0B1528',
          navydark: '#070D18',
          navycard: '#0F1D38',
          gold: '#C5A059',
          goldlight: '#DFBF7A'
        }
      }
    }
  },
  plugins: []
};
