import { View } from 'react-native';
import { Text } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';

// Legenda dos pinos (A1 #4): o que é exato e o que é só a zona do código postal. As formas repetem
// as camadas do mapa (companyLayers.ts) com os mesmos papéis: ponto `accent` com contorno `pinEdge`,
// anel tracejado `text2` do tamanho do símbolo da zona (ZONE_RING em zoneRing.ts: caixa 24, anel de
// 16 com traço de 2). Não importa o zoneRing.ts: ficaria partilhado com o chunk do mapa e o Metro
// punha-o no JS inicial.
export const ZONE_LEGEND = 'Zona aproximada (código postal)';
// Forma compacta (faixa de baixo do telemóvel, protótipo A): numa linha, à altura do botão de posição.
export const EXACT_SHORT = 'Ponto exato';
export const ZONE_SHORT = 'Zona aproximada';
const COMPACT_LABEL = `Legenda: ponto, localização exata; anel tracejado, ${ZONE_LEGEND.toLowerCase()}`;

const factory = createStyles(({ border, colors, radius, size, spacing }) => ({
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.lg },
  compact: { flexWrap: 'nowrap', columnGap: spacing.md },
  compactItem: { gap: spacing.xs + spacing['2xs'] },
  compactMark: { width: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: spacing['2xl'],
    flexShrink: 1,
  },
  // Numa faixa estreita (telemóvel, ao lado da atribuição), o rótulo quebra em 2 linhas.
  label: { flexShrink: 1 },
  mark: { width: size.icon.lg, alignItems: 'center' },
  dot: {
    width: spacing.md + spacing['2xs'] * 2,
    height: spacing.md + spacing['2xs'] * 2,
    borderRadius: radius.capsule,
    backgroundColor: colors.accent,
    borderWidth: border.focus,
    borderColor: colors.pinEdge,
  },
  zone: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radius.capsule,
    borderWidth: border.focus,
    borderStyle: 'dashed',
    borderColor: colors.text2,
  },
}));

export function MapLegend({
  testID = 'map.legend',
  compact = false,
}: {
  testID?: string;
  /** Uma linha com rótulos curtos; o nome acessível tem o significado completo. */
  compact?: boolean;
}) {
  const s = useStyles(factory);
  const item = [s.item, compact ? s.compactItem : null];
  const mark = [s.mark, compact ? s.compactMark : null];
  return (
    <View
      testID={testID}
      style={[s.legend, compact ? s.compact : null]}
      accessible={compact}
      accessibilityLabel={compact ? COMPACT_LABEL : undefined}
    >
      <View style={item}>
        <View style={mark}>
          <View style={s.dot} />
        </View>
        <Text variant="meta" color="text" style={s.label}>
          {compact ? EXACT_SHORT : 'Localização exata'}
        </Text>
      </View>
      <View style={item}>
        <View style={mark}>
          <View style={s.zone} />
        </View>
        <Text variant="meta" color="text" style={s.label}>
          {compact ? ZONE_SHORT : ZONE_LEGEND}
        </Text>
      </View>
    </View>
  );
}
