import type { Category } from '@/types/api';

/** Categoria de topo que contém `id` (o próprio, se já for de topo). */
export function topLevelOf(categories: readonly Category[], id: string): Category | null {
  if (!id) return null;
  return categories.find((c) => c.id === id || c.children.some((ch) => ch.id === id)) ?? null;
}

/** Nome da categoria `id`, em qualquer nível da árvore. */
export function categoryName(categories: readonly Category[], id: string): string | null {
  if (!id) return null;
  for (const c of categories) {
    if (c.id === id) return c.name;
    const child = c.children.find((ch) => ch.id === id);
    if (child) return child.name;
  }
  return null;
}

/** "312 empresas associadas" sem filtros; com filtros, a contagem do filtro ativo. */
export function countLabel(n: number, filters: { query: string; category: string | null }) {
  const q = filters.query.trim();
  if (!q && !filters.category) return n === 1 ? '1 empresa associada' : `${n} empresas associadas`;
  let label = n === 1 ? '1 empresa' : `${n} empresas`;
  if (filters.category) label += ` em ${filters.category}`;
  if (q) label += ` para «${q}»`;
  return label;
}
