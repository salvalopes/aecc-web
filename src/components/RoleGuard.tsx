import { View } from 'react-native';
import type { Href } from 'expo-router';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useTheme } from '@/theme/ThemeContext';
import { LoadingSpinner } from '@/components/ui';
import type { UserRole } from '@/types/api';

interface RoleGuardProps {
  allow: UserRole[];
  fallback?: Href;
  children: React.ReactNode;
}

// Wrap a screen's content with this to keep it from rendering (and from
// mounting its data-loading effects) for roles that shouldn't see it.
// While AuthContext is still resolving the role, shows a spinner instead of
// guessing — redirecting too early would bounce a user who'd actually be
// allowed once loading finishes.
export function RoleGuard({ allow, fallback, children }: RoleGuardProps) {
  const { colors } = useTheme();
  const { allowed, checking } = useRequireRole(allow, fallback);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceApp }}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
