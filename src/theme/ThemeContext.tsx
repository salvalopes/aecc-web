import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemeColors } from './colors';
import { lightGlass, darkGlass, type GlassTokens } from './glass';
import {
  spacing,
  radius,
  glassRadius,
  hitTargetMin,
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  shadow,
} from './tokens';

const THEME_MODE_KEY = 'aecc_theme_mode';

type ThemeMode = 'light' | 'dark';

interface Theme {
  colors: ThemeColors;
  glass: GlassTokens;
  isDark: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  spacing: typeof spacing;
  radius: typeof radius;
  glassRadius: typeof glassRadius;
  hitTargetMin: typeof hitTargetMin;
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  lineHeight: typeof lineHeight;
  fontWeight: typeof fontWeight;
  shadow: typeof shadow;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ThemeMode | null>(null);

  // Load a previously-chosen override once on mount; falls back to the
  // system scheme until (and unless) the user has picked one explicitly.
  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY).then(value => {
      if (value === 'light' || value === 'dark') setOverride(value);
    });
  }, []);

  const mode: ThemeMode = override ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const isDark = mode === 'dark';

  function toggleTheme() {
    const next: ThemeMode = isDark ? 'light' : 'dark';
    setOverride(next);
    AsyncStorage.setItem(THEME_MODE_KEY, next);
  }

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      glass: isDark ? darkGlass : lightGlass,
      isDark,
      mode,
      toggleTheme,
      spacing,
      radius,
      glassRadius,
      hitTargetMin,
      fontFamily,
      fontSize,
      lineHeight,
      fontWeight,
      shadow,
    }),
    [isDark, mode]
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within a ThemeProvider');
  return theme;
}
