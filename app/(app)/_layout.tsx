import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function AppLayout() {
  const { token, isLoading } = useAuth();

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
        tabBarActiveTintColor: '#0a7ea4',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="companies/index"
        options={{
          title: 'Empresas',
          tabBarLabel: 'Empresas',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏢</Text>,
        }}
      />
      <Tabs.Screen
        name="products/index"
        options={{
          title: 'Produtos',
          tabBarLabel: 'Produtos',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛍️</Text>,
        }}
      />
      <Tabs.Screen
        name="categories/index"
        options={{
          title: 'Categorias',
          tabBarLabel: 'Categorias',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📂</Text>,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
      {/* Ecrãs de detalhe — ocultos da tab bar */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="companies/[id]" options={{ href: null, title: 'Empresa' }} />
      <Tabs.Screen name="products/[id]" options={{ href: null, title: 'Produto' }} />
    </Tabs>
  );
}
