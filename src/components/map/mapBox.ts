/**
 * Caixa do mapa (aecc-api docs/mapa.md): valida o PUT /companies/{id}/location e serve de
 * enquadramento inicial. NÃO limita o mapa: o GET /map mostra empresas localizadas fora dela.
 */
export const MAP_BOX = { minLat: 38.62, maxLat: 38.86, minLng: -9.52, maxLng: -9.1 } as const;

export const MAP_CENTER = {
  lat: (MAP_BOX.minLat + MAP_BOX.maxLat) / 2,
  lng: (MAP_BOX.minLng + MAP_BOX.maxLng) / 2,
} as const;

export const INITIAL_ZOOM = 11;
/** Zoom ao focar uma empresa (?company=). */
export const FOCUS_ZOOM = 14;
/** Acima disto não há clusters; abaixo, o toque num cluster faz zoom (ou lista as folhas). */
export const CLUSTER_MAX_ZOOM = 16;

export function isInsideMapBox(lat: number, lng: number): boolean {
  return (
    lat >= MAP_BOX.minLat && lat <= MAP_BOX.maxLat && lng >= MAP_BOX.minLng && lng <= MAP_BOX.maxLng
  );
}

/** [[oeste, sul], [este, norte]]: a forma do `fitBounds` do maplibre-gl e do MapLibre RN. */
export type Bounds = [[number, number], [number, number]];

export const MAP_BOX_BOUNDS: Bounds = [
  [MAP_BOX.minLng, MAP_BOX.minLat],
  [MAP_BOX.maxLng, MAP_BOX.maxLat],
];

/**
 * Fração cortada em cada ponta de cada eixo no enquadramento inicial (decisão 3 da Fase B): as
 * poucas empresas de Lisboa, Amadora e Oeiras não puxam o mapa para leste; Cascais enche o ecrã.
 */
export const FRAMING_TRIM = 0.03;

function quantile(sorted: readonly number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/**
 * Enquadramento inicial: os limites das empresas DENTRO da caixa (as de fora não contam), sem os
 * `trim` mais afastados em cada ponta de cada eixo. Com menos de 2 empresas na caixa, a caixa.
 */
export function framingBounds(
  points: readonly { lat: number; lng: number }[],
  trim: number = FRAMING_TRIM,
): Bounds {
  const inside = points.filter((p) => isInsideMapBox(p.lat, p.lng));
  if (inside.length < 2) return MAP_BOX_BOUNDS;
  const lngs = inside.map((p) => p.lng).sort((a, b) => a - b);
  const lats = inside.map((p) => p.lat).sort((a, b) => a - b);
  const bounds: Bounds = [
    [quantile(lngs, trim), quantile(lats, trim)],
    [quantile(lngs, 1 - trim), quantile(lats, 1 - trim)],
  ];
  // Todas no mesmo ponto: um `fitBounds` de área zero iria ao zoom máximo; fica a caixa.
  if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]) return MAP_BOX_BOUNDS;
  return bounds;
}
