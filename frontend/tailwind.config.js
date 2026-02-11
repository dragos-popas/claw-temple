/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#0D0D0D',
          dark: '#1A1A1A',
          gray: '#2A2A2A',
          light: '#3A3A3A',
          pink: '#FF0055',
          cyan: '#00F0FF',
          yellow: '#FCEE0A',
          purple: '#B829E6',
          green: '#00FF66',
          red: '#FF3333',
          orange: '#FF6600'
        }
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'glitch': 'glitch 0.3s ease-in-out',
        'scanline': 'scanline 8s linear infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite'
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' }
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '50%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      boxShadow: {
        'neon-pink': '0 0 5px #FF0055, 0 0 10px #FF0055, 0 0 20px #FF0055',
        'neon-cyan': '0 0 5px #00F0FF, 0 0 10px #00F0FF, 0 0 20px #00F0FF',
        'neon-yellow': '0 0 5px #FCEE0A, 0 0 10px #FCEE0A, 0 0 20px #FCEE0A'
      }
    }
  },
  plugins: []
};