import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  interactive?: boolean;
  onPress?: () => void;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, interactive = false, onPress, padding = 14, style }: CardProps) {
  const { colors, radius, shadow } = useTheme();

  const base: ViewStyle = {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.card,
  };

  if (!interactive) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <Pressable onPress={onPress} style={[base, style]}>
      {children}
    </Pressable>
  );
}
