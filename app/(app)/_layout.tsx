import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStackScreenOptions } from '@/navigation/stackOptions';
import { SessionLoadingState } from '@/components/templates/StateTemplates';
import { useTheme } from '@/theme/ThemeContext';

// Guarda de sessão + Stack por cima das tabs. As tabs (`(tabs)`) só montam
// depois de a sessão (e o papel) estarem resolvidos: mudar a visibilidade de
// uma NativeTabs.Trigger remonta o navegador (fase3-plano §2.2-2).
export default function AppLayout() {
  const { token, isLoading } = useAuth();
  const screenOptions = useStackScreenOptions();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/(auth)/login');
    }
  }, [token, isLoading]);

  // T2: sessão a carregar (e o instante antes do redirect), em vez de um ecrã vazio.
  if (isLoading || !token) return <SessionLoadingState />;

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id]/index" options={{ title: 'Produto' }} />
      {/* T7 (B12): formulários em ecrã, por cima das tabs. Substituem o `Modal`. */}
      <Stack.Screen name="products/new" options={{ title: 'Novo produto' }} />
      <Stack.Screen name="products/[id]/edit" options={{ title: 'Editar produto' }} />
      <Stack.Screen name="my-companies/new" options={{ title: 'Nova empresa' }} />
      <Stack.Screen name="my-companies/[id]/edit" options={{ title: 'Editar empresa' }} />
      <Stack.Screen name="my-companies/[id]/map" options={{ title: 'Visibilidade no mapa' }} />
      {/* Gestão → Utilizadores (W1 do mapa): saiu das tabs; o URL /users mantém-se. O header dá o
          "voltar" e tem a cor do `Horizon` do ecrã. */}
      <Stack.Screen
        name="users/index"
        options={{ title: 'Utilizadores', headerStyle: { backgroundColor: colors.horizon } }}
      />
      <Stack.Screen name="users/new" options={{ title: 'Novo utilizador' }} />
      <Stack.Screen name="users/[id]/edit" options={{ title: 'Editar utilizador' }} />
      {/* Fora das tabs (U3): a rota continua a existir, sem entrada na navegação. */}
      <Stack.Screen name="favourites/index" options={{ title: 'Favoritos' }} />
      {/* Guarda dos deep links para tabs com papéis (T2 "sem permissão"). */}
      <Stack.Screen name="guard/[tab]" options={{ title: 'Sem permissão' }} />
    </Stack>
  );
}
