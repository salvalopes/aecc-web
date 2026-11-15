import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon } from '@/components/ui/Icon';
import { Text } from './Text';
import { Button } from './Button';

const factory = createStyles(({ colors, radii }) => ({
  panel: {
    gap: 12,
    padding: 16,
    borderRadius: radii.group,
    borderCurve: 'continuous',
    backgroundColor: colors.errorBg,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  message: { flex: 1 },
}));

/** Painel inline (D5) com a mensagem e, opcionalmente, "Tentar de novo". */
export function ErrorState({
  message,
  onRetry,
  testID,
}: {
  message: string;
  onRetry?: () => void;
  testID?: string;
}) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <View testID={testID} accessibilityRole="alert" style={s.panel}>
      <View style={s.head}>
        <Icon name="warning-circle" size={size.icon.md} color={colors.error} />
        <Text variant="name" color="error" style={s.message}>
          {message}
        </Text>
      </View>
      {onRetry ? (
        <Button label="Tentar de novo" variant="secondary" size="sm" onPress={onRetry} />
      ) : null}
    </View>
  );
}
