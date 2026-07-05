import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
}

export function LoadingSpinner({ size = 'large' }: LoadingSpinnerProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <ActivityIndicator size={size} color={colors.accentPrimary} />
    </View>
  );
}
