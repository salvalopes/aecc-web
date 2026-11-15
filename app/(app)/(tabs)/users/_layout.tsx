import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/navigation/stackOptions';
import { useTheme } from '@/theme/ThemeContext';

export default function UsersLayout() {
  const screenOptions = useStackScreenOptions();
  // Raiz T3: o `Horizon` faz de cabeçalho e a faixa por trás da status bar tem a cor dele.
  const { colors } = useTheme();
  const root = {
    headerShown: false,
    contentStyle: { backgroundColor: colors.horizon },
  };
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Utilizadores', ...root }} />
    </Stack>
  );
}
