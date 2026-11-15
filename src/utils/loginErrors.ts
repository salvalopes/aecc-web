import { TokenError } from '@/api/nativeAuth.api';

// Mensagens do T1 para as recusas do grant password (só nativo). A API devolve sempre
// HTTP 400 `invalid_grant` e distingue o caso pelo `error_description`
// (aecc-api AuthorizationController.ExchangePasswordAsync); o 429 vem do rate limiter.
// Erros de rede não passam por aqui: o useFormValidation mostra-os no InlineAlert.
export const LOGIN_ERROR_MESSAGES = {
  invalid: 'Credenciais inválidas.',
  locked: 'Conta temporariamente bloqueada por excesso de tentativas. Tente mais tarde.',
  unconfirmed: 'Confirme o seu email antes de entrar: abra o link que lhe enviámos por email.',
  disabled: 'Esta conta está desativada. Se precisar de acesso, fale com a direção da AECC.',
  tooMany: 'Demasiadas tentativas. Tente daqui a pouco.',
  unknown: 'Não foi possível entrar. Tente novamente.',
} as const;

/** Mensagem do formulário para um erro do login nativo, ou `null` se não for uma recusa do token endpoint. */
export function nativeLoginErrorMessage(e: unknown): string | null {
  if (!(e instanceof TokenError)) return null;
  if (e.status === 429) return LOGIN_ERROR_MESSAGES.tooMany;
  if (e.error !== 'invalid_grant') return LOGIN_ERROR_MESSAGES.unknown;

  const description = (e.description ?? '').toLowerCase();
  if (description.includes('bloqueada')) return LOGIN_ERROR_MESSAGES.locked;
  if (description.includes('confirme')) return LOGIN_ERROR_MESSAGES.unconfirmed;
  if (description.includes('desativada')) return LOGIN_ERROR_MESSAGES.disabled;
  return LOGIN_ERROR_MESSAGES.invalid;
}
