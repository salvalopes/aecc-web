import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { GlassSurface } from './GlassSurface';

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
  testID?: string;
}

const SIZES: Record<ButtonSize, { padY: number; padX: number; minH: number }> = {
  sm: { padY: 8, padX: 14, minH: 36 },
  md: { padY: 13, padX: 20, minH: 44 },
  lg: { padY: 16, padX: 28, minH: 52 },
};

// Botão sobre o material único de vidro (`GlassSurface`); a ênfase vem do tint.
// Hover não existe em toque, por isso só há estados idle/pressed.
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
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const { colors, glassRadius, fontFamily, fontSize, fontWeight } = theme;
  const s = SIZES[size];

  // `tint`/`tintPressed`: cor de ênfase sobre o vidro (sem tint = vidro neutro).
  const config: Record<
    ButtonVariant,
    { tint: string | null; tintPressed: string | null; fg: string; glass: boolean }
  > = {
    primary: {
      tint: colors.accentPrimary,
      tintPressed: colors.accentPrimaryActive,
      fg: colors.textOnPrimary,
      glass: true,
    },
    gold: {
      tint: colors.accentGold,
      tintPressed: colors.accentGoldHover,
      fg: colors.textOnGold,
      glass: true,
    },
    secondary: { tint: null, tintPressed: null, fg: colors.accentPrimary, glass: true },
    destructive: { tint: colors.error, tintPressed: colors.error, fg: '#ffffff', glass: true },
    ghost: { tint: null, tintPressed: null, fg: colors.accentPrimary, glass: false },
  };
  const { tint, tintPressed, fg, glass: hasGlass } = config[variant];

  return (
    <View style={[fullWidth && { width: '100%' }, style]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          {
            minHeight: s.minH,
            borderRadius: glassRadius.control,
            overflow: 'hidden',
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        {({ pressed }) => (
          <>
            {hasGlass && (
              <GlassSurface
                pointerEvents="none"
                radius={glassRadius.control}
                tintColor={(pressed ? tintPressed : tint) ?? undefined}
                interactive
                pressed={pressed && (!tint || variant === 'destructive')}
                style={StyleSheet.absoluteFillObject}
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
