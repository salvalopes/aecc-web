// Dados fictícios (docs/redesign/fase2-direcoes.md §5). Nada é real.
import type { Category } from '@/types/api';
import type { ProtoCompany } from './types';

export const TOTAL_COUNT = 312;

const cat = (
  id: string,
  name: string,
  parentId: string | null,
  children: Category[] = [],
): Category => ({ id, name, slug: id, parentId, children });

export const CATEGORIES: Category[] = [
  cat('restauracao', 'Restauração', null),
  cat('comercio', 'Comércio', null),
  cat('saude', 'Saúde', null),
  cat('servicos', 'Serviços', null, [
    cat('contabilidade', 'Contabilidade', 'servicos'),
    cat('juridico', 'Jurídico', 'servicos'),
    cat('desporto', 'Desporto', 'servicos'),
  ]),
  cat('oficinas', 'Oficinas e reparação', null),
];

export function findCategory(id: string | null): Category | null {
  if (!id) return null;
  for (const c of CATEGORIES) {
    if (c.id === id) return c;
    const ch = c.children.find((x) => x.id === id);
    if (ch) return ch;
  }
  return null;
}

export const COMPANIES: ProtoCompany[] = [
  {
    id: 'c01',
    name: 'Maré Alta — Peixaria e Garrafeira, Lda.',
    tradeName: 'Maré Alta',
    caeDescription: 'Comércio a retalho de peixe, crustáceos e moluscos',
    locality: 'Cascais',
    logoUrl: 'mock:mare',
    phone: '+351 214 862 317',
    website: 'https://marealta.pt',
    categorySlug: 'comercio',
  },
  {
    id: 'c02',
    name: 'Oficina Rui Barradas & Filhos',
    tradeName: null,
    caeDescription: 'Manutenção e reparação de veículos automóveis',
    locality: 'Parede',
    logoUrl: 'mock:oficina',
    phone: '+351 912 408 663',
    website: null,
    categorySlug: 'oficinas',
  },
  {
    id: 'c03',
    name: 'Clínica Dentária Quinta da Marinha, Lda.',
    tradeName: 'Dentária da Marinha',
    caeDescription: 'Atividades de medicina dentária',
    locality: 'Cascais',
    logoUrl: 'mock:dental',
    phone: '+351 214 869 044',
    website: 'https://dentariadamarinha.pt',
    categorySlug: 'saude',
  },
  {
    id: 'c04',
    name: 'Atelier Vidraça do Estoril, Unipessoal Lda.',
    tradeName: 'Vidraça',
    caeDescription: 'Fabricação de vidro plano',
    locality: 'Estoril',
    logoUrl: null,
    phone: '+351 214 676 902',
    website: 'https://vidraca-estoril.pt',
    categorySlug: 'oficinas',
  },
  {
    id: 'c05',
    name: 'Padaria Formosa de Tires, Lda.',
    tradeName: 'Padaria Formosa',
    caeDescription: 'Fabricação de pão e de produtos de pastelaria frescos',
    locality: 'Tires',
    logoUrl: 'mock:padaria',
    phone: '+351 214 449 071',
    website: null,
    categorySlug: 'comercio',
  },
  {
    id: 'c06',
    name: 'Contas Certas Contabilidade, Unipessoal Lda.',
    tradeName: 'Contas Certas',
    caeDescription: 'Atividades de contabilidade e auditoria',
    locality: 'São Domingos de Rana',
    logoUrl: 'mock:contas',
    phone: '+351 211 573 830',
    website: 'https://contascertas.pt',
    categorySlug: 'contabilidade',
  },
  {
    id: 'c07',
    name: 'Restaurante O Pescador da Guia, Lda.',
    tradeName: 'O Pescador',
    caeDescription: 'Restaurantes do tipo tradicional',
    locality: 'Cascais',
    logoUrl: 'mock:pescador',
    phone: '+351 214 835 126',
    website: 'https://opescador.pt',
    categorySlug: 'restauracao',
  },
  {
    id: 'c08',
    name: 'Cais Velho — Restauração e Bebidas, Lda.',
    tradeName: null,
    caeDescription: 'Restaurantes do tipo tradicional',
    locality: 'Carcavelos',
    logoUrl: null,
    phone: '+351 965 117 402',
    website: null,
    categorySlug: 'restauracao',
  },
  {
    id: 'c09',
    name: 'Joaquim Pimentel Nunes, Empresário em Nome Individual',
    tradeName: 'Pimentel Nunes',
    caeDescription: null,
    locality: 'Alcabideche',
    logoUrl: null,
    phone: '+351 917 330 281',
    website: null,
    categorySlug: 'servicos',
  },
  {
    id: 'c10',
    name: 'Associação Recreativa e Cultural de Birre',
    tradeName: null,
    caeDescription: 'Atividades de organizações associativas',
    locality: null,
    logoUrl: null,
    phone: null,
    website: null,
    categorySlug: 'servicos',
  },
  {
    id: 'c11',
    name: 'Teixeira, Vasconcelos, Abrantes & Associados — Sociedade de Advogados, SP, RL',
    tradeName: null,
    caeDescription: 'Atividades jurídicas',
    locality: 'Cascais',
    logoUrl: 'mock:advogados',
    phone: '+351 214 828 590',
    website: 'https://tva-advogados.pt',
    categorySlug: 'juridico',
  },
  {
    id: 'c12',
    name: 'Clube de Ténis e Padel de Murches, Lda.',
    tradeName: 'Padel Murches',
    caeDescription: 'Gestão de instalações desportivas',
    locality: 'Murches',
    logoUrl: 'mock:padel',
    phone: '+351 214 692 305',
    website: 'https://padelmurches.pt',
    categorySlug: 'desporto',
  },
  {
    id: 'c13',
    name: 'Farmácia Abóboda, Lda.',
    tradeName: 'Farmácia da Abóboda',
    caeDescription: 'Comércio a retalho de produtos farmacêuticos',
    locality: 'Abóboda',
    logoUrl: 'mock:farmacia',
    phone: '+351 214 440 618',
    website: null,
    categorySlug: 'saude',
  },
  {
    id: 'c14',
    name: 'Clínica Veterinária da Parede, Lda.',
    tradeName: null,
    caeDescription: 'Atividades veterinárias',
    locality: 'Parede',
    logoUrl: null,
    phone: '+351 214 575 019',
    website: 'https://vetparede.pt',
    categorySlug: 'saude',
  },
];

