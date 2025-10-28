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
          DEFAULT: '#2563EB',
          hover: '#1d4ed8',
        },
        success: '#22C55E',
        warning: {
          bg: '#FEF3C7',
          border: '#FDE68A',
          text: '#92400E',
        },
        background: '#F8FAFB',
      },
      maxWidth: {
        'chat': '680px',
        'drawer': '384px',
      },
    },
  },
  plugins: [],
}
