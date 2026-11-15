import { startTransition, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { StateScreen } from '@/components/ds';

export default function AuthCallbackScreen() {
  const { code, state, error, error_description } = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const { completeOAuthLogin, isLoading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Wait for AuthProvider to finish restoring any previous session
    if (isLoading) return;

    if (error) {
      startTransition(() =>
        setErrorMessage(error_description ?? error ?? 'Erro no processo de login.'),
      );
      return;
    }

    if (!code || !state) {
      startTransition(() => setErrorMessage('Parâmetros OAuth em falta no URL de callback.'));
      return;
    }

    completeOAuthLogin(code, state)
      .then(() => router.replace('/companies'))
      .catch((e: unknown) => {
        startTransition(() =>
          setErrorMessage(e instanceof Error ? e.message : 'Erro ao completar login.'),
        );
      });
  }, [isLoading]);

  if (errorMessage) {
    return (
      <StateScreen
        testID="auth-callback.error"
        icon="warning-circle"
        title="Não foi possível entrar"
        description={errorMessage}
        actionLabel="Voltar ao login"
        onAction={() => router.replace('/(auth)/login')}
      />
    );
  }

  return <StateScreen loading testID="auth-callback.loading" description="A completar o login…" />;
}
