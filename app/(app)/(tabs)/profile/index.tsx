import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme, type ThemePreference } from '@/theme/ThemeContext';
import { useBreakpoint } from '@/theme/useBreakpoint';
import { Button, SegmentedControl } from '@/components/ds';
import { ListScaffold } from '@/components/templates/ListScaffold';
import { FormSection } from '@/components/templates/FormLayout';
import { InfoGroup, type InfoItem } from '@/components/detail/InfoGroup';
import { ROLE_HINT, ROLE_LABEL } from '@/utils/roles';

// T6 Perfil (B13), direção Maré.
// Horizonte com o nome e o email (sem avatar genérico: a identidade é o nome).
// Secções de definições como no T7: sm em coluna; md+ rótulo e explicação à esquerda (1fr)
// e o controlo à direita (2fr), numa coluna de `layout.formPageMax` alinhada à esquerda.
const factory = createStyles(({ spacing, layout }) => ({
  page: { width: '100%', maxWidth: layout.formPageMax, gap: layout.sectionGap },
  pageWide: { gap: spacing['5xl'] },
  start: { alignSelf: 'flex-start' },
}));

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema', testID: 'profile.theme-system' },
  { value: 'light', label: 'Claro', icon: 'sun', testID: 'profile.theme-light' },
  { value: 'dark', label: 'Escuro', icon: 'moon', testID: 'profile.theme-dark' },
] as const;

const THEME_HINT: Record<ThemePreference, string> = {
  system: 'Segue a definição de aspeto do dispositivo.',
  light: 'Fica claro, mesmo com o dispositivo em modo escuro.',
  dark: 'Fica escuro, mesmo com o dispositivo em modo claro.',
};

export default function ProfileScreen() {
  const s = useStyles(factory);
  const { user, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const { isWide } = useBreakpoint();
  const [leaving, setLeaving] = useState(false);

  async function handleLogout() {
    setLeaving(true);
    try {
      await logout();
      router.replace('/(auth)/login');
    } finally {
      setLeaving(false);
    }
  }

  const account: InfoItem[] = user
    ? [
        { key: 'role', label: 'Papel', value: ROLE_LABEL[user.role], testID: 'profile.role' },
        // Só quando é exceção (como na lista de utilizadores).
        ...(user.emailConfirmed
          ? []
          : [{ key: 'confirmed', label: 'Estado do email', value: 'Por confirmar' }]),
      ]
    : [];

  return (
    <ListScaffold
      testID="profile.screen"
      horizon={{
        title: user?.fullName || 'Perfil',
        meta: user?.email,
        testID: 'profile.identity',
      }}
    >
      <View style={[s.page, isWide ? s.pageWide : null]}>
        <FormSection testID="profile.theme" label="APARÊNCIA" description={THEME_HINT[preference]}>
          <View style={s.start}>
            <SegmentedControl
              accessibilityLabel="Aparência"
              options={THEME_OPTIONS}
              value={preference}
              onChange={setPreference}
            />
          </View>
        </FormSection>

        {user ? (
          <FormSection label="CONTA" description={ROLE_HINT[user.role]}>
            <InfoGroup testID="profile.account" items={account} />
          </FormSection>
        ) : null}

        <FormSection label="SESSÃO" description="Termina a sessão neste dispositivo.">
          <Button
            testID="profile.logout"
            variant="destructive"
            label="Terminar sessão"
            loading={leaving}
            onPress={handleLogout}
            fullWidth={!isWide}
            style={isWide ? s.start : undefined}
          />
        </FormSection>
      </View>
    </ListScaffold>
  );
}
