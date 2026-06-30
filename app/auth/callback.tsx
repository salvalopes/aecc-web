import { startTransition, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function AuthCallbackScreen() {
  const { code, state, error, error_description } = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const { completeOAuthLogin, isLoading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Wait for AuthProvider to finish restoring any previous session
    if (isLoading) return;

    if (error) {
      startTransition(() =>
        setErrorMessage(error_description ?? error ?? 'Erro no processo de login.'),
      );
      return;
    }

    if (!code || !state) {
      startTransition(() => setErrorMessage('Parâmetros OAuth em falta no URL de callback.'));
      return;
    }

    completeOAuthLogin(code, state)
      .then(() => router.replace('/(app)/companies'))
      .catch((e: unknown) => {
        startTransition(() =>
          setErrorMessage(e instanceof Error ? e.message : 'Erro ao completar login.'),
        );
      });
  }, [isLoading]);

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>AECC</Text>
        <Text style={styles.error}>{errorMessage}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0a7ea4" style={styles.spinner} />
      <Text style={styles.message}>A completar login…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  spinner: { marginBottom: 16 },
  message: { fontSize: 16, textAlign: 'center', color: '#555' },
  error: { color: '#d32f2f', fontSize: 15, textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
