import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabSlot, useTabTrigger, useTabsWithTriggers } from 'expo-router/ui';
import { useAuth } from '@/hooks/useAuth';
import { TABS, isTabVisible, type TabConfig } from '@/navigation/tabs';
import { BrandLockup, Text } from '@/components/ds';
import { GlassSurface, Icon } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { useTheme } from '@/theme/ThemeContext';

// Web: tabs headless do expo-router/ui (o docs das NativeTabs recomenda-o).
// Todas as rotas de TABS ficam registadas no navegador (os URLs funcionam e a
// guarda por papel de cada ecrã decide); só os triggers visíveis dependem do papel.
// sm: barra inferior em vidro · md+: linha de cápsulas no topo, à esquerda.
type Triggers = Parameters<typeof useTabsWithTriggers>[0]['triggers'];

const TRIGGERS: Triggers = TABS.map((tab) => ({
  type: 'internal',
  name: tab.name,
  href: tab.href,
}));

export default function TabsWebLayout() {
  const { user } = useAuth();
  const { isWide } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const styles = useStyles(stylesFactory);
  const { NavigationContent } = useTabsWithTriggers({ triggers: TRIGGERS });
  const visible = useMemo(() => TABS.filter((tab) => isTabVisible(tab, user?.role)), [user?.role]);

  return (
    <NavigationContent>
      <View style={styles.root}>
        {isWide ? (
          <View style={styles.topBar} accessibilityRole="tablist">
            <GlassSurface pointerEvents="none" radius={0} edge="bottom" style={styles.fill} />
            <BrandLockup width={96} />
            <View style={styles.capsules}>
              {visible.map((tab) => (
                <TabButton key={tab.name} tab={tab} wide />
              ))}
            </View>
          </View>
        ) : null}
        <TabSlot style={styles.slot} />
        {isWide ? null : (
          <View
            style={[styles.bottomBar, { paddingBottom: insets.bottom }]}
            accessibilityRole="tablist"
          >
            <GlassSurface pointerEvents="none" radius={0} edge="top" style={styles.fill} />
            {visible.map((tab) => (
              <TabButton key={tab.name} tab={tab} wide={false} />
            ))}
          </View>
        )}
      </View>
    </NavigationContent>
  );
}

function TabButton({ tab, wide }: { tab: TabConfig; wide: boolean }) {
  const { triggerProps } = useTabTrigger({ name: tab.name, href: tab.href });
  const { colors, size } = useTheme();
  const styles = useStyles(stylesFactory);
  const focused = triggerProps.isFocused;

  if (wide) {
    return (
      <Pressable
        testID={tab.testID}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={triggerProps.onPress}
        style={({ pressed }) => [
          styles.capsule,
          focused ? styles.capsuleActive : pressed ? styles.capsulePressed : null,
        ]}
      >
        <Icon
          name={tab.icon}
          size={size.icon.sm}
          color={focused ? colors.accentSoftText : colors.text2}
        />
        <Text
          variant="meta"
          color={focused ? undefined : 'text2'}
          style={focused ? styles.capsuleActiveLabel : null}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={tab.testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      onPress={triggerProps.onPress}
      style={styles.barItem}
    >
      <Icon
        name={tab.icon}
        size={size.icon.md}
        color={focused ? colors.accentText : colors.text3}
      />
      <Text
        variant="label"
        color={focused ? 'accentText' : 'text3'}
        numberOfLines={1}
        style={styles.barLabel}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}

const stylesFactory = createStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  slot: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing['2xl'],
    paddingHorizontal: t.layout.gutter,
    paddingVertical: t.spacing.sm,
    zIndex: 1,
  },
  capsules: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: t.size.hitTarget,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.capsule,
  },
  capsulePressed: { backgroundColor: t.colors.raised },
  capsuleActive: { backgroundColor: t.colors.accentSoft },
  capsuleActiveLabel: { color: t.colors.accentSoftText },
  bottomBar: { flexDirection: 'row', alignItems: 'stretch', zIndex: 1 },
  barItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing['2xs'],
    minHeight: t.size.hitTarget + t.spacing.lg,
    paddingVertical: t.spacing.sm,
  },
  barLabel: { letterSpacing: 0, textAlign: 'center' },
}));
