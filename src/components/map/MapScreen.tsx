import {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { companiesApi } from '@/api/companies.api';
import { categoryName } from '@/components/directory/categories';
import {
  Button,
  Chip,
  ErrorState,
  GlassSurface,
  Icon,
  IconButton,
  InlineAlert,
  ListRow,
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
import type { LatLng, MapPadding } from './CompanyMap.types';
import { MapAttribution, type AttributionState } from './MapAttribution';
import { MapLegend } from './MapLegend';
import { countsByTopCategory, filterByCategory } from './mapFilter';

// Regra 4: o componente do mapa (maplibre-gl no web) é outro chunk, pedido só por este ecrã.
const CompanyMap = lazy(() => import('@/components/map/CompanyMap'));

const factory = createStyles(({ colors, layout, radius, size, spacing }) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  map: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject, gap: spacing.sm },
  overlayWide: { padding: spacing.lg, gap: spacing.md },
  inset: { paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTop: { flex: 1, minHeight: spacing[0], flexDirection: 'row', gap: spacing.md },
  spacer: { flex: 1 },
  top: { gap: spacing.sm },
  bottom: { gap: spacing.sm, alignItems: 'stretch' },
  end: { alignItems: 'flex-end' },
  // Desktop: a atribuição fica no canto, fora da coluna do painel (não lhe tira altura).
  corner: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    left: layout.formMaxWidth,
    alignItems: 'flex-end',
  },
  // Título e contagem numa cápsula, não um horizonte de 200 (A1 #2).
  title: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    minHeight: size.hitTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rail: { gap: spacing.sm, paddingHorizontal: spacing.md },
  legend: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  sheet: { padding: spacing.lg },
  // Desktop: painel à esquerda com o título, as categorias, a legenda e, ao tocar num pino, a ficha.
  panel: {
    width: layout.formMaxWidth - spacing['4xl'],
    alignSelf: 'flex-start',
    maxHeight: '100%',
    padding: spacing.lg,
    gap: spacing.md,
  },
  panelHead: { gap: spacing['2xs'] },
  side: { alignItems: 'flex-end', gap: spacing.md, maxWidth: layout.formMaxWidth },
  list: { flexShrink: 1 },
  catRow: { paddingHorizontal: spacing.sm },
  catName: { flex: 1 },
  back: { paddingHorizontal: spacing[0], gap: spacing.xs },
  empty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.gutter,
  },
  emptyBox: {
    width: '100%',
    maxWidth: layout.formMaxWidth - spacing['4xl'],
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.group,
  },
  // Só para leitores de ecrã (o ponto "me" é desenhado no canvas).
  srOnly: {
    position: 'absolute',
    width: spacing['2xs'],
    height: spacing['2xs'],
    overflow: 'hidden',
  },
}));

type Selection = { kind: 'company'; id: string } | { kind: 'group'; ids: string[] } | null;

function countText(n: number) {
  return n === 1 ? '1 empresa' : `${n} empresas`;
}

/**
 * Mapa das empresas (direção B "Índice", docs/design/mapa-refino.md). O mapa ocupa o ecrã todo
 * (no nativo, de ponta a ponta) e o resto flutua por cima:
 * - desktop (web `md+`): painel à esquerda com título, contagem, as 13 categorias com contagem e a
 *   legenda; ao tocar num pino, a ficha substitui a lista no mesmo painel ("‹ Categorias");
 * - telemóvel (web `sm`) e nativo: cápsula do título, chips com contagem e botão de posição em cima;
 *   legenda, atribuição e ficha em baixo.
 * Com a ficha aberta, a legenda esconde-se e a atribuição da OSM recolhe para o "(i)".
 */
