/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
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
      fontSize: {
        'display': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1': ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.015em', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.005em', fontWeight: '600' }],
        'h4': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '0em', fontWeight: '500' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0em', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0em', fontWeight: '400' }],
        'body-md-bold': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0em', fontWeight: '500' }],
        'body-sm': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em', fontWeight: '400' }],
        'caption': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.02em', fontWeight: '500' }],
        'mono': ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '0em', fontWeight: '500' }]
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace']
      }
    }
  },
  plugins: []
};
