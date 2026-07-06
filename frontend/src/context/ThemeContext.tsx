import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'edt-theme';

function getStoredTheme(): Theme | null {
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Pages publiques (élève / prof / vie scolaire) : le thème sombre est réservé au panel admin. */
function isPublicPage(): boolean {
  return /^\/(eleve|prof|vie-scolaire)(\/|$)/.test(window.location.pathname);
}

function resolveInitialTheme(): Theme {
  if (isPublicPage()) return 'light';
  return getStoredTheme() ?? getSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
});

/** Thème courant (clair/sombre) et setter, persistés dans le navigateur (localStorage). */
export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Se synchronise si la préférence est changée depuis un autre onglet (jamais sur les pages
  // publiques, qui restent toujours en clair quel que soit le thème choisi côté admin).
  useEffect(() => {
    if (isPublicPage()) return;
    const handler = (event: StorageEvent) => {
      if (event.key === THEME_KEY) {
        setThemeState(getStoredTheme() ?? getSystemTheme());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setTheme = (next: Theme) => {
    window.localStorage.setItem(THEME_KEY, next);
    setThemeState(next);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
