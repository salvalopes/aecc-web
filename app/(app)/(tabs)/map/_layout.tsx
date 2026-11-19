import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/navigation/stackOptions';
import { useTheme } from '@/theme/ThemeContext';

export default function MapLayout() {
  const screenOptions = useStackScreenOptions();
  // Raiz com horizonte (como as outras tabs): a faixa por trás da status bar tem a cor dele.
  const { colors } = useTheme();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Mapa',
          headerShown: false,
          contentStyle: { backgroundColor: colors.horizon },
        }}
      />
    </Stack>
  );
}
