import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface ChipProps {
  children: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ children, active = false, onPress, style }: ChipProps) {
  const { colors, radius, fontFamily, fontSize, fontWeight } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: active ? colors.accentPrimary : colors.borderDefault,
          backgroundColor: active ? colors.accentPrimary : pressed ? colors.surfaceSunken : colors.surfaceCard,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
          fontWeight: active ? fontWeight.semibold : fontWeight.regular,
          color: active ? colors.textOnAccent : colors.textSecondary,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
