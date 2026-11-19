import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeColors } from '@/theme/colors';
import type { CompanyMapProps } from './CompanyMap.types';
import {
  COMPANIES_SOURCE,
  LAYER,
  ME_SOURCE,
  POINT_LAYERS,
  companyLayers,
  meLayer,
} from './companyLayers';
import { MapAttribution } from './MapAttribution';
import { ensureMapCss } from './mapCss.web';
import { CLUSTER_MAX_ZOOM, FOCUS_ZOOM, INITIAL_ZOOM, MAP_CENTER } from './mapBox';
import { buildMapStyle } from './mapStyle';
import {
  featureIds,
  positionFeature,
  sameCoordinates,
  toFeatureCollection,
} from './toFeatureCollection';

// Web (mapa-plano W3): maplibre-gl 5 + PMTiles. Este módulo só é carregado pelo ecrã do mapa
// (React.lazy), para não crescer o bundle inicial (regra 4). Sem SDKs nem pedidos a terceiros:
// estilo, tiles, glyphs e sprites vêm de TILES_URL (regra 3). Sem controlos de localização do
// MapLibre: a posição vem só do botão "A minha posição" (regra 1).

// O protocolo `pmtiles://` regista-se uma só vez por módulo.
let protocolAdded = false;
function ensurePmtilesProtocol() {
  if (protocolAdded) return;
  maplibregl.addProtocol('pmtiles', new Protocol().tile);
  protocolAdded = true;
}

const factory = createStyles(({ colors, spacing }) => ({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  canvas: { ...StyleSheet.absoluteFillObject },
  attribution: { position: 'absolute', left: spacing.sm, bottom: spacing.sm, right: spacing.sm },
  // Só para leitores de ecrã: o canvas do mapa não é legível (sem foco nem toque).
  srOnly: {
    position: 'absolute',
    width: spacing['2xs'],
    height: spacing['2xs'],
    overflow: 'hidden',
  },
}));

const MAX_LEAVES = 200;

/** Fontes e camadas próprias (voltam a entrar depois de cada `setStyle`, ex.: troca de tema). */
function installOverlays(
  map: maplibregl.Map,
  colors: ThemeColors,
  data: ReturnType<typeof toFeatureCollection>,
  me: ReturnType<typeof positionFeature>,
) {
  if (!map.getSource(COMPANIES_SOURCE)) {
    map.addSource(COMPANIES_SOURCE, {
      type: 'geojson',
      data,
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    });
  }
  if (!map.getSource(ME_SOURCE)) map.addSource(ME_SOURCE, { type: 'geojson', data: me });
  for (const layer of companyLayers(colors)) if (!map.getLayer(layer.id)) map.addLayer(layer);
  const mine = meLayer(colors);
  if (!map.getLayer(mine.id)) map.addLayer(mine);
}

export default function CompanyMap({
  points,
  scheme,
  userPosition,
  focus,
  onSelectCompany,
  onSelectGroup,
  insetBottom = 0,
  testID,
}: CompanyMapProps) {
  const s = useStyles(factory);
  const { colors } = useTheme();
  const containerRef = useRef<View>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Valores atuais para os handlers registados uma vez.
  const latest = useRef({ points, userPosition, colors, onSelectCompany, onSelectGroup });
  latest.current = { points, userPosition, colors, onSelectCompany, onSelectGroup };

  // Criação do mapa (uma vez).
  useEffect(() => {
    ensurePmtilesProtocol();
    ensureMapCss();
    const container = containerRef.current as unknown as HTMLElement | null;
    if (!container) return;
    const map = new maplibregl.Map({
      container,
      style: buildMapStyle(scheme),
      center: [MAP_CENTER.lng, MAP_CENTER.lat],
      zoom: INITIAL_ZOOM,
      attributionControl: false, // a nossa MapAttribution está sempre visível
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    const install = () => {
      const { colors: c, points: p, userPosition: u } = latest.current;
      installOverlays(map, c, toFeatureCollection(p), positionFeature(u));
    };
    map.on('style.load', install);

    map.on('click', LAYER.clusters, async (e) => {
      const feature = e.features?.[0];
      const clusterId = feature?.properties?.cluster_id as number | undefined;
      if (!feature || clusterId === undefined || feature.geometry.type !== 'Point') return;
      const source = map.getSource<GeoJSONSource>(COMPANIES_SOURCE);
      if (!source) return;
      const leaves = await source.getClusterLeaves(clusterId, MAX_LEAVES, 0);
      const zoom = map.getZoom();
      const expansion = await source.getClusterExpansionZoom(clusterId);
      // O ecrã pode ter saído entretanto (mapa removido).
      if (mapRef.current !== map) return;
      // Folhas no mesmo ponto (vários ENI no mesmo CP4) ou zoom máximo: lista, não zoom.
      if (sameCoordinates(leaves) || zoom >= CLUSTER_MAX_ZOOM || expansion <= zoom) {
        latest.current.onSelectGroup(featureIds(leaves));
        return;
      }
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: expansion });
    });

    const onPoint = (e: maplibregl.MapLayerMouseEvent) => {
      const hits = map.queryRenderedFeatures(e.point, {
        layers: POINT_LAYERS,
      }) as MapGeoJSONFeature[];
      const ids = featureIds(hits.length ? hits : (e.features ?? []));
      if (ids.length > 1) latest.current.onSelectGroup(ids);
      else if (ids.length === 1) latest.current.onSelectCompany(ids[0]);
    };
    for (const id of POINT_LAYERS) map.on('click', id, onPoint);
    for (const id of [LAYER.clusters, ...POINT_LAYERS]) {
      map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Só na montagem: o tema, os pontos e a posição atualizam-se nos efeitos abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tema: novo estilo (os tiles vêm da mesma fonte; `style.load` reinstala as camadas).
  const firstScheme = useRef(scheme);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || firstScheme.current === scheme) return;
    firstScheme.current = scheme;
    map.setStyle(buildMapStyle(scheme));
  }, [scheme]);

  // Pontos.
  useEffect(() => {
    mapRef.current
      ?.getSource<GeoJSONSource>(COMPANIES_SOURCE)
      ?.setData(toFeatureCollection(points));
  }, [points]);

  // A sua posição (só em memória; nunca vai em nenhum pedido).
  useEffect(() => {
    mapRef.current?.getSource<GeoJSONSource>(ME_SOURCE)?.setData(positionFeature(userPosition));
  }, [userPosition]);

  // Foco (ex.: ?company=). O maplibre-gl salta sem animação com prefers-reduced-motion.
  useEffect(() => {
    if (!focus) return;
    mapRef.current?.flyTo({ center: [focus.lng, focus.lat], zoom: FOCUS_ZOOM });
  }, [focus]);

  return (
    <View testID={testID} style={s.root}>
      <View ref={containerRef} style={s.canvas} />
      <View
        accessibilityRole="list"
        accessibilityLabel="Empresas no mapa"
        pointerEvents="none"
        style={s.srOnly}
      >
        {points.map((p) => (
          <View
            key={p.id}
            role="listitem"
            testID={`map.pin.${p.id}`}
            accessibilityLabel={p.precision === 'area' ? `${p.name}, zona aproximada` : p.name}
          />
        ))}
      </View>
      <MapAttribution style={[s.attribution, { bottom: s.attribution.bottom + insetBottom }]} />
    </View>
  );
}
