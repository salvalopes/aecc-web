import { Pressable, View, type PressableStateCallbackType, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon } from '@/components/ui/Icon';
import { Surface } from './Surface';

const groupFactory = createStyles(({ colors, border }) => ({
  group: { borderWidth: border.hairline, borderColor: colors.border },
}));

/** Grupo de linhas sobre superfície sólida (raio `group`, hairline exterior). */
export function ListGroup({ children, style, ...rest }: ViewProps) {
  const s = useStyles(groupFactory);
  return (
    <Surface {...rest} style={[s.group, style]}>
      {children}
    </Surface>
  );
}

const factory = createStyles(({ colors, border, size, spacing }) => ({
  row: {
    minHeight: size.row.mobile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  compact: { minHeight: size.row.web, paddingVertical: spacing.sm },
  // hairline indentada: começa depois do plate (16 + 48 + 12)
  rule: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: spacing.lg + size.plate.md + spacing.md,
    height: border.hairline,
    backgroundColor: colors.border,
  },
}));

export interface ListRowProps extends ViewProps {
  onPress?: () => void;
  /** Última linha do grupo: sem hairline. */
  last?: boolean;
  chevron?: boolean;
  /** `compact`: linha de 64 (web `md+`); `regular`: 72 (mobile). */
  density?: 'regular' | 'compact';
}

// O RNW passa `hovered` ao callback de estilo; no nativo não existe (hover só no web).
const isHovered = (state: PressableStateCallbackType) =>
  !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;

export function ListRow({
  onPress,
  last,
  chevron,
  density = 'regular',
  children,
  style,
  ...rest
}: ListRowProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const body = (
    <>
      {children}
      {chevron ? <Icon name="caret-right" size={size.icon.sm} color={colors.text3} /> : null}
      {last ? null : <View pointerEvents="none" style={s.rule} />}
    </>
  );
  const base = [s.row, density === 'compact' ? s.compact : null];
  if (!onPress) {
    return (
      <View {...rest} style={[...base, style]}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={rest.testID}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel}
      onPress={onPress}
      style={(state) => [
        ...base,
        state.pressed || isHovered(state) ? { backgroundColor: colors.raised } : null,
        style,
      ]}
    >
      {body}
    </Pressable>
  );
}
