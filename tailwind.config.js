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
        // New Carbon-inspired palette
        'brand-blue': '#0f62fe', // The primary interactive blue
        'brand-navy': '#001d6c', // A deep navy for accents
        'brand-background': '#f4f4f4', // The standard light gray page background
        'brand-ui': {
          '01': '#ffffff', // Primary UI color (e.g., card backgrounds)
          '02': '#f4f4f4', // Secondary UI color (e.g., page background)
          '03': '#e0e0e0', // Subtle borders
        },
        'brand-text': {
          'primary': '#161616', // Primary text color (dark gray, not black)
          'secondary': '#525252', // Secondary text for hints and descriptions
        },
      },
      fontFamily: {
        // Use the CSS variable for the Inter font
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
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
      },
    },
  },
  plugins: [],
}