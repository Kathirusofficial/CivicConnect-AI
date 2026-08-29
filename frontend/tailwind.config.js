/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#fdf2ff',
          100: '#fae5ff',
          200: '#f5ccff',
          300: '#eda3ff',
          400: '#e06aff',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a0e4e',
        },
        surface: {
          0: '#ffffff',
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#1a1025',
          900: '#0f0a18',
          950: '#08050d',
        },
        accent: {
          warm: '#f97316',
          coral: '#f43f5e',
          emerald: '#10b981',
          violet: '#8b5cf6',
          cyan: '#06b6d4',
          magenta: '#ec4899',
          lime: '#84cc16',
          sky: '#0ea5e9',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(168,85,247,0.08)',
        'glass-lg': '0 16px 48px rgba(168,85,247,0.14)',
        glow: '0 0 40px rgba(217,70,239,0.18)',
        'glow-lg': '0 0 80px rgba(217,70,239,0.22)',
        'glow-cyan': '0 0 30px rgba(6,182,212,0.25)',
        'glow-orange': '0 0 30px rgba(249,115,22,0.25)',
        'glow-pink': '0 0 30px rgba(236,72,153,0.25)',
        inner: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh':
          'linear-gradient(135deg, #d946ef 0%, #8b5cf6 50%, #06b6d4 100%)',
        'gradient-rainbow':
          'linear-gradient(90deg, #f43f5e, #f97316, #fbbf24, #10b981, #06b6d4, #8b5cf6, #d946ef)',
        'gradient-fire':
          'linear-gradient(135deg, #f43f5e 0%, #f97316 50%, #fbbf24 100%)',
        'gradient-ocean':
          'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
        'gradient-sunset':
          'linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #d946ef 100%)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'rainbow': 'rainbow 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        rainbow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
};
