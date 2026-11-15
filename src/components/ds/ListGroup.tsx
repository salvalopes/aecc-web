import { Pressable, View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon } from '@/components/ui/Icon';
import { Surface } from './Surface';

/** Grupo de linhas sobre superfície sólida. */
export function ListGroup({ children, ...rest }: ViewProps) {
  return <Surface {...rest}>{children}</Surface>;
}

const factory = createStyles(({ colors, border, size }) => ({
  row: {
    minHeight: size.row.mobile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // hairline indentada: começa depois do plate (16 + 48 + 12)
  rule: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 16 + size.plate.md + 12,
    height: border.hairline,
    backgroundColor: colors.border,
  },
}));

export interface ListRowProps extends ViewProps {
  onPress?: () => void;
  /** Última linha do grupo: sem hairline. */
  last?: boolean;
  chevron?: boolean;
}

export function ListRow({ onPress, last, chevron, children, style, ...rest }: ListRowProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const body = (
    <>
      {children}
      {chevron ? <Icon name="caret-right" size={size.icon.sm} color={colors.text3} /> : null}
      {last ? null : <View pointerEvents="none" style={s.rule} />}
    </>
  );
  if (!onPress) {
    return (
      <View {...rest} style={[s.row, style]}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={rest.testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed ? { backgroundColor: colors.raised } : null, style]}
    >
      {body}
    </Pressable>
  );
}
