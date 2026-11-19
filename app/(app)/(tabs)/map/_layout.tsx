import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/navigation/stackOptions';
import { useTheme } from '@/theme/ThemeContext';

export default function MapLayout() {
  const screenOptions = useStackScreenOptions();
  // O mapa vai de ponta a ponta (por baixo da status bar e, no iOS, da tab bar de vidro); o fundo
  // só se vê enquanto o mapa carrega.
  const { colors } = useTheme();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Mapa',
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </Stack>
  );
}
