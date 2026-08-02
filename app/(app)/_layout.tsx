import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Image, Text, useWindowDimensions } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from '@/components/ui';

function HeaderLogo() {
  return (
    <Image
      source={require('../../assets/brand/aecc-logo.webp')}
      style={{ width: 40, height: 40, marginLeft: 16 }}
      resizeMode="contain"
    />
  );
}

// Renderer partilhado por todos os separadores: em vez de cortar o texto quando
// não cabe (ex. "As minhas empresas" em ecrãs estreitos), reduz o tamanho da
// fonte consoante a largura da janela e permite quebra em 2 linhas. Aplica-se
// por igual a todos os separadores — não é um ajuste específico de um label.
function TabLabel({ label, color, width }: { label: string; color: string; width: number }) {
  const { fontFamily } = useTheme();
  const fontSize = width < 400 ? 10 : width < 600 ? 11 : 12;

  return (
    <Text style={{ fontFamily: fontFamily.body, fontSize, color, textAlign: 'center', width: '100%' }}>
      {label}
    </Text>
  );
}

export default function AppLayout() {
  const { token, user, isLoading } = useAuth();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isAdmin = user?.role === 'Admin';
  const isAssociateOrAdmin = user?.role === 'Admin' || user?.role === 'Associado';

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
        tabBarStyle: { backgroundColor: theme.colors.surfaceCard, borderTopColor: theme.colors.borderSubtle, height: 76 },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarIconStyle: { marginBottom: 2 },
        headerStyle: { backgroundColor: theme.colors.surfaceCard },
        headerTintColor: theme.colors.textPrimary,
        headerTitle: () => null,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="companies/index"
        options={{
          title: 'Yellow Pages',
          tabBarLabel: ({ color }) => <TabLabel label="Yellow Pages" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="building-2" size={20} color={color} />,
          headerLeft: HeaderLogo,
        }}
      />
      <Tabs.Screen
        name="my-companies/index"
        options={{
          href: isAssociateOrAdmin ? undefined : null,
          title: 'Editar',
          tabBarLabel: ({ color }) => <TabLabel label="Editar" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="pencil" size={20} color={color} />,
          headerLeft: HeaderLogo,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Perfil',
          tabBarLabel: ({ color }) => <TabLabel label="Perfil" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="user" size={20} color={color} />,
          headerLeft: HeaderLogo,
        }}
      />
      <Tabs.Screen
        name="users/index"
        options={{
          href: isAdmin ? undefined : null,
          title: 'Utilizadores',
          tabBarLabel: ({ color }) => <TabLabel label="Utilizadores" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="shield" size={20} color={color} />,
          headerLeft: HeaderLogo,
        }}
      />
      {/* Ecrãs de detalhe — ocultos da tab bar */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="companies/[id]" options={{ href: null, title: 'Empresa', headerLeft: HeaderLogo }} />
      <Tabs.Screen name="companies/category/[categoryId]" options={{ href: null, title: 'Empresas', headerLeft: HeaderLogo }} />
      <Tabs.Screen name="products/[id]" options={{ href: null, title: 'Produto', headerLeft: HeaderLogo }} />
    </Tabs>
  );
}
