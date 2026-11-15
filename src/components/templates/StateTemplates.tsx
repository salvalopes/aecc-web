import { router } from 'expo-router';
import { StateScreen } from '@/components/ds';

// T2 Estado (fase3-plano §4.1): os estados de ecrã inteiro que não são conteúdo.
// O texto vive aqui para que os mesmos estados digam sempre o mesmo.

/** Sessão (e papel) a resolver. Também cobre o instante antes do redirect para o login. */
export function SessionLoadingState() {
  return <StateScreen loading testID="state.session-loading" />;
}

/** Rota protegida aberta com um papel que não a pode ver. Substitui o redirect silencioso. */
export function ForbiddenState() {
  return (
    <StateScreen
      testID="state.forbidden"
      icon="shield-check"
      title="Sem permissão"
      description="A sua conta não tem acesso a esta página. Se precisar dele, fale com a direção da AECC."
      actionLabel="Voltar ao início"
      onAction={() => router.replace('/')}
    />
  );
}

/** Rota inexistente (`+not-found`). */
export function NotFoundState() {
  return (
    <StateScreen
      testID="state.not-found"
      icon="magnifying-glass"
      title="Página não encontrada"
      description="O endereço pode estar errado ou a página já não existe."
      actionLabel="Voltar ao início"
      onAction={() => router.replace('/')}
    />
  );
}
