
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--color-bg-base)',
        'bg-surface': 'var(--color-bg-surface)',
        'bg-elevated': 'var(--color-bg-elevated)',
        'bg-subdued': 'var(--color-bg-subdued)',
        'primary': 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-active': 'var(--color-primary-active)',
        'on-primary': 'var(--color-on-primary)',
        'on-primary-dark-active': 'var(--color-on-primary-dark-active)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'border-default': 'var(--color-border-default)',
        'border-strong': 'var(--color-border-strong)',
        'focus-ring': 'var(--color-focus-ring)',
        'success': 'var(--color-success)',
        'success-subdued': 'var(--color-success-subdued)',
        'warning': 'var(--color-warning)',
        'warning-subdued': 'var(--color-warning-subdued)',
        'danger': 'var(--color-danger)',
        'danger-subdued': 'var(--color-danger-subdued)',
        'danger-on-subdued': 'var(--color-danger-on-subdued)',
        'missing-text': 'var(--color-missing-text)',
        'missing-bg': 'var(--color-missing-bg)'
      },
      spacing: {
        's1': 'var(--spacing-1)',
        's2': 'var(--spacing-2)',
        's3': 'var(--spacing-3)',
        's4': 'var(--spacing-4)',
        's5': 'var(--spacing-5)',
        's6': 'var(--spacing-6)',
        's8': 'var(--spacing-8)',
        's12': 'var(--spacing-12)'
      },
      borderRadius: {
        'none': 'var(--radius-none)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'full': 'var(--radius-full)'
      },
      boxShadow: {
        'none': 'var(--shadow-none)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)'
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config;
