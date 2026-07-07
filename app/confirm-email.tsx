import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { authApi } from '@/api/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, passwordStrength, matches, combine } from '@/utils/validators';

interface FormState {
  fullName: string;
  password: string;
  confirmPassword: string;
}

export default function ConfirmEmailScreen() {
  const { userId, token } = useLocalSearchParams<{ userId?: string; token?: string }>();
  const { redirectToAuthorize } = useAuth();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<FormState>();

  if (!userId || !token) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>AECC</Text>
        <Text style={styles.subtitle}>Confirmação de email</Text>
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

  async function handleSubmit() {
    const isValid = validate(
      { fullName, password, confirmPassword },
      {
        fullName: required('O nome é obrigatório.'),
        password: passwordStrength(),
        confirmPassword: combine(
          required('Confirma a palavra-passe.'),
          matches('password', 'As palavras-passe não coincidem.')
        ),
      }
    );
    if (!isValid) return;

    setLoading(true);
    try {
      await authApi.confirmEmail({ userId: userId!, token: token!, fullName, password });
      // Sessão (cookie) já foi criada no backend — segue directamente para o PKCE.
      await redirectToAuthorize();
    } catch (e) {
      applyApiError(e, {
        FullName: 'fullName',
        Password: 'password',
        UserAlreadyHasPassword: 'password',
      });
      setLoading(false);
    }
    // No sucesso o browser navega para fora (redirectToAuthorize) — sem setLoading(false)
    // para não haver flicker antes do redirect.
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AECC</Text>
      <Text style={styles.subtitle}>Confirma a tua conta</Text>
      <Text style={styles.description}>
        Define o teu nome e uma palavra-passe para ativares a conta.
      </Text>

      <TextInput
        style={[styles.input, fieldErrors.fullName && styles.inputError]}
        placeholder="Nome completo"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
      />
      {fieldErrors.fullName && <Text style={styles.error}>{fieldErrors.fullName}</Text>}

      <TextInput
        style={[styles.input, fieldErrors.password && styles.inputError]}
        placeholder="Palavra-passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      {fieldErrors.password && <Text style={styles.error}>{fieldErrors.password}</Text>}

      <TextInput
        style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
        placeholder="Confirmar palavra-passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      {fieldErrors.confirmPassword && <Text style={styles.error}>{fieldErrors.confirmPassword}</Text>}

      {formError && <Text style={styles.error}>{formError}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Confirmar e entrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 16 },
  description: { fontSize: 14, textAlign: 'center', color: '#555', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 4,
    fontSize: 16,
  },
  inputError: { borderColor: '#d32f2f' },
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
  error: { color: '#d32f2f', marginBottom: 8, textAlign: 'left', fontSize: 13 },
});
