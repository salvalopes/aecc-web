import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from './Icon';
import { Button } from './Button';

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
export function TopBar({ authenticated = false, userName = null, onLogin, onRegister, onProfile, compact = false }: TopBarProps) {
  const theme = useTheme();
  const { colors, glass, glassRadius, hitTargetMin, fontFamily, fontSize, fontWeight, isDark, toggleTheme } = theme;
  const v = glass.panel;

  return (
    <View style={[styles.wrap, v.shadow]}>
      <BlurView intensity={v.blurIntensity} tint={v.blurTint} style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: v.tint, borderBottomWidth: 1, borderBottomColor: v.border }]} />
      <View style={[styles.row, { paddingVertical: compact ? 10 : 14, paddingHorizontal: compact ? 16 : 24 }]}>
        <Image
          source={require('../../../assets/brand/aecc-logo.webp')}
          style={{ height: compact ? 36 : 48, width: compact ? 110 : 146 }}
          resizeMode="contain"
          accessibilityLabel="AECC — Associação Empresarial do Concelho de Cascais"
        />

        <View style={styles.actions}>
          <Pressable
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            style={({ pressed }) => [
              styles.themeToggle,
              {
                width: hitTargetMin,
                height: hitTargetMin,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: glass.neutral.border,
                backgroundColor: pressed ? glass.neutral.tintActive : glass.neutral.tint,
                overflow: 'hidden',
              },
            ]}
          >
            <Icon name={isDark ? 'sun' : 'moon'} size={20} color={colors.accentPrimary} />
          </Pressable>

          {authenticated ? (
            <Pressable
              onPress={onProfile}
              style={({ pressed }) => [
                styles.profileChip,
                {
                  minHeight: hitTargetMin,
                  borderRadius: glassRadius.control,
                  borderWidth: 1,
                  borderColor: glass.neutral.border,
                  backgroundColor: pressed ? glass.neutral.tintActive : glass.neutral.tint,
                },
              ]}
            >
              <Icon name="user" size={18} color={colors.accentPrimary} />
              <Text
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  color: colors.accentPrimary,
                }}
                numberOfLines={1}
              >
                {userName || 'Perfil'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.authActions}>
              <Button variant="secondary" size="sm" onPress={onLogin} icon={<Icon name="sign-in" size={16} color={colors.accentPrimary} />}>
                Entrar
              </Button>
              <Button variant="gold" size="sm" onPress={onRegister} icon={<Icon name="user-plus" size={16} color={colors.textOnGold} />}>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  themeToggle: { alignItems: 'center', justifyContent: 'center' },
  profileChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  authActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
