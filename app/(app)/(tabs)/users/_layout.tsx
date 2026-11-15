import { Stack } from 'expo-router';
import { tabRootHeaderShown, useStackScreenOptions } from '@/navigation/stackOptions';

export default function UsersLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: 'Utilizadores', headerShown: tabRootHeaderShown }}
      />
    </Stack>
  );
}
