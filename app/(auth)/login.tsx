import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, InlineAlert, TextField, TextLink } from '@/components/ui';
import { AuthPrompt, AuthScaffold } from '@/components/templates/AuthScaffold';
import { useAuth } from '@/hooks/useAuth';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, emailFormat, combine } from '@/utils/validators';
import { nativeLoginErrorMessage } from '@/utils/loginErrors';

interface FormState {
  email: string;
  password: string;
}

// Avisos de sucesso ao chegar ao login (só o nativo navega para aqui com `notice`:
// fim do reset-password, ou conta ativada sem login automático).
const NOTICES: Record<string, string> = {
  'password-reset': 'Palavra-passe redefinida. Já pode entrar com a nova palavra-passe.',
  'account-activated': 'Conta ativada. Entre com o seu email e a palavra-passe que definiu.',
};

export default function LoginScreen() {
  const { login } = useAuth();
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const noticeMessage = notice ? NOTICES[notice] : undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { fieldErrors, formError, setFormError, validate, applyApiError } =
    useFormValidation<FormState>();

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
      // Nativo: grant password → /companies (AuthContext.native).
      await login({ email, password });
    } catch (e) {
      // Recusas do grant password (só nativo); o resto, como sempre.
      const nativeMessage = nativeLoginErrorMessage(e);
      if (nativeMessage) setFormError(nativeMessage);
      else applyApiError(e, { Email: 'email', Password: 'password' });
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

      {noticeMessage && !formError ? (
        <InlineAlert testID="login.notice" tone="success" message={noticeMessage} />
      ) : null}

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
