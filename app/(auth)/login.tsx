import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { BrandLockup } from '@/components/ds';
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
      },
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
    <View testID="login.screen" style={styles.container}>
      {/* variant="light": o fundo deste ecrã é #fff fixo até à B8 */}
      <BrandLockup width={160} variant="light" style={styles.logo} />
      <Text style={styles.subtitle}>Associação Empresarial do Concelho de Cascais</Text>

      <TextInput
        testID="login.email"
        style={[styles.input, fieldErrors.email && styles.inputError]}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      {fieldErrors.email && (
        <Text testID="login.email-error" style={styles.error}>
          {fieldErrors.email}
        </Text>
      )}

      <TextInput
        testID="login.password"
        style={[styles.input, fieldErrors.password && styles.inputError]}
        placeholder="Palavra-passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      {fieldErrors.password && (
        <Text testID="login.password-error" style={styles.error}>
          {fieldErrors.password}
        </Text>
      )}

      {formError && (
        <Text testID="login.form-error" style={styles.error}>
          {formError}
        </Text>
      )}

      <TouchableOpacity
        testID="login.submit"
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        testID="login.forgot-password"
        onPress={() => router.push('/(auth)/forgot-password')}
        style={styles.forgotLink}
      >
        <Text style={styles.forgotLinkText}>Esqueci-me da palavra-passe</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="login.register"
        onPress={() => router.push('/(auth)/register')}
        style={styles.registerLink}
      >
        <Text style={styles.registerLinkText}>Ainda não tens conta? Regista-te</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  logo: { alignSelf: 'center', marginBottom: 8 },
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
  registerLink: { marginTop: 12, alignItems: 'center' },
  registerLinkText: { color: '#0a7ea4', fontSize: 14 },
});
