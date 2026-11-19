import { Suspense, lazy, startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { CategoryChips } from '@/components/directory/CategoryChips';
import { categoryName } from '@/components/directory/categories';
import {
  ErrorState,
  GlassSurface,
  Horizon,
  IconButton,
  InlineAlert,
  Skeleton,
  StateScreen,
  Text,
} from '@/components/ui';
import { useMapCompanies } from '@/hooks/useMapCompanies';
import { useUserPosition } from '@/hooks/useUserPosition';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import { useBreakpoint } from '@/theme/useBreakpoint';
import type { Category, MapCompany } from '@/types/api';
import { CompanyCard, CompanyGroup } from './CompanyCard';
import type { LatLng } from './CompanyMap.types';

// Regra 4: o componente do mapa (maplibre-gl no web) é outro chunk, pedido só por este ecrã.
const CompanyMap = lazy(() => import('@/components/map/CompanyMap'));

const factory = createStyles(({ colors, layout, spacing }) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  toolbar: { paddingHorizontal: layout.gutter, paddingTop: spacing.md },
  toolbarWide: { paddingHorizontal: layout.gutterWide },
  body: { flex: 1, gap: spacing.md, paddingTop: spacing.md },
  // md+: mapa à esquerda e a ficha numa coluna à direita (o mapa não perde altura).
  bodyWide: { flexDirection: 'row', paddingRight: layout.gutterWide },
  side: { width: layout.formMaxWidth },
  map: { flex: 1 },
  locate: { position: 'absolute', top: spacing.md, right: spacing.md },
  alert: { paddingHorizontal: layout.gutter, paddingTop: spacing.md },
  alertWide: { paddingHorizontal: layout.gutterWide },
  // Só para leitores de ecrã (o ponto "me" é desenhado no canvas).
  srOnly: {
    position: 'absolute',
    width: spacing['2xs'],
    height: spacing['2xs'],
    overflow: 'hidden',
  },
  panel: { paddingHorizontal: layout.gutter },
  panelWide: { paddingHorizontal: layout.gutterWide },
}));

type Selection = { kind: 'company'; id: string } | { kind: 'group'; ids: string[] } | null;

function countText(n: number) {
  return n === 1 ? '1 empresa' : `${n} empresas`;
}

