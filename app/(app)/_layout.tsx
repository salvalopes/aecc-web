import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { Icon, TopBar } from '@/components/ui';

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
  const { glass } = theme;
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

  // Masterpage header — glass bar with the brand lockup, the light/dark
  // toggle, and a profile chip. Only the visible tab roots get it; detail
  // screens (companies/[id], products/[id]...) keep the plain HeaderLogo
  // header below, since `header` would otherwise swallow their back arrow.
  function renderTopBar() {
    return <TopBar authenticated userName={user?.fullName} onProfile={() => router.push('/(app)/profile')} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.accentPrimary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 1,
          borderTopColor: glass.panel.border,
          height: 76,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFillObject}>
            <BlurView intensity={glass.panel.blurIntensity} tint={glass.panel.blurTint} style={StyleSheet.absoluteFillObject} />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: glass.panel.tint }]} />
          </View>
        ),
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarIconStyle: { marginBottom: 2 },
        headerStyle: { backgroundColor: theme.colors.surfaceCard },
        headerTintColor: theme.colors.textPrimary,
        headerTitle: () => null,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarLabel: ({ color }) => <TabLabel label="Início" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="house-line" size={20} color={color} />,
          header: renderTopBar,
        }}
      />
      <Tabs.Screen
        name="companies/index"
        options={{
          title: 'Empresas',
          tabBarLabel: ({ color }) => <TabLabel label="Empresas" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="storefront" size={20} color={color} />,
          header: renderTopBar,
        }}
      />
      <Tabs.Screen
        name="favourites/index"
        options={{
          title: 'Favoritos',
          tabBarLabel: ({ color }) => <TabLabel label="Favoritos" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="heart" size={20} color={color} />,
          header: renderTopBar,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Perfil',
          tabBarLabel: ({ color }) => <TabLabel label="Perfil" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="user" size={20} color={color} />,
          header: renderTopBar,
        }}
      />
      <Tabs.Screen
        name="my-companies/index"
        options={{
          href: isAssociateOrAdmin ? undefined : null,
          title: 'Editar',
          tabBarLabel: ({ color }) => <TabLabel label="Editar" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="pencil-simple" size={20} color={color} />,
          header: renderTopBar,
        }}
      />
      <Tabs.Screen
        name="users/index"
        options={{
          href: isAdmin ? undefined : null,
          title: 'Utilizadores',
          tabBarLabel: ({ color }) => <TabLabel label="Utilizadores" color={color} width={width} />,
          tabBarIcon: ({ color }) => <Icon name="shield-check" size={20} color={color} />,
          header: renderTopBar,
        }}
      />
      {/* Ecrãs de detalhe — ocultos da tab bar, header simples com o logótipo */}
      <Tabs.Screen name="companies/[id]" options={{ href: null, title: 'Empresa', headerLeft: HeaderLogo }} />
      <Tabs.Screen name="companies/category/[categoryId]" options={{ href: null, title: 'Empresas', headerLeft: HeaderLogo }} />
      <Tabs.Screen name="products/[id]" options={{ href: null, title: 'Produto', headerLeft: HeaderLogo }} />
    </Tabs>
  );
}