export default function MapScreen() {
  const s = useStyles(factory);
  const { scheme, spacing, size, layout, colors, radius } = useTheme();
  const { isWide } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ company?: string }>();
  const native = Platform.OS !== 'web';

  // Filtro no cliente (decisão 5): um só GET /companies/map dá o mapa e as contagens.
  const { points: all, loaded, error, reload } = useMapCompanies();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [selection, setSelection] = useState<Selection>(null);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [attribution, setAttribution] = useState<AttributionState>('open');
  const [mapReady, setMapReady] = useState(false);
  const onMapReady = useCallback(() => setMapReady(true), []);
  const [missingCompany, setMissingCompany] = useState(false);
  // Alturas medidas dos controlos de cima e de baixo (o enquadramento e o foco evitam-nas).
  const [box, setBox] = useState({ overlayH: 0, topEnd: 0, bottomStart: 0 });
  // Regras 1 e 2: a posição só é pedida no toque e fica só em memória (nunca vai na rede).
  const me = useUserPosition();

  useEffect(() => {
    categoriesApi
      .list()
      .then((data) => startTransition(() => setCategories(data)))
      .catch((e) => {
        // Sem categorias, os filtros não aparecem; o mapa continua utilizável.
        if (!(e instanceof ApiError)) throw e;
      });
  }, []);

  const points = useMemo(
    () => filterByCategory(all, categories, categoryId),
    [all, categories, categoryId],
  );
  const counts = useMemo(() => countsByTopCategory(all, categories), [all, categories]);
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  // `?company=<id>` (ex.: "Ver no mapa" no detalhe): limpa o filtro, foca e abre a ficha. Se a
  // empresa não estiver no mapa (escondida, sem localização), avisa. O parâmetro é consumido no
  // fim, para que um novo "Ver no mapa" da mesma empresa volte a focar.
  useEffect(() => {
    const id = params.company;
    if (!id || !loaded) return;
    const company = byId.get(id);
    setCategoryId('');
    if (company) {
      setMissingCompany(false);
      setSelection({ kind: 'company', id });
      setFocus({ lat: company.lat, lng: company.lng });
    } else {
      setSelection(null);
      setMissingCompany(true);
    }
    router.setParams({ company: undefined });
  }, [params.company, loaded, byId]);

  const selected = selection?.kind === 'company' ? (byId.get(selection.id) ?? null) : null;
  const group =
    selection?.kind === 'group'
      ? selection.ids.map((id) => byId.get(id)).filter((c): c is MapCompany => !!c)
      : [];
  const hasCard = !!selected || group.length > 0;

  // Localidade da ficha: vem do detalhe (GET /companies/{id}), pedido ao abrir. Só a localidade
  // fica guardada; a morada e as coordenadas não se mostram.
  const selectedId = selected?.id ?? null;
  const [locality, setLocality] = useState<{ id: string; value: string | null } | null>(null);
  useEffect(() => {
    if (!selectedId) return;
    let alive = true;
    companiesApi
      .get(selectedId)
      .then((c) => alive && setLocality({ id: selectedId, value: c.locality ?? null }))
      .catch(() => alive && setLocality({ id: selectedId, value: null }));
    return () => {
      alive = false;
    };
  }, [selectedId]);
  const cardLocality = locality?.id === selectedId ? locality.value : undefined;

  // Com a ficha aberta, a atribuição da OSM recolhe para o "(i)" (só ficha, GISCO curto e "(i)").
  useEffect(() => {
    if (hasCard) setAttribution('collapsed');
  }, [hasCard]);
  // A OSM volta a estar visível sempre que o ecrã fica à vista (e os 5 s contam a partir daí): as
  // NativeTabs montam o ecrã antes de a pessoa abrir a tab, e o tempo acabaria sem ela ver o mapa.
  const hasCardRef = useRef(hasCard);
  hasCardRef.current = hasCard;
  useFocusEffect(
    useCallback(() => {
      if (!hasCardRef.current) setAttribution('open');
    }, []),
  );

  const close = useCallback(() => setSelection(null), []);
  const collapse = useCallback(() => setAttribution((a) => (a === 'open' ? 'collapsed' : a)), []);

  // Web: Esc fecha a ficha e o painel "Fontes e licenças".
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelection(null);
      setAttribution((a) => (a === 'details' ? 'collapsed' : a));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Android: o "voltar" fecha primeiro a ficha (e o painel das fontes), só depois sai do ecrã.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' || (!hasCard && attribution !== 'details')) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setSelection(null);
        setAttribution((a) => (a === 'details' ? 'collapsed' : a));
        return true;
      });
      return () => sub.remove();
    }, [hasCard, attribution]),
  );

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

  // Como no Início e em "As minhas empresas" (ver `crossTabPushTarget` em navigation/tabs.ts).
  const open = useCallback((id: string) => router.push(`/companies/${id}`), []);
  const selectCompany = useCallback((id: string) => setSelection({ kind: 'company', id }), []);
  const selectGroup = useCallback((ids: string[]) => setSelection({ kind: 'group', ids }), []);

  // Nativo: o mapa passa por baixo da status bar e da tab bar; os controlos ficam nas safe areas.
  // As NativeTabs não expõem a altura da tab bar: constante por plataforma, medida nas capturas da
  // Fase B (hierarquia de cada uma, docs/design/mapa-refino.md §9.1):
  // - iOS 26 (iPhone 17 Pro): a tab bar de vidro começa 83 pt acima do fundo, e dentro das NativeTabs
  //   o `insets.bottom` já é 83 (indicador 34 + tab bar 49) → 0;
  // - Android 16 (Pixel 8): a barra começa 104 dp acima do fundo e o `insets.bottom` é só a barra de
  //   navegação (≈ 24) → 80.
  // (Antes, 96 nos dois: sobravam 108 pt no iOS e 27 dp no Android entre a ficha e a tab bar.)
  const tabBar = Platform.select({
    ios: spacing[0],
    android: spacing['5xl'] * 2,
    default: spacing[0],
  });
  const topInset = native ? insets.top : spacing[0];
  const bottomInset = native ? insets.bottom + tabBar : spacing[0];
  const edge = isWide ? spacing.lg : spacing.md;
  const panelWidth = layout.formMaxWidth - spacing['4xl'];

  const onOverlayLayout = useCallback((e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    setBox((b) => (b.overlayH === height ? b : { ...b, overlayH: height }));
  }, []);
  const onTopLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setBox((b) => (b.topEnd === y + height ? b : { ...b, topEnd: y + height }));
  }, []);
  const onBottomLayout = useCallback((e: LayoutChangeEvent) => {
    const { y } = e.nativeEvent.layout;
    setBox((b) => (b.bottomStart === y ? b : { ...b, bottomStart: y }));
  }, []);

  // Área livre do mapa. Antes da 1.ª medição, estimativa pelos tokens.
  const measuredBottom =
    box.overlayH && box.bottomStart ? box.overlayH - box.bottomStart : spacing[0];
  const padding: MapPadding = isWide
    ? {
        top: edge,
        left: edge * 2 + panelWidth,
        right: edge * 2 + size.hitTarget,
        bottom: (measuredBottom || size.hitTarget) + edge,
      }
    : {
        top: (box.topEnd || topInset + edge + size.hitTarget * 2 + spacing.sm) + spacing.sm,
        left: edge,
        right: edge,
        bottom: (measuredBottom || bottomInset + edge + size.hitTarget) + spacing.sm,
      };

  // O aviso "a sua posição está no mapa" (só para leitores de ecrã) fica dentro da área livre do
  // mapa, por baixo dos controlos de cima. No canto (0, 0) ficava por baixo da status bar do Android
  // e o UiAutomator/TalkBack não o encontravam.
  const mePosition = {
    top: isWide ? edge + size.hitTarget + spacing.sm : padding.top,
    left: padding.left,
  };

  const count = loaded ? (
    <Text testID="map.count" variant="meta" tabular>
      {countText(points.length)}
    </Text>
  ) : (
    <Skeleton width={spacing['6xl'] * 2} />
  );

  if (error) {
    return (
      <View testID="map.screen" style={[s.screen, s.empty]}>
        <ErrorState testID="map.error" message={error} onRetry={reload} />
      </View>
    );
  }
  if (!loaded) {
    return (
      <View testID="map.screen" style={s.screen}>
        <StateScreen testID="map.loading" loading title="A carregar o mapa" />
      </View>
    );
  }
  if (all.length === 0) {
    return (
      <View testID="map.screen" style={s.screen}>
        <StateScreen
          testID="map.empty"
          icon="map-trifold"
          title="Ainda não há empresas no mapa"
          description="As empresas aparecem quando têm um código postal válido."
        />
      </View>
    );
  }

  const options = [{ id: '', name: 'Todas', slug: 'all' }, ...categories];
  const countOf = (id: string) => (id ? (counts.get(id) ?? 0) : all.length);
  const toggle = (id: string) => changeCategory(categoryId === id && id ? '' : id);

  const locate = (
    <GlassSurface radius={radius.capsule} opaque elevated>
      <IconButton
        testID="map.locate"
        icon="crosshair"
        label={me.state === 'shown' ? 'Esconder a minha posição' : 'Mostrar a minha posição'}
        onPress={toggleLocate}
        disabled={me.state === 'locating'}
      />
    </GlassSurface>
  );

  const alert = missingCompany ? (
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

  const variant = 'bare' as const;
  const card = selected ? (
    <CompanyCard
      company={selected}
      locality={cardLocality}
      categoryOf={categoryOf}
      onOpen={open}
      onClose={close}
      variant={variant}
    />
  ) : group.length ? (
    <CompanyGroup
      companies={group}
      categoryOf={categoryOf}
      onOpen={open}
      onClose={close}
      variant={variant}
    />
  ) : null;

  const attributionView = (
    <MapAttribution state={attribution} onChange={setAttribution} paused={!mapReady} />
  );

  const emptyCategory =
    points.length === 0 ? (
      <View style={s.empty} pointerEvents="box-none">
        <GlassSurface opaque elevated style={s.emptyBox} testID="map.empty">
          <Text variant="name" accessibilityRole="header">
            Sem empresas no mapa nesta categoria
          </Text>
          <Text variant="meta">Nenhuma empresa desta categoria tem localização no mapa.</Text>
          <Button
            testID="map.empty.action"
            label="Limpar filtro"
            onPress={() => changeCategory('')}
          />
        </GlassSurface>
      </View>
    ) : null;

  let overlay;
  if (isWide) {
    const categoryList = (
      <ScrollView style={s.list} accessibilityRole="radiogroup" accessibilityLabel="Categorias">
        {options.map((c, i) => {
          const active = categoryId === c.id;
          const n = countOf(c.id);
          return (
            <ListRow
              key={c.id || 'all'}
              testID={`companies.category-chip-${c.slug}`}
              choice={{ checked: active }}
              accessibilityLabel={`${c.name}, ${countText(n)}`}
              onPress={() => toggle(c.id)}
              density="dense"
              inset="text"
              last={i === options.length - 1}
              style={s.catRow}
            >
              <Text variant="name" color={active ? 'accentText' : 'text'} style={s.catName}>
                {c.name}
              </Text>
              <Text variant="meta" tabular>
                {n}
              </Text>
              {active ? <Icon name="check" size={size.icon.sm} color={colors.accentText} /> : null}
            </ListRow>
          );
        })}
      </ScrollView>
    );
    overlay = (
      <View style={[s.overlay, s.overlayWide]} pointerEvents="box-none" onLayout={onOverlayLayout}>
        <View style={s.rowTop} pointerEvents="box-none">
          <GlassSurface opaque elevated radius={radius.group} style={s.panel} testID="map.panel">
            {card ? (
              <>
                <ListRow
                  testID="map.panel.back"
                  accessibilityLabel="Voltar às categorias"
                  onPress={close}
                  density="dense"
                  inset="text"
                  last
                  style={s.back}
                >
                  <Icon name="caret-left" size={size.icon.sm} color={colors.text2} />
                  <Text variant="meta" style={s.catName}>
                    Categorias
                  </Text>
                </ListRow>
                {card}
              </>
            ) : (
              <>
                <View style={s.panelHead}>
                  <Text variant="title" accessibilityRole="header">
                    Mapa
                  </Text>
                  {count}
                </View>
                {categories.length ? categoryList : null}
                <MapLegend />
              </>
            )}
          </GlassSurface>
          <View style={s.spacer} pointerEvents="none" />
          <View style={s.side} pointerEvents="box-none">
            {locate}
            {alert}
          </View>
        </View>
        <View style={s.corner} pointerEvents="box-none" onLayout={onBottomLayout}>
          {attributionView}
        </View>
      </View>
    );
  } else {
    overlay = (
      <View
        style={[s.overlay, { paddingTop: topInset + edge, paddingBottom: bottomInset + edge }]}
        pointerEvents="box-none"
        onLayout={onOverlayLayout}
      >
        <View style={s.top} pointerEvents="box-none" onLayout={onTopLayout}>
          <View style={[s.row, s.inset]} pointerEvents="box-none">
            <GlassSurface
              testID="map.title"
              opaque
              elevated
              radius={radius.capsule}
              style={s.title}
            >
              <Text variant="name" accessibilityRole="header">
                Mapa
              </Text>
              {count}
            </GlassSurface>
            <View style={s.spacer} pointerEvents="none" />
            {locate}
          </View>
          {categories.length ? (
            <ScrollView
              testID="map.chips"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.rail}
              accessibilityRole="radiogroup"
              accessibilityLabel="Categorias"
            >
              {options.map((c) => (
                <Chip
                  key={c.id || 'all'}
                  testID={`companies.category-chip-${c.slug}`}
                  label={`${c.name} · ${countOf(c.id)}`}
                  active={categoryId === c.id}
                  role="radio"
                  onPress={() => toggle(c.id)}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
        {alert ? <View style={s.inset}>{alert}</View> : null}
        <View style={s.spacer} pointerEvents="none" />
        <View style={[s.bottom, s.inset]} pointerEvents="box-none" onLayout={onBottomLayout}>
          {hasCard ? null : (
            <GlassSurface testID="map.legend-box" opaque elevated style={s.legend}>
              <MapLegend />
            </GlassSurface>
          )}
          <View style={s.end} pointerEvents="box-none">
            {attributionView}
          </View>
          {card ? (
            <GlassSurface testID="map.sheet" opaque elevated radius={radius.group} style={s.sheet}>
              {card}
            </GlassSurface>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View testID="map.screen" style={s.screen}>
      <View style={s.map}>
        <Suspense fallback={<StateScreen testID="map.loading" loading />}>
          <CompanyMap
            testID="map.view"
            points={points}
            framingPoints={all}
            scheme={scheme}
            userPosition={me.position}
            focus={focus}
            selectedId={selectedId}
            padding={padding}
            onSelectCompany={selectCompany}
            onSelectGroup={selectGroup}
            onInteract={collapse}
            onReady={onMapReady}
          />
        </Suspense>
      </View>
      {emptyCategory}
      {overlay}
      {me.position ? (
        <View
          testID="map.me"
          accessible
          accessibilityLabel="A sua posição está no mapa"
          accessibilityLiveRegion="polite"
          pointerEvents="none"
          style={[s.srOnly, mePosition]}
        />
      ) : null}
    </View>
  );
}
