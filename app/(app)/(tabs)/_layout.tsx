import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAuth } from '@/hooks/useAuth';
import { TABS, isTabVisible } from '@/navigation/tabs';
import { useTheme } from '@/theme/ThemeContext';

// iOS/Android: tab bar do sistema (Liquid Glass no iOS 26, UITabBar antes, barra
// nativa no Android). O web usa `_layout.web.tsx`. API "unstable" no SDK 55:
// se mudar, o plano B (JS Tabs + GlassSurface) troca só este ficheiro.
export default function TabsLayout() {
  const { user } = useAuth();
  const { colors, textStyles } = useTheme();
  const isAndroid = Platform.OS === 'android';

  return (
    <NativeTabs
      tintColor={colors.accentText}
      labelStyle={{ fontFamily: textStyles.meta.fontFamily }}
      // iOS: sem fundo próprio, para o material do sistema (vidro no iOS 26).
      backgroundColor={isAndroid ? colors.surface : undefined}
      indicatorColor={isAndroid ? colors.accentSoft : undefined}
      rippleColor={isAndroid ? colors.accentSoft : undefined}
      iconColor={isAndroid ? { default: colors.text2, selected: colors.accentSoftText } : undefined}
      labelVisibilityMode="labeled"
    >
      {TABS.map((tab) => (
        // O papel já está resolvido quando este layout monta (ver (app)/_layout.tsx).
        <NativeTabs.Trigger key={tab.name} name={tab.name} hidden={!isTabVisible(tab, user?.role)}>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
