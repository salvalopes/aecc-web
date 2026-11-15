import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Text } from './Text';
import { glassStyle } from '../ui/GlassSurface';

const factory = createStyles(({ radii, size }) => ({
  base: {
    minHeight: size.hitTarget,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.capsule,
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
