const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/** Partes de `text` com `hit` onde o termo coincide (sem acentos nem maiúsculas). */
export function splitByTerm(text: string, query: string): { text: string; hit: boolean }[] {
  const q = strip(query.trim());
  if (!q) return [{ text, hit: false }];
  const chars = Array.from(text);
  const norm = chars.map((ch) => strip(ch));
  const flat = norm.join('');
  const offsets: number[] = [];
  let acc = 0;
  for (const n of norm) {
    offsets.push(acc);
    acc += n.length;
  }
  const parts: { text: string; hit: boolean }[] = [];
  let cursor = 0;
  let from = 0;
  for (;;) {
    const at = flat.indexOf(q, from);
    if (at === -1) break;
    const start = offsets.findIndex((o) => o >= at);
    let end = start;
    let len = 0;
    while (end < chars.length && len < q.length) len += norm[end++].length;
    if (start > cursor) parts.push({ text: chars.slice(cursor, start).join(''), hit: false });
    parts.push({ text: chars.slice(start, end).join(''), hit: true });
    cursor = end;
    from = at + q.length;
  }
  if (cursor < chars.length) parts.push({ text: chars.slice(cursor).join(''), hit: false });
  return parts;
}

const SMALL = new Set(['de', 'da', 'do', 'das', 'dos', 'e', '&', '—', '-', 'a', 'o']);

/** Iniciais (até 2) do nome comercial ou do nome, sem preposições. */
export function initials(c: { name: string; tradeName: string | null }): string {
  return (c.tradeName ?? c.name)
    .split(/\s+/)
    .filter((w) => w && !SMALL.has(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Domínio legível de um URL (sem esquema, `www.` nem barra final): `https://mare.pt/` → `mare.pt`. */
export function displayDomain(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}

/** URL abrível: acrescenta `https://` quando o site foi guardado sem esquema. */
export function absoluteUrl(url: string): string {
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

/** `tel:` sem espaços (os telefones vêm formatados, ex. `+351 214 862 317`). */
export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
