import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authApi } from '@/api/auth.api';

export default function ResetPasswordScreen() {
  const { userId, token } = useLocalSearchParams<{ userId?: string; token?: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!userId || !token) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>AECC</Text>
        <Text style={styles.subtitle}>Redefinir palavra-passe</Text>
        <Text style={styles.error}>Link inválido: parâmetros em falta.</Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.buttonOutlineText}>Ir para login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>AECC</Text>
        <Text style={styles.subtitle}>Redefinir palavra-passe</Text>
        <Text style={styles.successMessage}>
          Palavra-passe redefinida com sucesso!
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Ir para login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleSubmit() {
    setValidationError(null);
    setApiError(null);

    if (newPassword.length < 8) {
      setValidationError('A palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ userId: userId!, token: token!, newPassword });
      setSuccess(true);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Erro ao redefinir a palavra-passe.');
    } finally {
      setLoading(false);
    }
  }

  const displayError = validationError ?? apiError;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AECC</Text>
      <Text style={styles.subtitle}>Redefinir palavra-passe</Text>

      <TextInput
        style={styles.input}
        placeholder="Nova palavra-passe"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmar palavra-passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
      />

      {displayError && <Text style={styles.error}>{displayError}</Text>}

      {apiError && (
        <TouchableOpacity onPress={() => router.replace('/(auth)/forgot-password')}>
          <Text style={styles.link}>Pedir novo link de redefinição</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Redefinir palavra-passe</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
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
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0a7ea4',
    marginTop: 8,
  },
  buttonOutlineText: { color: '#0a7ea4', fontSize: 16, fontWeight: '600' },
  error: { color: '#d32f2f', marginBottom: 8, textAlign: 'center' },
  successMessage: { fontSize: 16, textAlign: 'center', color: '#333', marginBottom: 24 },
  link: {
    color: '#0a7ea4',
    textAlign: 'center',
    marginBottom: 12,
    textDecorationLine: 'underline',
    fontSize: 14,
  },
});
