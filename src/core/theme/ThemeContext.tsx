import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'themeModeOverride';

interface ThemeContextValue {
  isDark: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  themeMode: 'light',
  toggleTheme: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [override, setOverride] = useState<ThemeMode | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((val) => {
        if (val === 'light' || val === 'dark') setOverride(val);
      })
      .catch(() => {});
  }, []);

  const themeMode: ThemeMode = override ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const toggleTheme = () => {
    const next: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setOverride(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ isDark: themeMode === 'dark', themeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
