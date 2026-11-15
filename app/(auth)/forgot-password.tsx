import { useState } from 'react';
import { router } from 'expo-router';
import { Button, InlineAlert, TextField, TextLink } from '@/components/ui';
import { AuthScaffold } from '@/components/templates/AuthScaffold';
import { authApi } from '@/api/auth.api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, emailFormat, combine } from '@/utils/validators';

interface FormState {
  email: string;
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { fieldErrors, validate } = useFormValidation<FormState>();

  async function handleSubmit() {
    const isValid = validate(
      { email },
      { email: combine(required('O email é obrigatório.'), emailFormat()) },
    );
    if (!isValid) return;

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

  const goToLogin = () => router.replace('/(auth)/login');

  if (submitted) {
    return (
      <AuthScaffold title="Verifica o teu email" subtitle={`Pedido enviado para ${email.trim()}.`}>
        <InlineAlert
          testID="forgot-password.success"
          tone="success"
          message="Se o email estiver registado, vais receber um link para redefinir a palavra-passe nos próximos minutos."
        />
        <Button label="Voltar ao login" variant="secondary" onPress={goToLogin} fullWidth />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Recuperar acesso"
      subtitle="Indica o email da tua conta e enviamos um link para definires uma nova palavra-passe."
      footer={<TextLink label="Voltar ao login" onPress={goToLogin} />}
    >
      <TextField
        testID="forgot-password.email"
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
        onSubmitEditing={handleSubmit}
      />
      <Button
        label="Enviar link"
        testID="forgot-password.submit"
        loading={loading}
        onPress={handleSubmit}
        fullWidth
      />
    </AuthScaffold>
  );
}
