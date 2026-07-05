import { Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'featured';

interface BadgeProps {
  children: string;
  tone?: BadgeTone;
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  const { colors, radius, fontFamily, fontSize, fontWeight } = useTheme();

  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceSunken, fg: colors.textSecondary },
    info: { bg: colors.infoBg, fg: colors.accentPrimary },
    success: { bg: colors.successBg, fg: colors.success },
    warning: { bg: colors.warningBg, fg: colors.warning },
    error: { bg: colors.errorBg, fg: colors.error },
    featured: { bg: colors.featuredBg, fg: '#7a5c04' },
  };
  const t = tones[tone];

  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs, backgroundColor: t.bg, alignSelf: 'flex-start' }}>
      <Text style={{ fontFamily: fontFamily.body, fontSize: fontSize['2xs'], fontWeight: fontWeight.bold, color: t.fg }}>
        {children}
      </Text>
    </View>
  );
}
