import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from '@/components/ui';

export default function AppLayout() {
  const { token, user, isLoading } = useAuth();
  const theme = useTheme();
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace('/(auth)/login');
    }
  }, [token, isLoading]);

  if (isLoading) return null;
  if (!token) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.accentPrimary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: { backgroundColor: theme.colors.surfaceCard, borderTopColor: theme.colors.borderSubtle },
        headerStyle: { backgroundColor: theme.colors.surfaceCard },
        headerTitleStyle: { fontFamily: theme.fontFamily.display, fontWeight: theme.fontWeight.bold },
        headerTintColor: theme.colors.textPrimary,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="companies/index"
        options={{
          title: 'Empresas',
          tabBarLabel: 'Empresas',
          tabBarIcon: ({ color }) => <Icon name="building-2" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products/index"
        options={{
          title: 'Produtos',
          tabBarLabel: 'Produtos',
          tabBarIcon: ({ color }) => <Icon name="shopping-bag" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories/index"
        options={{
          title: 'Categorias',
          tabBarLabel: 'Categorias',
          tabBarIcon: ({ color }) => <Icon name="folder" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <Icon name="user" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users/index"
        options={{
          href: isAdmin ? undefined : null,
          title: 'Utilizadores',
          tabBarLabel: 'Utilizadores',
          tabBarIcon: ({ color }) => <Icon name="shield" size={20} color={color} />,
        }}
      />
      {/* Ecrãs de detalhe — ocultos da tab bar */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="companies/[id]" options={{ href: null, title: 'Empresa' }} />
      <Tabs.Screen name="products/[id]" options={{ href: null, title: 'Produto' }} />
    </Tabs>
  );
}
