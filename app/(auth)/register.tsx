import { useState } from 'react';
import { router } from 'expo-router';
import { Button, InlineAlert, TextField } from '@/components/ds';
import { AuthPrompt, AuthScaffold } from '@/components/templates/AuthScaffold';
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
      { email: combine(required('O email é obrigatório.'), emailFormat()) },
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

  const goToLogin = () => router.replace('/(auth)/login');

  if (submitted) {
    return (
      <AuthScaffold
        title="Verifica o teu email"
        subtitle={`Enviámos um link para ${email.trim()}.`}
      >
        <InlineAlert
          testID="register.success"
          tone="success"
          message="Abre o link do email para confirmares a conta e definires a palavra-passe."
        />
        <Button label="Ir para o login" variant="secondary" onPress={goToLogin} fullWidth />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Criar conta"
      subtitle="Indica o teu email. Enviamos um link para confirmares a conta e definires a palavra-passe."
      footer={<AuthPrompt prompt="Já tens conta?" label="Entrar" onPress={goToLogin} />}
    >
      <TextField
        testID="register.email"
        label="Email"
        placeholder="nome@empresa.pt"
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={handleRegister}
      />

      {formError ? <InlineAlert tone="error" message={formError} /> : null}

      <Button
        label="Criar conta"
        testID="register.submit"
        loading={loading}
        onPress={handleRegister}
        fullWidth
      />
    </AuthScaffold>
  );
}
