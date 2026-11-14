import { Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface EmptyStateProps {
  message?: string;
  testID?: string;
}

export function EmptyState({ message = 'Sem resultados.', testID }: EmptyStateProps) {
  const { colors, fontFamily, fontSize } = useTheme();
  return (
    <View testID={testID} style={{ alignItems: 'center', justifyContent: 'center', gap: 8, padding: 48 }}>
      <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textTertiary }}>{message}</Text>
    </View>
  );
}
