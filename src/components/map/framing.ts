import { MAP_BOX, isInsideMapBox } from './mapBox';

// Enquadramento inicial (decisão 3 da Fase B). Módulo à parte do mapBox.ts: só o chunk do mapa o
// usa (o mapBox.ts também é usado pelos ecrãs de definições e iria para o JS inicial).
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
