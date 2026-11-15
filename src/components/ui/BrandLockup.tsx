import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

const LIGHT = require('../../../assets/brand/aecc-logo-light.png');
const DARK = require('../../../assets/brand/aecc-logo-dark.png');

// Cópias sem o sufixo `@3x` dos PNG de `assets/brand/redesign-2026/`: o `expo export -p web`
// emite o ficheiro com `@3x` mas escreve o URI sem ele (404). O tamanho vem sempre do `style`.
// Proporção do PNG (744 × 312): a altura deriva sempre da largura.
const RATIO = 312 / 744;

export interface BrandLockupProps {
  /** Largura em px; a altura segue a proporção do lockup. */
  width?: number;
  style?: StyleProp<ImageStyle>;
  /** `auto` segue o esquema ativo; `light`/`dark` fixam a variante (para fundos que não seguem o tema). */
  variant?: 'auto' | 'light' | 'dark';
}

/** Lockup completo da AECC. Variante clara/escura escolhida pelo esquema ativo (D7). */
export function BrandLockup({ width = 160, style, variant = 'auto' }: BrandLockupProps) {
  const { scheme } = useTheme();
  const dark = variant === 'auto' ? scheme === 'dark' : variant === 'dark';
  return (
    <Image
      source={dark ? DARK : LIGHT}
      style={[{ width, height: Math.round(width * RATIO) }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="AECC — Associação Empresarial do Concelho de Cascais"
    />
  );
}
