import { Stack } from 'expo-router';
import { tabRootHeaderShown, useStackScreenOptions } from '@/navigation/stackOptions';

export default function HomeLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Início', headerShown: tabRootHeaderShown }} />
    </Stack>
  );
}
