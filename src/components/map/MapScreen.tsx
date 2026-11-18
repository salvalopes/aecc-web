import { Suspense, lazy } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Horizon, Skeleton } from '@/components/ui';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';

// Regra 4: o componente do mapa (maplibre-gl no web) é outro chunk, pedido só por este ecrã.
const CompanyMap = lazy(() => import('@/components/map/CompanyMap'));

const factory = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
}));

const noop = () => {};

// Mapa das empresas (mapa-plano W3): componente do mapa; dados, filtro e ficha na W4.
export default function MapScreen() {
  const s = useStyles(factory);
  const { scheme, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  // Como no ListScaffold: as NativeTabs (iOS) flutuam por cima do conteúdo.
  const bottom = insets.bottom + (Platform.OS === 'ios' ? spacing['6xl'] * 2 : spacing['5xl']);

  return (
    <View testID="map.screen" style={s.screen}>
      <Horizon title="Mapa" />
      <View style={s.map}>
        <Suspense fallback={<Skeleton width="100%" height={spacing['6xl']} />}>
          <CompanyMap
            testID="map.view"
            points={[]}
            scheme={scheme}
            userPosition={null}
            onSelectCompany={noop}
            onSelectGroup={noop}
            insetBottom={bottom}
          />
        </Suspense>
      </View>
    </View>
  );
}