const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/** Pesquisa por nome, nome comercial, atividade ou localidade; sem acentos nem maiúsculas. */
export function filterCompanies(query: string, categoryId: string | null): ProtoCompany[] {
  const q = strip(query.trim());
  const slugs = new Set<string>();
  if (categoryId) {
    slugs.add(categoryId);
    CATEGORIES.find((c) => c.id === categoryId)?.children.forEach((ch) => slugs.add(ch.id));
  }
  return COMPANIES.filter((c) => {
    if (categoryId && !slugs.has(c.categorySlug)) return false;
    if (!q) return true;
    return [c.name, c.tradeName, c.caeDescription, c.locality].some(
      (v) => v && strip(v).includes(q),
    );
  });
}

/** Partes de `text` com `hit` = verdadeiro onde o termo coincide (sem acentos nem maiúsculas). */
export function splitByTerm(text: string, query: string): { text: string; hit: boolean }[] {
  const q = strip(query.trim());
  if (!q) return [{ text, hit: false }];
  const chars = Array.from(text);
  const norm = chars.map((ch) => strip(ch));
  const flat = norm.join('');
  // offsets[i] = posição em `flat` onde começa o carácter i
  const offsets: number[] = [];
  let acc = 0;
  for (const n of norm) {
    offsets.push(acc);
    acc += n.length;
  }
  const parts: { text: string; hit: boolean }[] = [];
  let cursor = 0; // índice de carácter já emitido
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
export function initials(c: Pick<ProtoCompany, 'name' | 'tradeName'>): string {
  const words = (c.tradeName ?? c.name)
    .split(/\s+/)
    .filter((w) => w && !SMALL.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function domain(url: string | null): string | null {
  return url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;
}
