import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      // login() does: POST /auth/login (cookie) → PKCE → window.location.href redirect
      // The browser navigates away on success; no router.replace() needed here.
      await login({ email, password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao autenticar');
      setLoading(false);
    }
    // On success the page navigates away — intentionally no finally setLoading(false)
    // to avoid a loading flicker before the browser redirect completes.
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/brand/aecc-logo.webp')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.subtitle}>Associação de Empresários de Cascais</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder="Palavra-passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(auth)/forgot-password')}
        style={styles.forgotLink}
      >
        <Text style={styles.forgotLinkText}>Esqueci-me da palavra-passe</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  logo: { width: 160, height: 56, alignSelf: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 40 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#d32f2f', marginBottom: 8, textAlign: 'center' },
  forgotLink: { marginTop: 16, alignItems: 'center' },
  forgotLinkText: { color: '#0a7ea4', fontSize: 14 },
});
