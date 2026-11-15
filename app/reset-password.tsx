import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, InlineAlert, TextField, TextLink } from '@/components/ui';
import { AuthScaffold } from '@/components/templates/AuthScaffold';
import { authApi } from '@/api/auth.api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, passwordStrength, matches, combine } from '@/utils/validators';

interface FormState {
  newPassword: string;
  confirmPassword: string;
}

const PASSWORD_HINT = 'Mínimo 8 caracteres, com maiúscula, minúscula e número.';

export default function ResetPasswordScreen() {
  const { userId, token } = useLocalSearchParams<{ userId?: string; token?: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { fieldErrors, formError, validate, applyApiError } = useFormValidation<FormState>();

  const goToLogin = () => router.replace('/(auth)/login');
  const requestNewLink = () => router.replace('/(auth)/forgot-password');

  if (!userId || !token) {
    return (
      <AuthScaffold title="Link inválido" subtitle="Este link de redefinição está incompleto.">
        <InlineAlert
          tone="error"
          message="Abre de novo o link a partir do email, sem o editar, ou pede um link novo."
        />
        <Button label="Pedir novo link" onPress={requestNewLink} fullWidth />
        <Button label="Ir para o login" variant="secondary" onPress={goToLogin} fullWidth />
      </AuthScaffold>
    );
  }

  if (success) {
    return (
      <AuthScaffold
        title="Palavra-passe alterada"
        subtitle="Já podes entrar com a nova palavra-passe."
      >
        <InlineAlert tone="success" message="A palavra-passe foi redefinida." />
        <Button label="Ir para o login" onPress={goToLogin} fullWidth />
      </AuthScaffold>
    );
  }

  async function handleSubmit() {
    const isValid = validate(
      { newPassword, confirmPassword },
      {
        newPassword: passwordStrength(),
        confirmPassword: combine(
          required('Confirma a palavra-passe.'),
          matches('newPassword', 'As palavras-passe não coincidem.'),
        ),
      },
    );
    if (!isValid) return;

    setLoading(true);
    try {
      await authApi.resetPassword({ userId: userId!, token: token!, newPassword });
      setSuccess(true);
    } catch (e) {
      applyApiError(e, { NewPassword: 'newPassword', Password: 'newPassword' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScaffold
      title="Nova palavra-passe"
      subtitle="Escolhe a palavra-passe que vais passar a usar para entrar."
    >
      <TextField
        label="Nova palavra-passe"
        hint={PASSWORD_HINT}
        value={newPassword}
        onChangeText={setNewPassword}
        error={fieldErrors.newPassword}
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

      {formError ? (
        <>
          <InlineAlert tone="error" message={formError} />
          <TextLink
            variant="meta"
            label="Pedir novo link de redefinição"
            onPress={requestNewLink}
          />
        </>
      ) : null}

      <Button label="Redefinir palavra-passe" loading={loading} onPress={handleSubmit} fullWidth />
    </AuthScaffold>
  );
}
