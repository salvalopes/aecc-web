import { Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from './Icon';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Ocorreu um erro.', onRetry }: ErrorStateProps) {
  const { colors, fontFamily, fontSize } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 12, padding: 48 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="warning-circle" size={18} color={colors.error} />
        <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.error, textAlign: 'center' }}>
          {message}
        </Text>
      </View>
      {onRetry && (
        <Button variant="secondary" size="sm" onPress={onRetry}>
          Tentar novamente
        </Button>
      )}
    </View>
  );
}
