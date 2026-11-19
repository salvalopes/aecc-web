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
import { Platform, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { categoriesApi } from '@/api/categories.api';
import { ApiError } from '@/api/client';
import { categoryName, topLevelOf } from '@/components/directory/categories';
import {
  Chip,
  ErrorState,
  GlassSurface,
  Icon,
  IconButton,
  InlineAlert,
  ListGroup,
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
import { CompanyCard, CompanyGroup } from '../CompanyCard';
import type { LatLng } from '../CompanyMap.types';
import type { Direction } from './layers';
import { GiscoAttribution, PrototypeAttribution } from './PrototypeAttribution';

// Protótipo do refinamento do mapa (docs/design/mapa-refino.md, Fase A). Só existe com
// EXPO_PUBLIC_MAP_PROTOTYPE=1 (o MapScreen nem o importa sem a variável) e escolhe-se com ?dir=a|b.
//  A "Lâmina": título/contagem e chips com contagem a flutuar no topo; card em baixo (telemóvel) ou
//    num painel à esquerda (desktop); enquadramento = limites das empresas na caixa.
//  B "Índice": um painel à esquerda (desktop) com as 13 categorias em lista e a ficha no mesmo
//    painel; no telemóvel, uma barra com a contagem e um botão "Categorias"; enquadramento sem os
//    3% mais afastados em cada ponta.
const PrototypeMap = lazy(() => import('./PrototypeMap'));

const factory = createStyles(({ colors, layout, radius, size, spacing }) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  map: { ...StyleSheet.absoluteFillObject },
  overlay: {
    position: 'absolute',
    top: spacing[0],
    right: spacing[0],
    bottom: spacing[0],
    left: spacing[0],
    padding: spacing.md,
    gap: spacing.sm,
  },
  overlayWide: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  grow: { flex: 1, minWidth: spacing[0] },
  spacer: { flex: 1 },
  bottom: { gap: spacing.sm },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  // Título e contagem: uma cápsula, não um horizonte de 200.
  title: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    minHeight: size.hitTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  // A: os chips correm de ponta a ponta no telemóvel (o último cortado diz "há mais").
  rail: { marginHorizontal: -spacing.md },
  railContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  railWide: { flex: 1, minWidth: spacing[0] },
  railWideContent: { gap: spacing.sm },
  side: { width: layout.formMaxWidth - spacing['4xl'] },
  card: { borderRadius: radius.group },
  // B: painel à esquerda (desktop) e folha de categorias (telemóvel).
  panel: {
    width: layout.formMaxWidth - spacing['4xl'],
    flexShrink: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  panelHead: { gap: spacing['2xs'] },
  sheet: { maxHeight: '62%', padding: spacing.md, gap: spacing.sm },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: size.hitTarget,
    paddingLeft: spacing.lg,
  },
  catRow: { minHeight: size.hitTarget, paddingVertical: spacing.xs },
  catName: { flex: 1 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: {
    width: spacing.md,
    height: spacing.md,
    borderRadius: radius.capsule,
    backgroundColor: colors.accent,
    borderWidth: spacing['2xs'],
    borderColor: colors.surface,
  },
  zone: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radius.capsule,
    borderWidth: spacing['2xs'],
    borderStyle: 'dashed',
  },
  srOnly: {
    position: 'absolute',
    width: spacing['2xs'],
    height: spacing['2xs'],
    overflow: 'hidden',
  },
}));

type Selection = { kind: 'company'; id: string } | { kind: 'group'; ids: string[] } | null;

const countText = (n: number) => (n === 1 ? '1 empresa' : `${n} empresas`);

/** Contagem por categoria de topo (as subcategorias contam na mãe), a partir dos pontos todos. */
function countsByTop(categories: readonly Category[], points: readonly MapCompany[]) {
  const counts = new Map<string, number>();
  for (const p of points) {
    if (!p.categoryId) continue;
    const top = topLevelOf(categories, p.categoryId);
    if (top) counts.set(top.id, (counts.get(top.id) ?? 0) + 1);
  }
  return counts;
}

