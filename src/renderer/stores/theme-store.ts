import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));

let themeTransitionTimer: ReturnType<typeof setTimeout> | null = null;

function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  // Add a temporary class that applies color transitions globally during the switch
  root.classList.add('theme-transitioning');
  if (themeTransitionTimer) clearTimeout(themeTransitionTimer);
  themeTransitionTimer = setTimeout(() => {
    root.classList.remove('theme-transitioning');
    themeTransitionTimer = null;
  }, 450);

  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
}
