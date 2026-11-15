import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/navigation/stackOptions';
import { useTheme } from '@/theme/ThemeContext';

export default function HomeLayout() {
  const screenOptions = useStackScreenOptions();
  // Raiz T5: o `Horizon` faz de cabeçalho e a faixa por trás da status bar tem a cor dele.
  const { colors } = useTheme();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Início',
          headerShown: false,
          contentStyle: { backgroundColor: colors.horizon },
        }}
      />
    </Stack>
  );
}
