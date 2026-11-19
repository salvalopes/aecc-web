import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  SymbolLayerSpecification,
} from 'maplibre-gl';
import type { ThemeColors } from '@/theme/colors';
import { border, size, spacing } from '@/theme/tokens';
import { textStyles } from '@/theme/typography';
import { ZONE_IMAGE } from './zoneRing';

/**
 * Ids das fontes e camadas próprias. Só especificação de estilo do MapLibre: o maplibre-gl (web) e o
 * MapLibre RN 11 (`<Layer {...spec} />`) usam estas mesmas definições (direção B, Fase B).
 */
export const COMPANIES_SOURCE = 'companies';
/** O pino da ficha aberta, numa fonte própria SEM clusters: vê-se mesmo quando o ponto dele está
 * agregado (ex.: várias empresas no mesmo CP7, um cluster que nunca se desfaz). */
export const SELECTED_SOURCE = 'selected';
export const ME_SOURCE = 'me';
export const LAYER = {
  clusterHalo: 'cluster-halo',
  clusters: 'clusters',
  clusterCount: 'cluster-count',
  pointArea: 'point-area',
  pointExact: 'point-exact',
  selectedArea: 'selected-area',
  selectedExact: 'selected-exact',
  selectedRing: 'selected-ring',
  me: 'me',
} as const;
export const POINT_LAYERS = [LAYER.pointArea, LAYER.pointExact];

/** Raio de agregação dos clusters (px). Maior do que o diâmetro máximo + halo: não se tocam. */
export const CLUSTER_RADIUS = 72;

// Fonte dos números dos clusters: a mesma família do basemap, alojada no nosso servidor (T1).
const COUNT_FONT = ['Noto Sans Medium'];

const notCluster: ExpressionSpecification = ['!', ['has', 'point_count']];
const isArea: ExpressionSpecification = ['==', ['get', 'precision'], 'area'];
const sqrtCount: ExpressionSpecification = ['sqrt', ['get', 'point_count']];

/** Raio ∝ √n: 2 → `lg` (16), ≥ 400 → 40, para que 389 se distinga de 2 sem tapar o concelho. */
const CLUSTER_MIN = spacing.lg;
const CLUSTER_MAX = spacing['5xl'];
const clusterRadius: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  sqrtCount,
  Math.SQRT2,
  CLUSTER_MIN,
  20,
  CLUSTER_MAX,
];

type Spec = CircleLayerSpecification | SymbolLayerSpecification;

/**
 * Camadas dos pinos (direção B "Índice"). Cores só de papéis do tema.
 * - clusters: `accent`, raio ∝ √n, contorno `pinEdge` (≥ 3:1 contra o basemap claro e o escuro) e
 *   um halo do acento a 35 % que cresce com n (dá peso sem tapar o vizinho);
 * - exato: ponto `accent` com contorno `pinEdge`;
 * - zona (`precision: 'area'`): anel oco tracejado `text2`, de tamanho FIXO no ecrã (não é uma
 *   distância), nunca um ponto cheio (RGPD de leitura);
 * O pino selecionado está em `selectedLayers` (fonte própria, sem clusters).
 */
export function companyLayers(colors: ThemeColors): Spec[] {
  return [
    {
      id: LAYER.clusterHalo,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': colors.accent,
        'circle-opacity': 0.35,
        'circle-radius': [
          '+',
          clusterRadius,
          ['interpolate', ['linear'], sqrtCount, Math.SQRT2, spacing['2xs'], 20, spacing.sm],
        ],
      },
    },
    {
      id: LAYER.clusters,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': colors.accent,
        'circle-radius': clusterRadius,
        'circle-stroke-color': colors.pinEdge,
        'circle-stroke-width': border.focus,
      },
    },
    {
      id: LAYER.clusterCount,
      type: 'symbol',
      source: COMPANIES_SOURCE,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': COUNT_FONT,
        'text-size': [
          'interpolate',
          ['linear'],
          ['get', 'point_count'],
          2,
          textStyles.label.fontSize,
          400,
          textStyles.name.fontSize,
        ],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': colors.onAccent },
    },
    {
      id: LAYER.pointArea,
      type: 'symbol',
      source: COMPANIES_SOURCE,
      filter: ['all', notCluster, isArea],
      layout: {
        'icon-image': ZONE_IMAGE,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: { 'icon-color': colors.text2 },
    },
    {
      id: LAYER.pointExact,
      type: 'circle',
      source: COMPANIES_SOURCE,
      filter: ['all', notCluster, ['!', isArea]],
      paint: {
        'circle-color': colors.accent,
        'circle-radius': spacing.sm - spacing['2xs'],
        'circle-stroke-color': colors.pinEdge,
        'circle-stroke-width': border.focus,
      },
    },
  ];
}

/**
 * O pino selecionado (fonte `selected`, 0 ou 1 ponto): o mesmo símbolo do pino (exato ou zona) e,
 * à volta, um anel `text` de 3 px. Fica por cima dos clusters.
 */
export function selectedLayers(colors: ThemeColors): Spec[] {
  return [
    {
      id: LAYER.selectedRing,
      type: 'circle',
      source: SELECTED_SOURCE,
      paint: {
        'circle-color': colors.surface,
        'circle-radius': size.icon.sm - spacing['2xs'],
        'circle-stroke-color': colors.text,
        'circle-stroke-width': border.accentBar,
      },
    },
    {
      id: LAYER.selectedArea,
      type: 'symbol',
      source: SELECTED_SOURCE,
      filter: isArea,
      layout: {
        'icon-image': ZONE_IMAGE,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: { 'icon-color': colors.text2 },
    },
    {
      id: LAYER.selectedExact,
      type: 'circle',
      source: SELECTED_SOURCE,
      filter: ['!', isArea],
      paint: {
        'circle-color': colors.accent,
        'circle-radius': spacing.sm - spacing['2xs'],
        'circle-stroke-color': colors.pinEdge,
        'circle-stroke-width': border.focus,
      },
    },
  ];
}

/** "A sua posição": círculo `info` com contorno `surface` (fonte `me`). */
export function meLayer(colors: ThemeColors): CircleLayerSpecification {
  return {
    id: LAYER.me,
    type: 'circle',
    source: ME_SOURCE,
    paint: {
      'circle-color': colors.info,
      'circle-radius': spacing.sm,
      'circle-stroke-color': colors.surface,
      'circle-stroke-width': border.focus,
    },
  };
}
