import { Stack } from 'expo-router';
import { tabRootHeaderShown, useStackScreenOptions } from '@/navigation/stackOptions';

export default function MyCompaniesLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: 'As minhas empresas', headerShown: tabRootHeaderShown }}
      />
    </Stack>
  );
}
