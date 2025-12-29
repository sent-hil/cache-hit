/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#58a6ff',
        secondary: '#238636',
        accent: '#d29922',
        surface: {
          DEFAULT: '#0d1117',
          panel: '#161b22',
          subtle: '#21262d',
        },
        border: {
          DEFAULT: '#30363d',
        },
        content: {
          DEFAULT: '#c9d1d9',
          muted: '#8b949e',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        sm: '2px',
        md: '4px',
        lg: '4px',
        full: '9999px',
      },
      boxShadow: {
        glow: '0 0 10px rgba(88, 166, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
