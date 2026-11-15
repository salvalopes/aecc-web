import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandLockup } from '@/components/ds';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from './Icon';
import { Button } from './Button';
import { GlassSurface } from './GlassSurface';

interface TopBarProps {
  authenticated?: boolean;
  userName?: string | null;
  onLogin?: () => void;
  onRegister?: () => void;
  onProfile?: () => void;
  /** Shorter bar + smaller logo, for dense screens. */
  compact?: boolean;
}

// The masterpage header — glass bar carrying the AECC lockup at real scale
// plus a light/dark toggle and either the Entrar/Criar conta actions or a
// profile chip. Floats on glass so it can sit over the Yellow Pages hero.
export function TopBar({
  authenticated = false,
  userName = null,
  onLogin,
  onRegister,
  onProfile,
  compact = false,
}: TopBarProps) {
  const theme = useTheme();
  const {
    colors,
    glassRadius,
    hitTargetMin,
    fontFamily,
    fontSize,
    fontWeight,
    isDark,
    toggleTheme,
  } = theme;

  return (
    <View style={styles.wrap}>
      <GlassSurface
        pointerEvents="none"
        radius={0}
        edge="bottom"
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={[
          styles.row,
          { paddingVertical: compact ? 10 : 14, paddingHorizontal: compact ? 16 : 24 },
        ]}
      >
        <BrandLockup width={compact ? 86 : 114} style={{ flexShrink: 0 }} />

        <View style={styles.actions}>
          <Pressable
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            style={[
              styles.themeToggle,
              { width: hitTargetMin, height: hitTargetMin, borderRadius: 999 },
            ]}
          >
            {({ pressed }) => (
              <>
                <GlassSurface
                  pointerEvents="none"
                  radius={999}
                  pressed={pressed}
                  interactive
                  style={StyleSheet.absoluteFillObject}
                />
                <Icon name={isDark ? 'sun' : 'moon'} size={20} color={colors.accentPrimary} />
              </>
            )}
          </Pressable>

          {authenticated ? (
            <Pressable
              testID="topbar.profile"
              onPress={onProfile}
              style={[
                styles.profileChip,
                { minHeight: hitTargetMin, borderRadius: glassRadius.control },
              ]}
            >
              {({ pressed }) => (
                <>
                  <GlassSurface
                    pointerEvents="none"
                    radius={glassRadius.control}
                    pressed={pressed}
                    interactive
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Icon name="user" size={18} color={colors.accentPrimary} />
                  {/* minWidth: 0 is load-bearing on web — RNW compiles flex to real
                      CSS flexbox, where a flex item's default min-width is `auto`
                      (its content size), not 0. Without it here and on profileChip/
                      actions above, this Text never shrinks below the full name's
                      width no matter how narrow the screen, and numberOfLines'
                      ellipsis never gets a chance to kick in — the chip just
                      overflows the header instead of truncating. */}
                  <Text
                    style={{
                      flexShrink: 1,
                      minWidth: 0,
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.semibold,
                      color: colors.accentPrimary,
                    }}
                    numberOfLines={1}
                  >
                    {userName || 'Perfil'}
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.authActions}>
              <Button
                variant="secondary"
                size="sm"
                onPress={onLogin}
                icon={<Icon name="sign-in" size={16} color={colors.accentPrimary} />}
              >
                Entrar
              </Button>
              <Button
                variant="gold"
                size="sm"
                onPress={onRegister}
                icon={<Icon name="user-plus" size={16} color={colors.textOnGold} />}
              >
                Criar conta
              </Button>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    minWidth: 0,
  },
  // flexShrink so the chip/buttons give way instead of overflowing the header
  // on narrow phones; minWidth: 0 lets that shrink go below content size on
  // web (see the Text comment above for why RNW needs it explicitly).
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  themeToggle: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    flexShrink: 1,
    minWidth: 0,
  },
  authActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
});
