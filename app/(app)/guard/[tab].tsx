import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { TABS, isTabVisible } from '@/navigation/tabs';
import { ForbiddenState } from '@/components/templates/StateTemplates';

// Destino nativo dos deep links para a raiz de uma tab com papéis (ver `+native-intent.tsx`).
// As NativeTabs não conseguem focar uma tab `hidden`: o papel decide aqui, antes de navegar.
export default function TabGuard() {
  const { tab } = useLocalSearchParams<{ tab: string }>();
  const { user } = useAuth();
  const config = TABS.find((t) => t.name === tab);
  if (config && isTabVisible(config, user?.role)) return <Redirect href={config.href} />;
  return <ForbiddenState />;
}
