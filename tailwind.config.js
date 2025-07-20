// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light Mode - Carbon Inspired
        'brand-blue': '#0f62fe',
        'brand-navy': '#001d6c',
        'brand-background': '#f4f4f4',
        'brand-ui-01': '#ffffff', // Primary UI (cards)
        'brand-ui-02': '#f4f4f4', // Secondary UI (page background)
        'brand-ui-03': '#e0e0e0', // Subtle borders
        'brand-text-primary': '#161616',
        'brand-text-secondary': '#525252',

        // Dark Mode - Carbon Inspired
        'dark-brand-blue': '#4589ff',
        'dark-brand-navy': '#d0e2ff',
        'dark-brand-background': '#161616',
        'dark-brand-ui-01': '#262626', // Primary UI (cards)
        'dark-brand-ui-02': '#161616', // Secondary UI (page background)
        'dark-brand-ui-03': '#393939', // Subtle borders
        'dark-brand-text-primary': '#f4f4f4',
        'dark-brand-text-secondary': '#c6c6c6',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'zoom-fade-in': 'zoomFadeIn 0.5s ease-out 0.5s forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        zoomFadeIn: {
          from: { transform: 'scale(0.8)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}