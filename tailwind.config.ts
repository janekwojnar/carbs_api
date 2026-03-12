import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#070505',
        surface: '#15110d',
        gold: '#d9a441',
        ember: '#ffcf78',
        flame: '#ff8f3f'
      },
      fontFamily: {
        serifDisplay: ['"Cormorant Garamond"', 'serif'],
        body: ['"Source Sans 3"', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 35px rgba(255, 173, 74, 0.35)'
      },
      keyframes: {
        flicker: {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '25%': { transform: 'scale(1.05) translateY(-1px)' },
          '50%': { transform: 'scale(0.95) translateY(1px)' },
          '75%': { transform: 'scale(1.02) translateY(-1px)' }
        }
      },
      animation: {
        flicker: 'flicker 1.8s infinite ease-in-out'
      }
    }
  },
  plugins: []
};

export default config;
