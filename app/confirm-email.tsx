import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, InlineAlert, TextField } from '@/components/ui';
import { AuthScaffold } from '@/components/templates/AuthScaffold';
import { authApi } from '@/api/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, passwordStrength, matches, combine } from '@/utils/validators';

interface FormState {
  fullName: string;
  password: string;
  confirmPassword: string;
}

const PASSWORD_HINT = 'Mínimo 8 caracteres, com maiúscula, minúscula e número.';

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
      <AuthScaffold title="Link inválido" subtitle="Este link de confirmação está incompleto.">
        <InlineAlert
          tone="error"
          message="Abre de novo o link a partir do email de confirmação, sem o editar."
        />
        <Button
          label="Ir para o login"
          variant="secondary"
          onPress={() => router.replace('/(auth)/login')}
          fullWidth
        />
      </AuthScaffold>
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
          matches('password', 'As palavras-passe não coincidem.'),
        ),
      },
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
    <AuthScaffold
      title="Ativar conta"
      subtitle="Define o teu nome e uma palavra-passe para ativares a conta."
    >
      <TextField
        label="Nome completo"
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors.fullName}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
      <TextField
        label="Palavra-passe"
        hint={PASSWORD_HINT}
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
      />
      <TextField
        label="Confirmar palavra-passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      {formError ? <InlineAlert tone="error" message={formError} /> : null}

      <Button label="Ativar e entrar" loading={loading} onPress={handleSubmit} fullWidth />
    </AuthScaffold>
  );
}
