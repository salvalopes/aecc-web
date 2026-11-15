import { useAuth } from './useAuth';
import type { UserRole } from '@/types/api';

// Verificação de papel para rotas dentro de (app): a guarda de sessão (com ou sem
// login) vive um nível acima, em (app)/_layout.tsx. Não redireciona: o ecrã mostra
// `ForbiddenState` (T2) no sítio, para que o utilizador saiba porque não vê nada.
export function useRequireRole(allow: readonly UserRole[]) {
  const { user, isLoading } = useAuth();
  const allowed = !!user && allow.includes(user.role);
  return { allowed, checking: isLoading };
}
