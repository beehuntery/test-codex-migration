import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './styles/**/*.{css}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--color-base)',
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        disabled: 'var(--color-disabled)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)'
      },
      boxShadow: {
        card: 'var(--shadow-elevation-1)',
        elevated: 'var(--shadow-elevation-2)',
        focus: 'var(--shadow-focus)'
      },
      borderRadius: {
        card: 'var(--radius-card)',
        button: 'var(--radius-button)',
        'button-lg': 'var(--radius-button-lg)'
      },
      fontFamily: {
        sans: 'var(--font-sans)'
      }
    }
  },
  corePlugins: {
    preflight: true
  }
};

export default config;
