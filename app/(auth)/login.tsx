import { useState } from 'react';
import { router } from 'expo-router';
import { Button, InlineAlert, TextField, TextLink } from '@/components/ds';
import { AuthPrompt, AuthScaffold } from '@/components/templates/AuthScaffold';
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
    <AuthScaffold
      testID="login.screen"
      title="Entrar"
      subtitle="Usa o email e a palavra-passe da tua conta AECC."
      footer={
        <AuthPrompt
          prompt="Ainda não tens conta?"
          label="Regista-te"
          testID="login.register"
          onPress={() => router.push('/(auth)/register')}
        />
      }
    >
      <TextField
        testID="login.email"
        label="Email"
        placeholder="nome@empresa.pt"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <TextField
        testID="login.password"
        label="Palavra-passe"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />
      <TextLink
        testID="login.forgot-password"
        variant="meta"
        label="Esqueci-me da palavra-passe"
        onPress={() => router.push('/(auth)/forgot-password')}
      />

      {formError ? (
        <InlineAlert testID="login.form-error" tone="error" message={formError} />
      ) : null}

      <Button
        label="Entrar"
        testID="login.submit"
        loading={loading}
        onPress={handleLogin}
        fullWidth
      />
    </AuthScaffold>
  );
}
