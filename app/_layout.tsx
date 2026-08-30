import { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { DefaultTheme, DarkTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync();

// React Navigation paints its own opaque background behind every header/tab
// (see @react-navigation/elements' <Background>) using whatever theme is in
// context. expo-router never wires one, so it defaults to RN's own
// DefaultTheme/DarkTheme (rgb(242,242,242) / rgb(1,1,1)) — fixed values with
// no relation to our own light/dark tokens. That mismatch is what shows
// through the translucent TopBar as a hard seam against the app's own
// surfaceApp background. Wiring our tokens into the nav theme here makes
// that invisible layer always match the app's actual background.
function RootLayoutNav() {
  const { isDark, colors } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.surfaceApp,
        card: colors.surfaceCard,
        text: colors.textPrimary,
        border: colors.borderDefault,
        primary: colors.accentPrimary,
      },
    };
  }, [isDark, colors]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    LibreFranklin: require('../assets/fonts/LibreFranklin-Variable.ttf'),
    SourceSans3: require('../assets/fonts/SourceSans3-Variable.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
