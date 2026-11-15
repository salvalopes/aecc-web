import { Stack } from 'expo-router';
import { useStackScreenOptions } from '@/navigation/stackOptions';
import { useTheme } from '@/theme/ThemeContext';

// Um deep link para /companies/:id fica com a lista por baixo (o "voltar" funciona).
export const unstable_settings = { initialRouteName: 'index' };

export default function CompaniesLayout() {
  const screenOptions = useStackScreenOptions();
  // Raiz T3: o `Horizon` faz de cabeçalho e a faixa por trás da status bar tem a cor dele.
  const { colors } = useTheme();
  const root = {
    headerShown: false,
    contentStyle: { backgroundColor: colors.horizon },
  };
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Empresas', ...root }} />
      <Stack.Screen name="[id]" options={{ title: 'Empresa' }} />
      <Stack.Screen name="category/[categoryId]" options={{ headerShown: false }} />
    </Stack>
  );
}
