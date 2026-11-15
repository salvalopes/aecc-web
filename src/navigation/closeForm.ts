import { router, type Href } from 'expo-router';

/**
 * Sai de um formulário T7 (guardado ou cancelado). Volta ao ecrã que o abriu; se o
 * formulário foi aberto por link direto (sem histórico), substitui-o pelo `fallback`.
 */
export function closeForm(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
