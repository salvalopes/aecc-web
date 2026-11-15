import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Icon } from '@/components/ui/Icon';
import { Text } from './Text';

const factory = createStyles(({ radii }) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: radii.control,
    borderCurve: 'continuous',
  },
  message: { flex: 1 },
}));

/** Resultado de uma ação (substitui `Alert.alert` nos pontos de feedback). */
export function InlineAlert({
  tone,
  message,
  testID,
}: {
  tone: 'error' | 'success';
  message: string;
  testID?: string;
}) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      style={[s.box, { backgroundColor: tone === 'error' ? colors.errorBg : colors.successBg }]}
    >
      <Icon
        name={tone === 'error' ? 'warning-circle' : 'check'}
        size={size.icon.md}
        color={colors[tone]}
      />
      <Text variant="body" color={tone} style={s.message}>
        {message}
      </Text>
    </View>
  );
}
