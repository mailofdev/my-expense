/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0f0d',
        surface: {
          DEFAULT: '#121a16',
          2: '#1a2620',
        },
        edge: '#2a3d32',
        muted: '#8fa89a',
        primary: {
          DEFAULT: '#e8c547',
          hover: '#d4af37',
        },
        accent: '#4ade80',
        danger: '#ef4444',
        success: '#22c55e',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '10px',
        lg: '18px',
      },
      boxShadow: {
        glow: '0 4px 24px rgba(232, 197, 71, 0.22)',
        card: '0 4px 24px rgba(0, 0, 0, 0.35)',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
      maxWidth: {
        content: '1280px',
      },
    },
  },
  plugins: [],
};
