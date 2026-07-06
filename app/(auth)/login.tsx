import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, emailFormat, combine } from '@/utils/validators';

interface FormState {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<FormState>();

  async function handleLogin() {
    const isValid = validate(
      { email, password },
      {
        email: combine(required('O email é obrigatório.'), emailFormat()),
        password: required('A password é obrigatória.'),
      }
    );
    if (!isValid) return;

    setLoading(true);
    try {
      // login() does: POST /auth/login (cookie) → PKCE → window.location.href redirect
      // The browser navigates away on success; no router.replace() needed here.
      await login({ email, password });
    } catch (e) {
      applyApiError(e, { Email: 'email', Password: 'password' });
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
        style={[styles.input, fieldErrors.email && styles.inputError]}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      {fieldErrors.email && <Text style={styles.error}>{fieldErrors.email}</Text>}

      <TextInput
        style={[styles.input, fieldErrors.password && styles.inputError]}
        placeholder="Palavra-passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      {fieldErrors.password && <Text style={styles.error}>{fieldErrors.password}</Text>}

      {formError && <Text style={styles.error}>{formError}</Text>}

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
  error: { color: '#d32f2f', marginBottom: 8, textAlign: 'left', fontSize: 13 },
  forgotLink: { marginTop: 16, alignItems: 'center' },
  forgotLinkText: { color: '#0a7ea4', fontSize: 14 },
});
