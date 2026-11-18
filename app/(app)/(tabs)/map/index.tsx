import { Suspense, lazy } from 'react';
import { StateScreen } from '@/components/ui';

// Rota da tab Mapa (mapa-plano W3/W4). Regra 4: o ecrã inteiro (dados, filtro, ficha) e o mapa
// (maplibre-gl + pmtiles no web) vivem em chunks carregados só quando se abre esta rota; o bundle
// inicial fica só com este stub.
const MapScreen = lazy(() => import('@/components/map/MapScreen'));

export default function MapRoute() {
  return (
    <Suspense fallback={<StateScreen testID="map.loading" loading />}>
      <MapScreen />
    </Suspense>
  );
}
