import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { createStyles, useStyles } from '@/theme/createStyles';
import { Text } from './Text';
import { glassStyle } from './glassStyle';

type Variant = 'primary' | 'secondary' | 'glass' | 'destructive';
type Fg = 'onAccent' | 'text' | 'error';

const factory = createStyles(({ radii, opacity }) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.control,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
  },
  md: { minHeight: 48 },
  sm: { minHeight: 40, paddingHorizontal: 16 },
  disabled: { opacity: opacity.disabled },
}));

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'sm' | 'md';
  /** Mostra o indicador e bloqueia o toque (D6). */
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth,
  style,
  testID,
}: ButtonProps) {
  const s = useStyles(factory);
  const { colors, material } = useTheme();
  const inactive = disabled || loading;

  const fg: Fg = variant === 'primary' ? 'onAccent' : variant === 'destructive' ? 'error' : 'text';

  const background = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: pressed ? colors.accentPressed : colors.accent };
      case 'secondary':
        return {
          backgroundColor: pressed ? colors.raised : colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'glass':
        return glassStyle(material, pressed);
      case 'destructive':
        return { backgroundColor: colors.errorBg, opacity: pressed ? 0.8 : 1 };
    }
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={size === 'sm' ? 2 : 0}
      style={({ pressed }) => [
        s.base,
        s[size],
        background(pressed),
        fullWidth ? { alignSelf: 'stretch' } : null,
        inactive ? s.disabled : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={colors[fg]} /> : null}
      <Text variant="name" color={fg}>
        {label}
      </Text>
    </Pressable>
  );
}
