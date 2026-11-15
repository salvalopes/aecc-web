import type { Href } from 'expo-router';
import type { MaterialIcon, SFSymbolIcon } from 'expo-router/unstable-native-tabs';
import type { IconName } from '@/components/ui/Icon';
import type { UserRole } from '@/types/api';

/**
 * Configuração única das tabs (fase3-plano §2.2-1). Consumida pelas NativeTabs
 * (`app/(app)/(tabs)/_layout.tsx`) e pelas tabs headless do web
 * (`_layout.web.tsx`), para que os papéis nunca divirjam entre plataformas.
 *
 * `name` é o nome da rota dentro de `(tabs)`; `testID` é contrato dos E2E.
 */
export interface TabConfig {
  name: string;
  href: Href;
  label: string;
  /** SF Symbol (iOS). */
  sf: Extract<SFSymbolIcon['sf'], string>;
  /** Material Symbol (Android). */
  md: MaterialIcon['md'];
  /** Ícone do web (`Icon`, Phosphor). */
  icon: IconName;
  /** Papéis que veem a tab; sem `roles`, todos. */
  roles?: readonly UserRole[];
  testID: string;
  /**
   * Raiz com horizonte (`ListScaffold`: T3, T5, T6): o ecrã gere as próprias safe areas (o `Horizon` em cima, o
   * `paddingBottom` em baixo). Desliga o inset automático das NativeTabs no 1.º ScrollView.
   */
  managesInsets?: boolean;
}

export const TABS: readonly TabConfig[] = [
  {
    name: '(home)',
    href: '/',
    label: 'Início',
    sf: 'house',
    md: 'home',
    icon: 'house-line',
    testID: 'tab.home',
    managesInsets: true,
  },
  {
    name: 'companies',
    href: '/companies',
    label: 'Empresas',
    sf: 'building.2',
    md: 'storefront',
    icon: 'storefront',
    testID: 'tab.companies',
    managesInsets: true,
  },
  {
    name: 'profile',
    href: '/profile',
    label: 'Perfil',
    sf: 'person.crop.circle',
    md: 'account_circle',
    icon: 'user',
    testID: 'tab.profile',
    managesInsets: true,
  },
  {
    name: 'my-companies',
    href: '/my-companies',
    label: 'Editar',
    sf: 'pencil',
    md: 'edit',
    icon: 'pencil-simple',
    roles: ['Admin', 'Associado'],
    testID: 'tab.my-companies',
    managesInsets: true,
  },
  {
    name: 'users',
    href: '/users',
    label: 'Utilizadores',
    sf: 'person.2.badge.gearshape',
    md: 'admin_panel_settings',
    icon: 'shield-check',
    roles: ['Admin'],
    testID: 'tab.users',
    managesInsets: true,
  },
];

export function isTabVisible(tab: TabConfig, role: UserRole | undefined): boolean {
  return !tab.roles || (!!role && tab.roles.includes(role));
}
