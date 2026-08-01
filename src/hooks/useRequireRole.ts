import { useEffect } from 'react';
import { router, type Href } from 'expo-router';
import { useAuth } from './useAuth';
import type { UserRole } from '@/types/api';

const DEFAULT_FALLBACK: Href = '/(app)';

// Role-based access check for routes already inside (app) — the auth guard
// (logged in or not) lives one level up, in (app)/_layout.tsx. This hook only
// adds the extra "is this role allowed here" check on top of it.
export function useRequireRole(allow: UserRole[], fallback: Href = DEFAULT_FALLBACK) {
  const { user, isLoading } = useAuth();
  const allowed = !!user && allow.includes(user.role);

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace(fallback);
    }
  }, [isLoading, allowed, fallback]);

  return { allowed, checking: isLoading };
}
