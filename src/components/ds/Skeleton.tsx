import { View, type DimensionValue } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { ListRow } from './ListGroup';

/** Barra de skeleton (estática: o shimmer fica na especificação de motion). */
export function Skeleton({ width, height = 12 }: { width: DimensionValue; height?: number }) {
  const { colors, radii } = useTheme();
  return (
    <View
      accessible={false}
      style={{ width, height, borderRadius: radii.xs, backgroundColor: colors.raised }}
    />
  );
}

const factory = createStyles(({ colors, size, radii, spacing }) => ({
  plate: {
    width: size.plate.md,
    height: size.plate.md,
    borderRadius: radii.plate,
    borderCurve: 'continuous',
    backgroundColor: colors.raised,
  },
  text: { flex: 1, gap: spacing.sm },
}));

// Larguras orgânicas: uma lista de skeletons iguais lê-se como um padrão, não como conteúdo.
const NAME_WIDTHS = ['58%', '46%', '66%', '52%', '62%', '42%'] as const;
const META_WIDTHS = ['38%', '44%', '32%', '40%', '36%', '30%'] as const;

/** Linha com a geometria da `CompanyRow`. Sem `testID` `directory.row` de propósito. */
export function SkeletonRow({
  last,
  index = 0,
  density,
}: {
  last?: boolean;
  /** Posição na lista: varia as larguras das barras. */
  index?: number;
  density?: 'regular' | 'compact';
}) {
  const s = useStyles(factory);
  return (
    <ListRow
      last={last}
      density={density}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={s.plate} />
      <View style={s.text}>
        <Skeleton width={NAME_WIDTHS[index % NAME_WIDTHS.length]} height={14} />
        <Skeleton width={META_WIDTHS[index % META_WIDTHS.length]} />
      </View>
    </ListRow>
  );
}
