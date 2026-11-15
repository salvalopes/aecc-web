import { Stack } from 'expo-router';
import { tabRootHeaderShown, useStackScreenOptions } from '@/navigation/stackOptions';

export default function ProfileLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Perfil', headerShown: tabRootHeaderShown }} />
    </Stack>
  );
}
