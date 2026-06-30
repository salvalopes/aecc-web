import { startTransition, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authApi } from '@/api/auth.api';

type ScreenState = 'loading' | 'success' | 'error';

export default function ConfirmEmailScreen() {
  const { userId, token } = useLocalSearchParams<{ userId?: string; token?: string }>();
  const [state, setState] = useState<ScreenState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !token) {
      startTransition(() => {
        setErrorMessage('Link inválido: parâmetros em falta.');
        setState('error');
      });
      return;
    }

    authApi
      .confirmEmail({ userId, token })
      .then(() => startTransition(() => setState('success')))
      .catch((e: unknown) => {
        startTransition(() => {
          setErrorMessage(e instanceof Error ? e.message : 'Erro ao confirmar email.');
          setState('error');
        });
      });
  }, [userId, token]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AECC</Text>
      <Text style={styles.subtitle}>Confirmação de email</Text>

      {state === 'loading' && (
        <>
          <ActivityIndicator size="large" color="#0a7ea4" style={styles.spinner} />
          <Text style={styles.message}>A confirmar o teu email…</Text>
        </>
      )}

      {state === 'success' && (
        <>
          <Text style={styles.message}>Email confirmado com sucesso! Já podes entrar na aplicação.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.buttonText}>Ir para login</Text>
          </TouchableOpacity>
        </>
      )}

      {state === 'error' && (
        <>
          <Text style={styles.error}>{errorMessage}</Text>
          <Text style={styles.hint}>
            Se o link expirou, pede um novo email de confirmação ao suporte.
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.buttonOutlineText}>Ir para login</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 40 },
  spinner: { marginBottom: 16 },
  message: { fontSize: 16, textAlign: 'center', color: '#333', marginBottom: 24 },
  error: { color: '#d32f2f', fontSize: 16, textAlign: 'center', marginBottom: 12 },
  hint: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 24 },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0a7ea4',
  },
  buttonOutlineText: { color: '#0a7ea4', fontSize: 16, fontWeight: '600' },
});
