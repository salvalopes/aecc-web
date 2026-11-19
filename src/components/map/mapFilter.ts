import { topLevelOf } from '@/components/directory/categories';
import type { Category, MapCompany } from '@/types/api';

// Filtro no cliente (decisão 5 da Fase B): um só GET /companies/map dá o mapa e as contagens. A
// categoria de topo inclui as subcategorias, como no diretório.

/** Pontos da categoria `categoryId` ('' = todas); uma categoria de topo inclui as filhas. */
export function filterByCategory(
  points: readonly MapCompany[],
  categories: readonly Category[],
  categoryId: string,
): readonly MapCompany[] {
  if (!categoryId) return points;
  const top = categories.find((c) => c.id === categoryId);
  const ids = new Set([categoryId, ...(top ? top.children.map((c) => c.id) : [])]);
  return points.filter((p) => !!p.categoryId && ids.has(p.categoryId));
}

/** Contagem por categoria de topo (as subcategorias contam na mãe), a partir de todos os pontos. */
export function countsByTopCategory(
  points: readonly MapCompany[],
  categories: readonly Category[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const p of points) {
    if (!p.categoryId) continue;
    const top = topLevelOf(categories, p.categoryId);
    if (top) counts.set(top.id, (counts.get(top.id) ?? 0) + 1);
  }
  return counts;
}
