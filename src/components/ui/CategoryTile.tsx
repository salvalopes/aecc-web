import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/ThemeContext';
import { Icon } from './Icon';
import { categoryIcon } from '@/utils/categoryIcons';

interface CategoryTileProps {
  /** Category slug — drives the icon via categoryIcon(). One of the 13 canonical slugs. */
  slug: string;
  label: string;
  /** Optional company count shown under the label. */
  count?: number | string | null;
  active?: boolean;
  onPress?: () => void;
}

// Soft glass tile for one business category: icon in a gold-tinted round
// well, label underneath, optional company count. A grid of these is the
// Yellow Pages entry point on the Início screen.
export function CategoryTile({ slug, label, count = null, active = false, onPress }: CategoryTileProps) {
  const { colors, glass, glassRadius, fontFamily, fontSize, fontWeight } = useTheme();
  const v = active ? glass.primary : glass.neutral;

  return (
    <View style={v.shadow}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.tile,
          {
            borderRadius: glassRadius.control,
            borderWidth: 1,
            borderColor: v.border,
            overflow: 'hidden',
          },
        ]}
      >
        {({ pressed }) => (
          <>
            <BlurView intensity={v.blurIntensity} tint={v.blurTint} style={StyleSheet.absoluteFillObject} />
            <View
              style={[StyleSheet.absoluteFillObject, { backgroundColor: pressed ? v.tintActive : v.tint }]}
            />
            <View style={styles.content}>
              <View
                style={[
                  styles.iconWell,
                  {
                    backgroundColor: active ? 'rgba(255,255,255,0.18)' : colors.featuredBg,
                  },
                ]}
              >
                <Icon name={categoryIcon(slug)} size={22} color={active ? colors.textOnAccent : colors.accentGoldText} />
              </View>
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.semibold,
                  color: active ? colors.textOnAccent : colors.textPrimary,
                  textAlign: 'center',
                  lineHeight: fontSize.xs * 1.25,
                }}
              >
                {label}
              </Text>
              {count !== null && (
                <Text
                  style={{
                    fontFamily: fontFamily.body,
                    fontSize: fontSize['2xs'],
                    color: active ? 'rgba(255,255,255,0.75)' : colors.textTertiary,
                  }}
                >
                  {count}
                </Text>
              )}
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 96,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 8,
    minHeight: 96,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
