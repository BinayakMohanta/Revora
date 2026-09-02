/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: {
          950: '#0a0908',
          900: '#0f0e0c',
          850: '#141310',
          800: '#1a1815',
          700: '#242019',
          600: '#332d24',
          500: '#4a4133',
        },
        cream: {
          100: '#faf6ef',
          200: '#f0e9dc',
          300: '#ded3bd',
          400: '#b8ab91',
        },
        gold: {
          400: '#e8b364',
          500: '#d99a45',
          600: '#c47f2e',
          700: '#9c6423',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(217,154,69,0.15), 0 8px 24px -8px rgba(217,154,69,0.25)',
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(217,154,69,0.12), transparent)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
