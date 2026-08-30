import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/ThemeContext';
import type { GlassVariant } from '@/theme/glass';

type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<ButtonSize, { padY: number; padX: number; minH: number }> = {
  sm: { padY: 8, padX: 14, minH: 36 },
  md: { padY: 13, padX: 20, minH: 44 },
  lg: { padY: 16, padX: 28, minH: 52 },
};

// "Seamless" glass button — translucent tint over a BlurView backdrop, a lit
// border, and an ambient shadow (tokens/glass.css in the AECC design
// system). Hover doesn't exist on touch, so only idle/pressed tints are used.
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  fullWidth = false,
  onPress,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const { colors, glass, glassRadius, fontFamily, fontSize, fontWeight } = theme;
  const s = SIZES[size];

  const destructive: GlassVariant = {
    tint: 'rgba(176, 34, 32, 0.88)',
    tintActive: 'rgba(120, 22, 21, 0.97)',
    border: 'rgba(255, 255, 255, 0.26)',
    blurIntensity: glass.neutral.blurIntensity,
    blurTint: glass.neutral.blurTint,
    shadow: glass.neutral.shadow,
  };

  const config: Record<ButtonVariant, { glass: GlassVariant | null; fg: string }> = {
    primary: { glass: glass.primary, fg: colors.textOnPrimary },
    gold: { glass: glass.gold, fg: colors.textOnGold },
    secondary: { glass: glass.neutral, fg: colors.accentPrimary },
    destructive: { glass: destructive, fg: '#ffffff' },
    ghost: { glass: null, fg: colors.accentPrimary },
  };
  const { glass: v, fg } = config[variant];

  return (
    <View
      style={[
        fullWidth && { width: '100%' },
        v ? v.shadow : null,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          {
            minHeight: s.minH,
            borderRadius: glassRadius.control,
            overflow: 'hidden',
            borderWidth: v ? 1 : 0,
            borderColor: v?.border ?? 'transparent',
            opacity: disabled ? 0.45 : 1,
          },
          pressed && !v ? { backgroundColor: glass.neutral.tintActive } : null,
        ]}
      >
        {({ pressed }) => (
          <>
            {v && <BlurView intensity={v.blurIntensity} tint={v.blurTint} style={StyleSheet.absoluteFillObject} />}
            {v && (
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  { backgroundColor: pressed ? v.tintActive : v.tint },
                ]}
              />
            )}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minHeight: s.minH,
                paddingVertical: s.padY,
                paddingHorizontal: s.padX,
                transform: pressed ? [{ translateY: 1 }] : undefined,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={fg} />
              ) : (
                <>
                  {icon}
                  <Text
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize[size === 'lg' ? 'md' : size === 'sm' ? 'sm' : 'base'],
                      fontWeight: fontWeight.bold,
                      color: fg,
                    }}
                  >
                    {children}
                  </Text>
                </>
              )}
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}
