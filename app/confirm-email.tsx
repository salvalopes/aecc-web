import { useState } from 'react';
import { Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, InlineAlert, TextField } from '@/components/ui';
import { AuthScaffold } from '@/components/templates/AuthScaffold';
import { authApi } from '@/api/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { useFormValidation } from '@/hooks/useFormValidation';
import { required, passwordStrength, matches, combine, emailFormat } from '@/utils/validators';
import { nativeLoginErrorMessage } from '@/utils/loginErrors';

interface FormState {
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

const PASSWORD_HINT = 'Mínimo 8 caracteres, com maiúscula, minúscula e número.';

// Nativo: sem PKCE, a entrada a seguir à ativação é o grant password com as credenciais
// acabadas de definir. O link do email só traz userId e token, por isso o email é pedido
// aqui (pré-preenchido se um dia a API o puser no link como `email`).
const IS_NATIVE = Platform.OS !== 'web';

export default function ConfirmEmailScreen() {
  const {
    userId,
    token,
    email: emailParam,
  } = useLocalSearchParams<{ userId?: string; token?: string; email?: string }>();
  const { login, redirectToAuthorize } = useAuth();
  const [email, setEmail] = useState(emailParam ?? '');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { fieldErrors, formError, setFormError, validate, applyApiError } =
    useFormValidation<FormState>();

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
      { email, fullName, password, confirmPassword },
      {
        ...(IS_NATIVE ? { email: combine(required('O email é obrigatório.'), emailFormat()) } : {}),
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
    let confirmed = false;
    try {
      await authApi.confirmEmail({ userId: userId!, token: token!, fullName, password });
      confirmed = true;
      if (IS_NATIVE) {
        // Grant password → /companies (AuthContext.native).
        await login({ email, password });
        return;
      }
      // Sessão (cookie) já foi criada no backend — segue directamente para o PKCE.
      await redirectToAuthorize();
    } catch (e) {
      if (IS_NATIVE && confirmed) {
        // A conta já está ativa e o link não volta a servir: o login manual resolve
        // (ex.: email escrito com um erro).
        router.replace({ pathname: '/(auth)/login', params: { notice: 'account-activated' } });
        return;
      }
      const nativeMessage = nativeLoginErrorMessage(e);
      if (nativeMessage) {
        setFormError(nativeMessage);
        setLoading(false);
        return;
      }
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
      {IS_NATIVE ? (
        <TextField
          testID="confirm-email.email"
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
      ) : null}
      <TextField
        testID="confirm-email.full-name"
        label="Nome completo"
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors.fullName}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
      <TextField
        testID="confirm-email.password"
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
        testID="confirm-email.confirm-password"
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
        <InlineAlert testID="confirm-email.form-error" tone="error" message={formError} />
      ) : null}

      <Button
        testID="confirm-email.submit"
        label="Ativar e entrar"
        loading={loading}
        onPress={handleSubmit}
        fullWidth
      />
    </AuthScaffold>
  );
}
