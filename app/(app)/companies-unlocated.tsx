import { Suspense, lazy } from 'react';
import { SessionLoadingState } from '@/components/templates/StateTemplates';

// Gestão → "Empresas sem localização" (mapa-plano W7, só Admin). Regra 4: o ecrã é um chunk à
// parte; o bundle inicial fica só com este stub.
const UnlocatedScreen = lazy(() => import('@/components/map/UnlocatedScreen'));

export default function UnlocatedRoute() {
  return (
    <Suspense fallback={<SessionLoadingState />}>
      <UnlocatedScreen />
    </Suspense>
  );
}
