// Escalas independentes do tema (direção Maré, fase3-plano §3.3).
// Tipografia em typography.ts; cor em colors.ts; vidro em glass.ts.

import { StyleSheet } from 'react-native';

export const spacing = {
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

/** Sempre com `borderCurve: 'continuous'`. */
export const radius = {
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
  /** Altura mínima de botões e campos de texto. */
  control: { sm: 40, md: 48 },
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
  /** Anel de foco (`focusRing`). */
  focus: 2,
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
  /** Largura máxima da página de um formulário em ecrã (T7, `md+`). */
  formPageMax: 880,
} as const;

/** Só web (`boxShadow`). No nativo não há sombra: a profundidade vem do material. */
export function shadow(highlight: string, shadowTint: string): string {
  return `inset 0 1px 0 ${highlight}, 0 12px 32px ${shadowTint}`;
}
