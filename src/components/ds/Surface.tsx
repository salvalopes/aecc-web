import { View, type ViewProps } from 'react-native';
import { createStyles, useStyles } from '@/theme/createStyles';

const factory = createStyles(({ colors, radii }) => ({
  base: { borderRadius: radii.group, borderCurve: 'continuous', overflow: 'hidden' },
  surface: { backgroundColor: colors.surface },
  raised: { backgroundColor: colors.raised },
}));

/** Superfície sólida (substitui o `Card`). */
export function Surface({
  tone = 'surface',
  style,
  ...rest
}: ViewProps & { tone?: 'surface' | 'raised' }) {
  const s = useStyles(factory);
  return <View {...rest} style={[s.base, s[tone], style]} />;
}
