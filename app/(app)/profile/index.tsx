import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.fullName ?? '—'}</Text>
      <Text style={styles.email}>{user?.email ?? '—'}</Text>
      <Text style={styles.role}>{user?.role ?? '—'}</Text>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Terminar sessão</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 15, color: '#555', marginBottom: 4 },
  role: { fontSize: 13, color: '#999', marginBottom: 40 },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#d32f2f',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  logoutText: { color: '#d32f2f', fontSize: 15, fontWeight: '600' },
});