export default function MapPrototype({ dir }: { dir: Direction }) {
  const s = useStyles(factory);
  const { scheme, spacing, size, colors, layout } = useTheme();
  const { isWide } = useBreakpoint();
  const params = useLocalSearchParams<{ company?: string }>();

  // Filtro no cliente: um só GET /map (1523 pontos) dá também a contagem de cada categoria.
  const { points: all, loaded, error, reload } = useMapCompanies({ categoryId: '' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [selection, setSelection] = useState<Selection>(null);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const me = useUserPosition();

  useEffect(() => {
    categoriesApi
      .list()
      .then((data) => startTransition(() => setCategories(data)))
      .catch((e) => {
        if (!(e instanceof ApiError)) throw e;
      });
  }, []);

  const points = useMemo(() => {
    if (!categoryId) return all;
    const top = topLevelOf(categories, categoryId);
    const ids = new Set([
      categoryId,
      ...(top?.id === categoryId ? top.children.map((c) => c.id) : []),
    ]);
    return all.filter((p) => p.categoryId && ids.has(p.categoryId));
  }, [all, categories, categoryId]);
  const counts = useMemo(() => countsByTop(categories, all), [categories, all]);
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  useEffect(() => {
    const id = params.company;
    if (!id || !loaded) return;
    const company = byId.get(id);
    if (company) {
      setCategoryId('');
      setSelection({ kind: 'company', id });
      setFocus({ lat: company.lat, lng: company.lng });
    }
    router.setParams({ company: undefined });
  }, [params.company, loaded, byId]);

  const close = useCallback(() => setSelection(null), []);
  // Web: Esc fecha a ficha (e a folha de categorias).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelection(null);
      setSheet(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const changeCategory = useCallback((id: string) => {
    setSelection(null);
    setSheet(false);
    setCategoryId(id);
  }, []);
  const selectCompany = useCallback((id: string) => setSelection({ kind: 'company', id }), []);
  const selectGroup = useCallback((ids: string[]) => setSelection({ kind: 'group', ids }), []);
  const collapse = useCallback(() => setCollapsed(true), []);
  const expand = useCallback(() => setCollapsed(false), []);
  const open = useCallback((id: string) => router.push(`/companies/${id}`), []);
  const categoryOf = useCallback(
    (c: MapCompany) => (c.categoryId ? categoryName(categories, c.categoryId) : null),
    [categories],
  );
  const toggleLocate = useCallback(() => {
    if (me.state === 'shown') me.clear();
    else me.request();
  }, [me]);

  const selected = selection?.kind === 'company' ? (byId.get(selection.id) ?? null) : null;
  const group =
    selection?.kind === 'group'
      ? selection.ids.map((id) => byId.get(id)).filter((c): c is MapCompany => !!c)
      : [];
  const hasCard = !!selected || group.length > 0;
  const activeName = categoryId ? categoryName(categories, categoryId) : null;
  const count = loaded ? (
    <Text testID="map.count" variant="meta" tabular>
      {activeName ? `${countText(points.length)} em ${activeName}` : countText(points.length)}
    </Text>
  ) : (
    <Skeleton width={spacing['6xl'] * 2} />
  );

  // Área tapada pelos controlos (enquadramento e foco evitam-na). Aproximação por tokens.
  const top = isWide ? size.hitTarget + spacing.lg * 2 : size.hitTarget * 2 + spacing.md * 3;
  const sideW = layout.formMaxWidth - spacing['4xl'] + spacing.lg * 2;
  const padding = {
    top: top + spacing.md,
    left: isWide && (dir === 'b' || hasCard) ? sideW : spacing.lg,
    right: spacing.lg,
    bottom: !isWide && hasCard ? size.control.md * 4 : size.control.md * 2,
  };

  const card = selected ? (
    <CompanyCard company={selected} categoryOf={categoryOf} onOpen={open} onClose={close} />
  ) : group.length ? (
    <CompanyGroup companies={group} categoryOf={categoryOf} onOpen={open} onClose={close} />
  ) : null;

  const locate = (
    <GlassSurface radius={size.hitTarget} opaque elevated>
      <IconButton
        testID="map.locate"
        icon="crosshair"
        label={me.state === 'shown' ? 'Esconder a minha posição' : 'Mostrar a minha posição'}
        onPress={toggleLocate}
        disabled={me.state === 'locating'}
      />
    </GlassSurface>
  );

  const legend = (
    <GlassSurface opaque elevated style={s.legend} testID="map.legend">
      <View style={s.legendItem}>
        <View style={s.dot} />
        <Text variant="meta" color="text">
          Localização exata
        </Text>
      </View>
      <View style={s.legendItem}>
        <View style={[s.zone, { borderColor: dir === 'a' ? colors.accent : colors.text2 }]} />
        <Text variant="meta" color="text">
          Zona aproximada
        </Text>
      </View>
    </GlassSurface>
  );

  const attribution = (
    <PrototypeAttribution collapsed={collapsed} onCollapse={collapse} onExpand={expand} />
  );

  const alert =
    me.state === 'denied' ? (
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

  if (error) {
    return (
      <View testID="map.screen" style={[s.screen, s.overlay]}>
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

  const chips = (
    <>
      <Chip
        testID="companies.category-chip-all"
        label={`Todas · ${all.length}`}
        active={!categoryId}
        onPress={() => changeCategory('')}
      />
      {categories.map((c) => (
        <Chip
          key={c.id}
          testID={`companies.category-chip-${c.slug}`}
          label={`${c.name} · ${counts.get(c.id) ?? 0}`}
          active={categoryId === c.id}
          onPress={() => changeCategory(categoryId === c.id ? '' : c.id)}
        />
      ))}
    </>
  );

  const categoryList = (
    <ListGroup>
      {[{ id: '', name: 'Todas', slug: 'all' }, ...categories].map((c, i, arr) => {
        const active = categoryId === c.id;
        return (
          <ListRow
            key={c.id || 'all'}
            testID={`companies.category-chip-${c.slug}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${c.name}, ${countText(c.id ? (counts.get(c.id) ?? 0) : all.length)}`}
            onPress={() => changeCategory(active && c.id ? '' : c.id)}
            density="compact"
            inset="text"
            last={i === arr.length - 1}
            style={s.catRow}
          >
            <Text variant="name" color={active ? 'accentText' : 'text'} style={s.catName}>
              {c.name}
            </Text>
            <Text variant="meta" tabular>
              {c.id ? (counts.get(c.id) ?? 0) : all.length}
            </Text>
            {active ? <Icon name="check" size={size.icon.sm} color={colors.accentText} /> : null}
          </ListRow>
        );
      })}
    </ListGroup>
  );

  const titlePill = (
    <GlassSurface opaque elevated style={s.title}>
      <Text variant="name" accessibilityRole="header">
        Mapa
      </Text>
      {count}
    </GlassSurface>
  );

  let overlay;
  if (dir === 'a') {
    overlay = (
      <View style={[s.overlay, isWide ? s.overlayWide : null]} pointerEvents="box-none">
        {isWide ? (
          <View style={s.rowTop} pointerEvents="box-none">
            {titlePill}
            <ChipRail wide>{chips}</ChipRail>
            {locate}
          </View>
        ) : (
          <>
            <View style={s.row} pointerEvents="box-none">
              {titlePill}
              <View style={s.spacer} pointerEvents="none" />
              {locate}
            </View>
            <ChipRail>{chips}</ChipRail>
          </>
        )}
        {alert}
        {isWide && card ? (
          <View style={s.side} testID="map.panel">
            <GlassSurface opaque elevated radius={s.card.borderRadius}>
              {card}
            </GlassSurface>
          </View>
        ) : null}
        <View style={s.spacer} pointerEvents="none" />
        <View style={s.bottom} pointerEvents="box-none">
          <View style={s.bottomRow} pointerEvents="box-none">
            {hasCard && !isWide ? <View style={s.spacer} /> : legend}
            <View style={s.spacer} pointerEvents="none" />
            {attribution}
          </View>
          <GiscoAttribution />
          {!isWide && card ? (
            <GlassSurface opaque elevated radius={s.card.borderRadius}>
              {card}
            </GlassSurface>
          ) : null}
        </View>
      </View>
    );
  } else if (isWide) {
    overlay = (
      <View style={[s.overlay, s.overlayWide]} pointerEvents="box-none">
        <View style={[s.rowTop, s.grow]} pointerEvents="box-none">
          <GlassSurface
            opaque
            elevated
            radius={s.card.borderRadius}
            style={s.panel}
            testID="map.panel"
          >
            {card ? (
              <>
                <ListRow
                  testID="map.panel.back"
                  accessibilityLabel="Voltar às categorias"
                  onPress={close}
                  inset="text"
                  density="compact"
                  last
                  style={s.catRow}
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
                <ScrollView>{categoryList}</ScrollView>
                {legend}
              </>
            )}
          </GlassSurface>
          <View style={s.spacer} pointerEvents="none" />
          {locate}
        </View>
        {alert}
        <View style={s.bottomRow} pointerEvents="box-none">
          <View style={s.spacer} pointerEvents="none" />
          {attribution}
        </View>
        <GiscoAttribution />
      </View>
    );
  } else {
    overlay = (
      <View style={s.overlay} pointerEvents="box-none">
        <View style={s.row} pointerEvents="box-none">
          <GlassSurface opaque elevated radius={size.hitTarget} style={[s.bar, s.grow]}>
            <View style={s.grow}>
              <Text variant="name" accessibilityRole="header" numberOfLines={1}>
                {activeName ?? 'Todas as categorias'}
              </Text>
              {count}
            </View>
            <IconButton
              testID="map.categories"
              icon="list"
              label={sheet ? 'Fechar as categorias' : 'Escolher a categoria'}
              onPress={() => {
                setSelection(null);
                setSheet((v) => !v);
              }}
            />
          </GlassSurface>
          {locate}
        </View>
        {alert}
        <View style={s.spacer} pointerEvents="none" />
        <View style={s.bottom} pointerEvents="box-none">
          <View style={s.bottomRow} pointerEvents="box-none">
            {hasCard || sheet ? <View style={s.spacer} /> : legend}
            <View style={s.spacer} pointerEvents="none" />
            {attribution}
          </View>
          <GiscoAttribution />
          {sheet ? (
            <GlassSurface
              opaque
              elevated
              radius={s.card.borderRadius}
              style={s.sheet}
              testID="map.sheet"
            >
              <View style={s.row}>
                <Text variant="name" accessibilityRole="header" style={s.grow}>
                  Categorias
                </Text>
                <IconButton icon="x" label="Fechar as categorias" onPress={() => setSheet(false)} />
              </View>
              <ScrollView>{categoryList}</ScrollView>
            </GlassSurface>
          ) : card ? (
            <GlassSurface opaque elevated radius={s.card.borderRadius}>
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
          <PrototypeMap
            testID="map.view"
            dir={dir}
            points={points}
            scheme={scheme}
            userPosition={me.position}
            focus={focus}
            selectedId={selected?.id ?? null}
            padding={padding}
            framingTrim={dir === 'a' ? 0 : 0.03}
            onSelectCompany={selectCompany}
            onSelectGroup={selectGroup}
            onInteract={collapse}
          />
        </Suspense>
      </View>
      {points.length === 0 ? (
        <View style={s.overlay} pointerEvents="box-none">
          <StateScreen
            testID="map.empty"
            icon="map-trifold"
            title="Sem empresas no mapa nesta categoria"
            actionLabel="Limpar filtro"
            onAction={() => changeCategory('')}
          />
        </View>
      ) : null}
      {overlay}
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

/**
 * A: fila de chips. No desktop, setas nas pontas quando há mais chips do que cabem (o problema 6
 * era a fila cortada sem aviso); no telemóvel, o último chip cortado à beira do ecrã já o diz.
 */
function ChipRail({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const s = useStyles(factory);
  const ref = useRef<ScrollView>(null);
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  const [x, setX] = useState(0);
  const step = box * 0.7;
  const canLeft = wide && x > 1;
  const canRight = wide && x + box < content - 1;
  const scroll = (dx: number) => ref.current?.scrollTo({ x: Math.max(0, x + dx), animated: true });
  return (
    <View style={wide ? [s.row, s.railWide] : s.rail} accessibilityLabel="Categorias">
      {canLeft ? (
        <GlassSurface opaque elevated radius={s.title.minHeight}>
          <IconButton
            icon="caret-left"
            label="Categorias anteriores"
            onPress={() => scroll(-step)}
          />
        </GlassSurface>
      ) : null}
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={wide ? s.grow : null}
        contentContainerStyle={wide ? s.railWideContent : s.railContent}
        onLayout={(e: LayoutChangeEvent) => setBox(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContent(w)}
        onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={32}
      >
        {children}
      </ScrollView>
      {canRight ? (
        <GlassSurface opaque elevated radius={s.title.minHeight}>
          <IconButton icon="caret-right" label="Mais categorias" onPress={() => scroll(step)} />
        </GlassSurface>
      ) : null}
    </View>
  );
}
