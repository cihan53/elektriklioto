
export type ThemeMode = 'system' | 'light' | 'dark';

export const useTheme = () => {
  const currentTheme = useState<ThemeMode>('app-theme', () => 'system');

  const applyTheme = (theme: ThemeMode) => {
    currentTheme.value = theme;
    if (import.meta.client) {
      localStorage.setItem('theme', theme);
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const initTheme = () => {
    if (import.meta.client) {
      const saved = localStorage.getItem('theme') as ThemeMode | null;
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        applyTheme(saved);
      } else {
        applyTheme('system');
      }
    }
  };

  return {
    currentTheme,
    applyTheme,
    initTheme
  };
};
