import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '@/api/auth.api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, emailFormat, combine } from '@/utils/validators';

interface FormState {
  email: string;
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<FormState>();

  async function handleRegister() {
    const isValid = validate(
      { email },
      { email: combine(required('O email é obrigatório.'), emailFormat()) }
    );
    if (!isValid) return;

    setLoading(true);
    try {
      await authApi.register({ email });
      setSubmitted(true);
    } catch (e) {
      applyApiError(e, { Email: 'email', DuplicateEmail: 'email', DuplicateUserName: 'email' });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <Image source={require('../../assets/brand/aecc-logo.webp')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.message}>
          Verifica o teu email para confirmares a conta e definires a tua palavra-passe.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.buttonOutlineText}>Ir para login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/brand/aecc-logo.webp')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.subtitle}>Criar conta</Text>

      <TextInput
        style={[styles.input, fieldErrors.email && styles.inputError]}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      {fieldErrors.email && <Text style={styles.error}>{fieldErrors.email}</Text>}

      {formError && <Text style={styles.error}>{formError}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Criar conta</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
        <Text style={styles.loginLinkText}>Já tens conta? Entrar</Text>
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
    marginTop: 24,
  },
  buttonOutlineText: { color: '#0a7ea4', fontSize: 16, fontWeight: '600' },
  error: { color: '#d32f2f', marginBottom: 8, textAlign: 'left', fontSize: 13 },
  message: { fontSize: 16, textAlign: 'center', color: '#333', marginBottom: 8 },
  loginLink: { marginTop: 16, alignItems: 'center' },
  loginLinkText: { color: '#0a7ea4', fontSize: 14 },
});
