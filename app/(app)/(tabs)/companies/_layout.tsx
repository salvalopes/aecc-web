import { Stack } from 'expo-router';
import { tabRootHeaderShown, useStackScreenOptions } from '@/navigation/stackOptions';

// Um deep link para /companies/:id fica com a lista por baixo (o "voltar" funciona).
export const unstable_settings = { initialRouteName: 'index' };

export default function CompaniesLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Empresas', headerShown: tabRootHeaderShown }} />
      <Stack.Screen name="[id]" options={{ title: 'Empresa' }} />
      <Stack.Screen name="category/[categoryId]" options={{ headerShown: false }} />
    </Stack>
  );
}
