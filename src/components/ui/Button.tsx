import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps {
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onPress,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const { colors, radius, fontFamily, fontSize, fontWeight } = theme;

  const variants: Record<ButtonVariant, { bg: string; bgActive: string; fg: string; border: string }> = {
    primary: {
      bg: colors.accentPrimary,
      bgActive: colors.accentPrimaryActive,
      fg: colors.textOnAccent,
      border: 'transparent',
    },
    secondary: {
      bg: 'transparent',
      bgActive: colors.surfaceSunken,
      fg: colors.accentPrimary,
      border: colors.accentPrimary,
    },
    destructive: {
      bg: colors.error,
      bgActive: '#8f1c1c',
      fg: '#ffffff',
      border: 'transparent',
    },
    ghost: {
      bg: 'transparent',
      bgActive: colors.surfaceSunken,
      fg: colors.accentPrimary,
      border: 'transparent',
    },
  };

  const sizes: Record<ButtonSize, { padY: number; padX: number; font: number; minH: number }> = {
    sm: { padY: 8, padX: 14, font: fontSize.sm, minH: 36 },
    md: { padY: 13, padX: 20, font: fontSize.base, minH: 44 },
  };

  const v = variants[variant];
  const s = sizes[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: fullWidth ? '100%' : undefined,
          minHeight: s.minH,
          paddingVertical: s.padY,
          paddingHorizontal: s.padX,
          backgroundColor: pressed ? v.bgActive : v.bg,
          borderWidth: 1,
          borderColor: v.border,
          borderRadius: radius.md,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <Text style={{ fontFamily: fontFamily.body, fontSize: s.font, fontWeight: fontWeight.bold, color: v.fg }}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}
