// Família única Geist (TTF estáticos 400/500/600/700 em assets/fonts/geist/).
// Carregados no _layout raiz.
import type { TextStyle } from 'react-native';

export const geist = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
} as const;

type TextScale = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>;

// Sem `color`: a cor vem do componente <Text> (meta/label → text2).
export const textStyles = {
  hero: { fontFamily: geist.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  title: { fontFamily: geist.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  heading: { fontFamily: geist.semibold, fontSize: 20, lineHeight: 26 },
  name: { fontFamily: geist.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: geist.regular, fontSize: 15, lineHeight: 22 },
  meta: { fontFamily: geist.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: geist.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
} as const satisfies Record<string, TextScale>;

export type TextVariant = keyof typeof textStyles;

export const tabular: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

/** Tamanho mínimo dos inputs (evita o auto-zoom do Safari iOS). */
export const inputMin = 16;