// Mapa das empresas (mapa-plano W4): contagem, filtro por categoria (os chips do diretório),
// estados, ficha ao tocar num pino, lista quando o cluster não se desfaz e `?company=<id>`.
export default function MapScreen() {
  const s = useStyles(factory);
  const { scheme, spacing, radius } = useTheme();
  const { isWide } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ company?: string }>();

  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const { points, loaded, loadedFor, loading, error, reload } = useMapCompanies({ categoryId });
  // Regras 1 e 2: a posição só é pedida no toque e fica só em memória (nunca vai na rede).
  const me = useUserPosition();

  // Como no ListScaffold: as NativeTabs (iOS) flutuam por cima do conteúdo.
  const bottom = insets.bottom + (Platform.OS === 'ios' ? spacing['6xl'] * 2 : spacing['5xl']);

  useEffect(() => {
    categoriesApi
      .list()
      .then((data) => startTransition(() => setCategories(data)))
      .catch((e) => {
        // Sem categorias, os chips não aparecem; o mapa continua utilizável.
        if (!(e instanceof ApiError)) throw e;
      });
  }, []);

  const byId = useMemo(() => new Map(points.map((p) => [p.id, p])), [points]);

  // `?company=<id>` (ex.: "Ver no mapa" no detalhe): limpa o filtro, foca e abre a ficha. Se a
  // empresa não estiver no mapa (escondida, sem localização), avisa. O parâmetro é consumido no
  // fim, para que um novo "Ver no mapa" da mesma empresa volte a focar.
  const [missingCompany, setMissingCompany] = useState(false);
  useEffect(() => {
    if (!params.company) return;
    setMissingCompany(false);
    setCategoryId('');
  }, [params.company]);
  useEffect(() => {
    const id = params.company;
    if (!id || loadedFor !== '') return;
    const company = byId.get(id);
    if (company) {
      setSelection({ kind: 'company', id });
      setFocus({ lat: company.lat, lng: company.lng });
    } else {
      setSelection(null);
      setMissingCompany(true);
    }
    router.setParams({ company: undefined });
  }, [params.company, loadedFor, byId]);

  // Regra 2: o mapa NÃO se move para a posição do utilizador (só desenha o ponto). Mover a câmara
  // para lá pediria ao nosso servidor os tiles dessa zona, o que a localiza (≈ 2 km a z14).
  // O `focus` só recebe posições de empresas.
  const toggleLocate = useCallback(() => {
    if (me.state === 'shown') me.clear();
    else me.request();
  }, [me]);

  const categoryOf = useCallback(
    (company: MapCompany) =>
      company.categoryId ? categoryName(categories, company.categoryId) : null,
    [categories],
  );

  const changeCategory = useCallback((id: string) => {
    setSelection(null);
    setCategoryId(id);
  }, []);

  const open = useCallback((id: string) => router.push(`/companies/${id}`), []);
  const close = useCallback(() => setSelection(null), []);
  const selectCompany = useCallback((id: string) => setSelection({ kind: 'company', id }), []);
  const selectGroup = useCallback((ids: string[]) => setSelection({ kind: 'group', ids }), []);

  const selected = selection?.kind === 'company' ? byId.get(selection.id) : null;
  const group =
    selection?.kind === 'group'
      ? selection.ids.map((id) => byId.get(id)).filter((c): c is MapCompany => !!c)
      : [];

  const meta = loaded ? (
    <Text testID="map.count" variant="meta" tabular>
      {countText(points.length)}
    </Text>
  ) : (
    <Skeleton width={spacing['6xl'] * 2} />
  );

  let body;
  if (error) {
    body = (
      <View style={[s.panel, isWide ? s.panelWide : null]}>
        <ErrorState testID="map.error" message={error} onRetry={reload} />
      </View>
    );
  } else if (!loaded) {
    body = <StateScreen testID="map.loading" loading title="A carregar o mapa" />;
  } else if (!loading && points.length === 0) {
    body = categoryId ? (
      <StateScreen
        testID="map.empty"
        icon="map-trifold"
        title="Sem empresas no mapa nesta categoria"
        description="Nenhuma empresa desta categoria tem localização no mapa."
        actionLabel="Limpar filtro"
        onAction={() => changeCategory('')}
      />
    ) : (
      <StateScreen
        testID="map.empty"
        icon="map-trifold"
        title="Ainda não há empresas no mapa"
        description="As empresas aparecem quando têm um código postal válido."
      />
    );
  } else {
    body = (
      <View style={s.map}>
        <Suspense fallback={<StateScreen testID="map.loading" loading />}>
          <CompanyMap
            testID="map.view"
            points={points}
            scheme={scheme}
            userPosition={me.position}
            focus={focus}
            onSelectCompany={selectCompany}
            onSelectGroup={selectGroup}
          />
        </Suspense>
        <GlassSurface style={s.locate} radius={radius.capsule} elevated>
          <IconButton
            testID="map.locate"
            icon="crosshair"
            label={me.state === 'shown' ? 'Esconder a minha posição' : 'Mostrar a minha posição'}
            onPress={toggleLocate}
            disabled={me.state === 'locating'}
          />
        </GlassSurface>
        {me.position ? (
          <View
            testID="map.me"
            accessible
            accessibilityLabel="A sua posição está no mapa"
            accessibilityLiveRegion="polite"
            pointerEvents="none"
            style={s.srOnly}
          />
        ) : null}
      </View>
    );
  }

  const locateAlert = missingCompany ? (
    <InlineAlert
      testID="map.company-missing"
      tone="error"
      message="Esta empresa não aparece no mapa (sem localização ou escondida)."
    />
  ) : me.state === 'denied' ? (
    <InlineAlert
      testID="map.locate.denied"
      tone="error"
      message="Sem acesso à localização. Pode ativá-lo nas definições do dispositivo."
    />
  ) : me.state === 'unavailable' ? (
    <InlineAlert
      testID="map.locate.unavailable"
      tone="error"
      message="Não foi possível obter a sua posição neste dispositivo."
    />
  ) : null;

  return (
    <View testID="map.screen" style={[s.screen, { paddingBottom: bottom }]}>
      <Horizon title="Mapa" meta={meta} />
      {categories.length ? (
        <View style={[s.toolbar, isWide ? s.toolbarWide : null]}>
          <CategoryChips
            categories={categories}
            value={categoryId}
            onChange={changeCategory}
            wide={isWide}
          />
        </View>
      ) : null}
      {locateAlert ? (
        <View style={[s.alert, isWide ? s.alertWide : null]}>{locateAlert}</View>
      ) : null}
      <View style={[s.body, isWide ? s.bodyWide : null]}>
        {body}
        {selected ? (
          <View style={isWide ? s.side : s.panel}>
            <CompanyCard company={selected} categoryOf={categoryOf} onOpen={open} onClose={close} />
          </View>
        ) : group.length ? (
          <View style={isWide ? s.side : s.panel}>
            <CompanyGroup companies={group} categoryOf={categoryOf} onOpen={open} onClose={close} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
