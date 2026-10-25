/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--wl-bg)',
        surface: 'var(--wl-surface)',
        'surface-2': 'var(--wl-surface-2)',
        border: 'var(--wl-border)',
        accent: 'var(--wl-accent)',
        'accent-text': 'var(--wl-accent-text)',
        primary: 'var(--wl-text)',
        secondary: 'var(--wl-muted)',
        danger: 'var(--wl-danger)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        wl: 'var(--wl-radius)',
        'wl-sm': 'var(--wl-radius-sm)',
      },
      transitionDuration: {
        wl: '180ms',
      },
    },
  },
  plugins: [],
}
