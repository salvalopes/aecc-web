import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '@/theme/ThemeContext';
import type { GlassMaterial } from '@/theme/glass';
import { glassShadow } from '@/theme/tokens';

/**
 * Capability do vidro: `true` só no iOS 26+ com o Liquid Glass disponível e sem
 * "Reduzir transparência". Em todos os outros casos (iOS < 26, Android, web) o
 * material é o fallback do `GlassSurface` (web: tint + backdrop-filter; nativo:
 * sólido + hairline).
 */
export function useGlassCapability(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((v) => alive && setReduced(v));
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return Platform.OS === 'ios' && !reduced && isLiquidGlassAvailable();
}

export type GlassEdge = 'all' | 'top' | 'bottom' | 'none';

/** Fallback sem `GlassView`: também usado diretamente por `SearchField` e `Chip`. */
export function glassStyle(
  m: GlassMaterial,
  opts: { hovered?: boolean; edge?: GlassEdge; opaque?: boolean; elevated?: boolean } = {},
): ViewStyle {
  const { hovered = false, edge = 'all', opaque = false, elevated = false } = opts;
  const border: ViewStyle =
    edge === 'all'
      ? { borderWidth: 1, borderColor: m.border }
      : edge === 'top'
        ? { borderTopWidth: 1, borderColor: m.border }
        : edge === 'bottom'
          ? { borderBottomWidth: 1, borderColor: m.border }
          : {};
  if (Platform.OS === 'web') {
    return {
      backgroundColor: opaque ? m.solid : hovered ? m.tintHover : m.tint,
      ...border,
      backdropFilter: opaque ? undefined : m.webFilter,
      boxShadow: elevated ? glassShadow(m.highlight, m.shadowTint) : `inset 0 1px 0 ${m.highlight}`,
    } as unknown as ViewStyle;
  }
  return { backgroundColor: m.solid, ...border };
}

export interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Raio (por omissão `radii.control`). Passar 0 para barras de ecrã inteiro. */
  radius?: number;
  /** Cor de ênfase (ação primária, chip ativo, destrutivo): tinge o vidro. */
  tintColor?: string;
  /** Hover (web) / pressed. */
  pressed?: boolean;
  /** Que bordas leva o hairline. */
  edge?: GlassEdge;
  /** Sólido em todo o lado menos no iOS 26 (painéis que têm de garantir contraste AA). */
  opaque?: boolean;
  /** Sombra de elevação (só web; no nativo a profundidade vem do material). */
  elevated?: boolean;
  /** `GlassView` interativo (iOS 26). */
  interactive?: boolean;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  testID?: string;
}

/** O único material de vidro da Maré (§3.4). */
export function GlassSurface({
  children,
  style,
  radius,
  tintColor,
  pressed = false,
  edge = 'all',
  opaque = false,
  elevated = false,
  interactive = false,
  pointerEvents,
  testID,
}: GlassSurfaceProps) {
  const { material, radii, scheme } = useTheme();
  const liquid = useGlassCapability();
  const r = radius ?? radii.control;
  const shape: ViewStyle = { borderRadius: r, borderCurve: 'continuous', overflow: 'hidden' };

  if (liquid) {
    return (
      <GlassView
        testID={testID}
        pointerEvents={pointerEvents}
        glassEffectStyle="regular"
        tintColor={tintColor}
        isInteractive={interactive}
        colorScheme={scheme}
        style={[shape, style]}
      >
        {children}
      </GlassView>
    );
  }

  const base = glassStyle(material, { hovered: pressed, edge, opaque, elevated });
  return (
    <View
      testID={testID}
      pointerEvents={pointerEvents}
      style={[
        shape,
        base,
        tintColor ? { backgroundColor: tintColor } : null,
        // nativo: o fallback é sólido, por isso o feedback de pressed é a opacidade
        pressed && Platform.OS !== 'web' ? { opacity: 0.85 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Agrupa superfícies de vidro (morph no iOS 26; `View` nos restantes). */
export function GlassGroup({
  children,
  style,
  spacing,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  spacing?: number;
}) {
  const liquid = useGlassCapability();
  if (liquid) {
    return (
      <GlassContainer spacing={spacing} style={style}>
        {children}
      </GlassContainer>
    );
  }
  return <View style={style}>{children}</View>;
}
