import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../../core/constants/storageKeys';

export const THEMES = {
  light: 'light',
  dark: 'dark',
};

const THEME_COLORS = {
  light: '#f6f1e8',
  dark: '#070b09',
};

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.THEME) === THEMES.dark ? THEMES.dark : THEMES.light;
  } catch {
    return THEMES.light;
  }
}

export function applyTheme(theme) {
  const dark = theme === THEMES.dark;
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);

  const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (appleMeta) {
    appleMeta.setAttribute('content', dark ? 'black-translucent' : 'default');
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    const value = next === THEMES.dark ? THEMES.dark : THEMES.light;
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, value);
    } catch {
      /* ignore quota / private mode */
    }
    setThemeState(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === THEMES.dark ? THEMES.light : THEMES.dark);
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === THEMES.dark,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: THEMES.light,
      isDark: false,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}
