/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pixel-dark': '#1a1a2e',
        'pixel-darker': '#0f0f1a',
        'pixel-panel': '#16213e',
        'pixel-border': '#2d3748',
        'claude': '#4f46e5',
        'subagent': '#10b981',
        'tool': '#f59e0b',
        'message': '#3b82f6',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
      },
    },
  },
  plugins: [],
}
