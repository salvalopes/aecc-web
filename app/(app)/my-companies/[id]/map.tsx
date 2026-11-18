import { Suspense, lazy } from 'react';
import { SessionLoadingState } from '@/components/templates/StateTemplates';

// T7 "Visibilidade no mapa" (mapa-plano W6). Regra 4: o ecrã é um chunk à parte; o bundle
// inicial fica só com este stub.
const CompanyMapSettingsScreen = lazy(() => import('@/components/map/CompanyMapSettingsScreen'));

export default function CompanyMapSettingsRoute() {
  return (
    <Suspense fallback={<SessionLoadingState />}>
      <CompanyMapSettingsScreen />
    </Suspense>
  );
}
