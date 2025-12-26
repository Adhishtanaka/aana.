import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  initializeTheme: () => void;
}

const applyThemeToDOM = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          applyThemeToDOM(newTheme);
          return { theme: newTheme };
        }),
      setTheme: (theme: Theme) =>
        set(() => {
          applyThemeToDOM(theme);
          return { theme };
        }),
      initializeTheme: () => {
        const currentTheme = get().theme;
        applyThemeToDOM(currentTheme);
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);