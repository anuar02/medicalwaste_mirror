/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        chakra: ['"Chakra Petch"', 'monospace'],
        data:   ['"JetBrains Mono"', 'monospace'],
        sans:   ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          base:     '#f0f4f8',
          DEFAULT:  '#ffffff',
          elevated: '#f8fafc',
          card:     '#ffffff',
        },
        accent: {
          DEFAULT: '#0d9488',
          bright:  '#14b8a6',
          dim:     'rgba(13,148,136,0.55)',
        },
      },
      borderColor: {
        panel: 'rgba(100,116,139,0.14)',
        mid:   'rgba(100,116,139,0.22)',
        glow:  'rgba(13,148,136,0.40)',
      },
      boxShadow: {
        'card':         '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover':   '0 4px 16px rgba(13,148,136,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        'glow-red':     '0 0 10px rgba(239,68,68,0.25)',
        'glow-teal-sm': '0 0 8px rgba(13,148,136,0.15)',
      },
      keyframes: {
        'beacon': {
          '0%':   { transform: 'scale(1)',   opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
      },
      animation: {
        'beacon': 'beacon 1.5s ease-out infinite',
      },
    },
  },
  plugins: [],
}
