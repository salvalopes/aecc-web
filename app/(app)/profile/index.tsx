import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { Button } from '@/components/ui';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors, fontFamily, fontSize, fontWeight } = useTheme();

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.surfaceApp }}>
      <Text style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: 4 }}>
        {user?.fullName ?? '—'}
      </Text>
      <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, marginBottom: 4 }}>
        {user?.email ?? '—'}
      </Text>
      <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textTertiary, marginBottom: 40 }}>
        {user?.role ?? '—'}
      </Text>

      <Button variant="destructive" onPress={handleLogout}>
        Terminar sessão
      </Button>
    </View>
  );
}
