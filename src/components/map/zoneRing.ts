// Símbolo da zona aproximada (`precision: 'area'`, decisão 4 da Fase B): anel oco tracejado, de
// tamanho FIXO no ecrã. Não representa uma distância e não muda com o zoom (ao contrário do disco
// geográfico de 600 m do protótipo, que saiu).
//
// É uma imagem SDF (signed distance field) branca: o MapLibre pinta-a com `icon-color`, por isso a
// cor vem sempre do tema (papel `text2`) e nunca fica gravada na imagem. A mesma função gera:
// - na web, os píxeis passados ao `map.addImage` (chunk do mapa);
// - no nativo, o `zone-ring@3x.png` (scripts/map/build-zone-ring.mjs), lido pelo `<Images>`.
// Sem imports: o script corre este ficheiro diretamente no Node.

/** Nome da imagem no estilo (camada `point-area`). */
export const ZONE_IMAGE = 'zone-ring';

/** Geometria em píxeis lógicos (iguais em web e nativo). */
export const ZONE_RING = {
  /** Lado da imagem (= `size.icon.lg`). */
  box: 24,
  /** Raio do traço (centro do traço). */
  radius: 7,
  /** Espessura do traço (= `border.focus`). */
  stroke: 2,
  /** Tracejado: segmentos à volta do anel e a fração de cada um que é traço. */
  dashes: 8,
  duty: 0.6,
  /** Píxeis da imagem por píxel lógico. */
  pixelRatio: 3,
} as const;

// Codificação do SDF igual à dos glifos do MapLibre (TinySDF, raio 8 e cutoff 0,25): a borda fica
// no alfa 191 e cada píxel lógico de distância vale 32 unidades de alfa.
const EDGE = 191;
const PER_PX = 32;

/** Distância (px lógicos) de (x, y) ao traço tracejado; negativa dentro do traço. */
function distance(x: number, y: number): number {
  const { box, radius, stroke, dashes, duty } = ZONE_RING;
  const cx = x - box / 2;
  const cy = y - box / 2;
  const r = Math.hypot(cx, cy);
  const radial = Math.abs(r - radius) - stroke / 2;
  // Distância ao longo do anel até ao traço mais próximo (0 dentro de um traço).
  const segment = (2 * Math.PI) / dashes;
  const a = (Math.atan2(cy, cx) + 2 * Math.PI) % segment;
  const half = (segment * duty) / 2;
  const off = Math.abs(a - segment / 2) - half;
  const along = Math.max(0, off) * radius;
  // Fora do traço nas duas direções: distância euclidiana ao canto; dentro: a radial (≤ 0).
  if (along > 0 && radial > 0) return Math.hypot(along, radial);
  if (along > 0) return along;
  return radial;
}

/** RGBA (branco, alfa = SDF) com `box * pixelRatio` de lado. */
export function zoneRingPixels(): { width: number; height: number; data: Uint8Array } {
  const { box, pixelRatio } = ZONE_RING;
  const side = box * pixelRatio;
  const data = new Uint8Array(side * side * 4);
  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const d = distance((i + 0.5) / pixelRatio, (j + 0.5) / pixelRatio);
      const alpha = Math.max(0, Math.min(255, Math.round(EDGE - d * PER_PX)));
      const k = (j * side + i) * 4;
      data[k] = 255;
      data[k + 1] = 255;
      data[k + 2] = 255;
      data[k + 3] = alpha;
    }
  }
  return { width: side, height: side, data };
}
