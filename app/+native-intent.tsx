import { TABS } from '@/navigation/tabs';

// Deep links nativos para a raiz de uma tab que só alguns papéis veem (ex.: aecc://users) passam
// pela rota-guarda `(app)/guard/[tab]`: uma tab `hidden` não pode ficar em foco nas NativeTabs
// (o navegador lança erro), por isso quem não tem o papel vê "sem permissão" (T2).
// O `path` pode vir com esquema (`aecc://users`) ou só como caminho (`/users`).
const GUARDED = new Set(TABS.filter((tab) => tab.roles).map((tab) => tab.name));

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const match = path.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?\/?([^/?#]+)\/?$/i);
  const name = match?.[1];
  return name && GUARDED.has(name) ? `/guard/${name}` : path;
}
