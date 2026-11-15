import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Text } from './Text';
import { glassStyle } from './GlassSurface';

const factory = createStyles(({ radius, size, spacing }) => ({
  base: {
    minHeight: size.hitTarget,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.capsule,
    borderCurve: 'continuous',
  },
}));

export interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Cápsula; ativo = acento sólido (o vidro com tint chega na B4). */
export function Chip({ label, active = false, onPress, style, testID }: ChipProps) {
  const s = useStyles(factory);
  const { colors, material } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        active
          ? { backgroundColor: pressed ? colors.accentPressed : colors.accent }
          : glassStyle(material, { hovered: pressed }),
        style,
      ]}
    >
      <Text variant="meta" color={active ? 'onAccent' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}
