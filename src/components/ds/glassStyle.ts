import { Platform, type ViewStyle } from 'react-native';
import type { GlassMaterial } from '@/theme/glass';

/**
 * Aproximação do material para a B5 (web: tint + backdrop-filter; nativo: sólido + hairline).
 * Sem `GlassView` do iOS 26: o `GlassSurface` real chega na B4 e substitui isto.
 */
export function glassStyle(m: GlassMaterial, hovered = false): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      backgroundColor: hovered ? m.tintHover : m.tint,
      borderWidth: 1,
      borderColor: m.border,
      backdropFilter: m.webFilter,
      boxShadow: `inset 0 1px 0 ${m.highlight}`,
    } as unknown as ViewStyle;
  }
  return { backgroundColor: m.solid, borderWidth: 1, borderColor: m.border };
}
