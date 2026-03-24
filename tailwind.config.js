/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'aide-bg': '#1a1b26',
        'aide-surface': '#24283b',
        'aide-border': '#3b4261',
        'aide-text': '#c0caf5',
        'aide-accent': '#7aa2f7',
        'aide-success': '#9ece6a',
        'aide-warning': '#e0af68',
        'aide-error': '#f7768e',
      },
    },
  },
  plugins: [],
};
