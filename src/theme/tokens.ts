// Spacing, radius, typography scale & shadow shapes — theme-independent.
// Values copied verbatim from the AECC design system (tokens/spacing.css,
// tokens/typography.css), which in turn lifted them from this app's own
// shipped StyleSheets. Never rounded to a generic 4/8 grid.

import { StyleSheet } from 'react-native';

// Escala nova (Fase 3 / B1), chaves semânticas, ao lado da antiga (numérica,
// @deprecated até à B14). As chaves não colidem, por isso partilham o objeto.
const spacingNext = {
  0: 0,
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
} as const;

const spacingLegacy = {
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  9: 20,
  10: 24,
  12: 28,
  14: 32,
  16: 40,
} as const;

export const spacing = { ...spacingLegacy, ...spacingNext } as typeof spacingLegacy &
  typeof spacingNext;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  pill: 20,
  round: 28,
  circle: 999,
} as const;

// Minimum interactive target (WCAG 2.5.5 / brief requirement)
export const hitTargetMin = 44;

// Radii used only by the "seamless glass" surfaces (buttons, bars, tiles) —
// see tokens/glass.css in the AECC design system. Every other radius lives
// in `radius` above.
export const glassRadius = {
  control: 14,
  panel: 20,
} as const;

export const fontFamily = {
  display: 'LibreFranklin',
  body: 'SourceSans3',
};

export const fontSize = {
  '2xs': 11,
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 32,
  '4xl': 40,
  '5xl': 52,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.45,
  relaxed: 1.6,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
} as const;

// Elevation — matches the shipped app's shadowOffset/Opacity/Radius + Android elevation.
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ── Fase 3 / B1: tokens novos. `radii` (e não `radius`) e `glassShadow` (e não
// `shadow`) só porque os nomes finais colidem com os antigos; a B14 renomeia. ──

/** Sempre com `borderCurve: 'continuous'`. */
export const radii = {
  xs: 6,
  sm: 10,
  plate: 12,
  control: 14,
  group: 20,
  capsule: 999,
} as const;

export const size = {
  icon: { sm: 16, md: 20, lg: 24, xl: 28 },
  hitTarget: 44,
  plate: { sm: 32, md: 48, lg: 96 },
  row: { mobile: 72, web: 64, table: 48 },
  search: 52,
  /** Miniatura da galeria (T4). */
  thumb: 64,
} as const;

export const border = {
  hairline: StyleSheet.hairlineWidth,
  default: 1,
  accentBar: 3,
} as const;

export const opacity = { disabled: 0.45 } as const;

export const breakpoints = { md: 768, lg: 1280 } as const;

export const layout = {
  gutter: 20,
  /** Margem lateral em `md+`. */
  gutterWide: 32,
  sectionGap: 28,
  maxWidth: 1240,
  horizonHeight: 200,
  searchOverlap: -26,
  /** Coluna de formulário (T1) e de texto corrido ao lado dela. */
  formMaxWidth: 400,
  /** Coluna de contacto em texto à direita de uma linha de lista (web `md+`). */
  rowAside: 184,
  /** Largura mínima da sidebar do diretório (`lg`). */
  sidebarMin: 240,
} as const;

/** Só web (`boxShadow`). No nativo não há sombra: a profundidade vem do material. */
export function glassShadow(highlight: string, shadowTint: string): string {
  return `inset 0 1px 0 ${highlight}, 0 12px 32px ${shadowTint}`;
}
