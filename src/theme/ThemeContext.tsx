import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemeColors } from './colors';
import {
  lightGlass,
  darkGlass,
  lightMaterial,
  darkMaterial,
  type GlassTokens,
  type GlassMaterial,
} from './glass';
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
  radii,
  size,
  border,
  opacity,
  breakpoints,
  layout,
} from './tokens';
import { textStyles } from './typography';

const THEME_MODE_KEY = 'aecc_theme_mode';

type ThemeMode = 'light' | 'dark';

export interface Theme {
  colors: ThemeColors;
  glass: GlassTokens;
  /** Material único da Maré; a B4 apaga as 5 variantes de `glass`. */
  material: GlassMaterial;
  scheme: 'light' | 'dark';
  radii: typeof radii;
  size: typeof size;
  border: typeof border;
  opacity: typeof opacity;
  breakpoints: typeof breakpoints;
  layout: typeof layout;
  textStyles: typeof textStyles;
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
    AsyncStorage.getItem(THEME_MODE_KEY).then((value) => {
      if (value === 'light' || value === 'dark') setOverride(value);
    });
  }, []);

  // Nativo: a tab bar das NativeTabs e o GlassView não seguem um esquema
  // definido só em JS. Com override manual, o esquema da app inteira passa a
  // ser esse (fase3-plano §2.2-3); sem override, volta ao do sistema.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(override ?? 'unspecified');
  }, [override]);

  const mode: ThemeMode = override ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const isDark = mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  // public/index.html paints html/body/#root and the search-field focus
  // ring from CSS custom properties, guessed from prefers-color-scheme
  // before any JS runs. That guess breaks the moment a user's manual
  // toggle (persisted above, independent of the OS scheme) disagrees with
  // it — e.g. OS in light mode, app manually switched to dark — leaving
  // those surfaces on the wrong color. Once mounted, this is the single
  // place that overwrites them to the theme actually in effect, keeping
  // every background on the page — including the ones CSS alone can't
  // reach — on the same colors.surfaceApp the rest of the app already uses.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--aecc-surface-app', colors.surfaceApp);
    document.documentElement.style.setProperty('--aecc-focus-ring', colors.focusRing);
  }, [colors]);

  function toggleTheme() {
    const next: ThemeMode = isDark ? 'light' : 'dark';
    setOverride(next);
    AsyncStorage.setItem(THEME_MODE_KEY, next);
  }

  const theme = useMemo<Theme>(
    () => ({
      colors,
      glass: isDark ? darkGlass : lightGlass,
      material: isDark ? darkMaterial : lightMaterial,
      scheme: mode,
      radii,
      size,
      border,
      opacity,
      breakpoints,
      layout,
      textStyles,
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
    [colors, isDark, mode],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within a ThemeProvider');
  return theme;
}
