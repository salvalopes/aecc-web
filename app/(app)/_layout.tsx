import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStackScreenOptions } from '@/navigation/stackOptions';

// Guarda de sessão + Stack por cima das tabs. As tabs (`(tabs)`) só montam
// depois de a sessão (e o papel) estarem resolvidos: mudar a visibilidade de
// uma NativeTabs.Trigger remonta o navegador (fase3-plano §2.2-2).
export default function AppLayout() {
  const { token, isLoading } = useAuth();
  const screenOptions = useStackScreenOptions();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/(auth)/login');
    }
  }, [token, isLoading]);

  if (isLoading) return null;
  if (!token) return null;

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id]" options={{ title: 'Produto' }} />
      {/* Fora das tabs (U3): a rota continua a existir, sem entrada na navegação. */}
      <Stack.Screen name="favourites/index" options={{ title: 'Favoritos' }} />
    </Stack>
  );
}
