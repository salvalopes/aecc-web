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
import { authApi } from '@/api/auth.api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
    } catch {
      // Always show generic success — don't reveal if the email exists
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>AECC</Text>
        <Text style={styles.subtitle}>Esqueci-me da palavra-passe</Text>
        <Text style={styles.message}>
          Se o endereço de email estiver registado, vais receber um link para redefinir a
          palavra-passe nos próximos minutos.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.buttonOutlineText}>Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AECC</Text>
      <Text style={styles.subtitle}>Esqueci-me da palavra-passe</Text>

      <Text style={styles.description}>
        Introduz o teu email e enviamos-te um link para redefinires a palavra-passe.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enviar link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backLinkText}>Voltar ao login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 24 },
  description: { fontSize: 14, textAlign: 'center', color: '#555', marginBottom: 24 },
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
  message: { fontSize: 15, textAlign: 'center', color: '#333', marginBottom: 32, lineHeight: 22 },
  backLink: { marginTop: 20, alignItems: 'center' },
  backLinkText: { color: '#0a7ea4', fontSize: 14 },
});
