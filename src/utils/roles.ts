import type { UserRole } from '@/types/api';

/** Nome do papel na interface (T6 Perfil, T7 utilizador). */
export const ROLE_LABEL: Record<UserRole, string> = {
  Admin: 'Administrador',
  Associado: 'Associado',
  Cliente: 'Cliente',
};

/** O que o papel permite, limitado ao que as tabs garantem (`src/navigation/tabs.ts`). */
export const ROLE_HINT: Record<UserRole, string> = {
  Admin: 'Tem acesso à gestão de utilizadores.',
  Associado: 'Pode criar e gerir as próprias empresas e produtos.',
  Cliente: 'Consulta o diretório.',
};
