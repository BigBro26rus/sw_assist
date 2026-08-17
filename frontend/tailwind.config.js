/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        wiki: {
          bg: 'var(--wiki-bg)',
          canvas: 'var(--wiki-canvas)',
          sidebar: 'var(--wiki-sidebar)',
          panel: 'var(--wiki-panel)',
          panelHover: 'var(--wiki-panel-hover)',
          border: 'var(--wiki-border)',
          borderLight: 'var(--wiki-border-light)',
          accent: 'var(--wiki-accent)',
          accentHover: 'var(--wiki-accent-hover)',
          accentMuted: 'var(--wiki-accent-muted)',
          green: 'var(--wiki-green)',
          text: 'var(--wiki-text)',
          muted: 'var(--wiki-muted)',
          topbar: 'var(--wiki-topbar)',
          navActive: 'var(--wiki-nav-active)',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
