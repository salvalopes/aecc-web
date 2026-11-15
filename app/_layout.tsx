import { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  DefaultTheme,
  DarkTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

// React Navigation paints its own opaque background behind every header/tab
// (see @react-navigation/elements' <Background>) using whatever theme is in
// context. expo-router never wires one, so it defaults to RN's own
// DefaultTheme/DarkTheme (fixed light grey / near-black) — values with
// no relation to our own light/dark tokens. That mismatch shows through
// translucent headers/tab bars as a hard seam against the app's own bg.
// Wiring our tokens into the nav theme here makes that invisible layer
// always match the app's actual background.
function RootLayoutNav() {
  const { isDark, colors } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.accent,
      },
    };
  }, [isDark, colors]);

  return (
    <NavigationThemeProvider value={navTheme}>
      {/* Ícones da status bar pelo tema em vigor (incl. o override do Perfil): escuros no
          claro e claros no escuro. Sem efeito na web. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Geist, família única (Fase 3): nomes alinhados com `geist` em src/theme/typography.ts.
    Geist_400Regular: require('../assets/fonts/geist/Geist-Regular.ttf'),
    Geist_500Medium: require('../assets/fonts/geist/Geist-Medium.ttf'),
    Geist_600SemiBold: require('../assets/fonts/geist/Geist-SemiBold.ttf'),
    Geist_700Bold: require('../assets/fonts/geist/Geist-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
