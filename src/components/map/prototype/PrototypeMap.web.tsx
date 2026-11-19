import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeColors } from '@/theme/colors';
import type { CompanyMapProps } from '../CompanyMap.types';
import { COMPANIES_SOURCE, ME_SOURCE, meLayer } from '../companyLayers';
import { ensureMapCss } from '../mapCss.web';
import { CLUSTER_MAX_ZOOM, FOCUS_ZOOM } from '../mapBox';
import { buildMapStyle } from '../mapStyle';
import {
  featureIds,
  positionFeature,
  sameCoordinates,
  toFeatureCollection,
} from '../toFeatureCollection';
import { framingBounds } from './framing';
import {
  CLUSTER_RADIUS,
  PROTO_LAYER,
  PROTO_POINT_LAYERS,
  ZONES_SOURCE,
  prototypeLayers,
  selectedFilter,
  zoneFeatures,
  type Direction,
} from './layers';

// Protótipo do refinamento (Fase A, só web, atrás de EXPO_PUBLIC_MAP_PROTOTYPE). Cópia do
// CompanyMap.web com as diferenças das direções; o CompanyMap de produção não muda.

let protocolAdded = false;
function ensurePmtilesProtocol() {
  if (protocolAdded) return;
  maplibregl.addProtocol('pmtiles', new Protocol().tile);
  protocolAdded = true;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PrototypeMapProps extends Omit<CompanyMapProps, 'insetBottom'> {
  dir: Direction;
  selectedId: string | null;
  /** Área do mapa tapada pelos controlos flutuantes: o enquadramento e o foco evitam-na. */
  padding: Padding;
  /** Fração cortada em cada ponta no enquadramento inicial (0 = limites das empresas na caixa). */
  framingTrim: number;
  /** Primeira interação da pessoa com o mapa (mover, zoom, toque): recolhe a atribuição. */
  onInteract: () => void;
}

const factory = createStyles(({ colors, spacing }) => ({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  canvas: { ...StyleSheet.absoluteFillObject },
  srOnly: {
    position: 'absolute',
    width: spacing['2xs'],
    height: spacing['2xs'],
    overflow: 'hidden',
  },
}));

const MAX_LEAVES = 200;

function install(
  map: maplibregl.Map,
  colors: ThemeColors,
  dir: Direction,
  points: CompanyMapProps['points'],
  me: CompanyMapProps['userPosition'],
  selectedId: string | null,
) {
  if (!map.getSource(ZONES_SOURCE)) {
    map.addSource(ZONES_SOURCE, { type: 'geojson', data: zoneFeatures(points) });
  }
  if (!map.getSource(COMPANIES_SOURCE)) {
    map.addSource(COMPANIES_SOURCE, {
      type: 'geojson',
      data: toFeatureCollection(points),
      cluster: true,
      clusterRadius: CLUSTER_RADIUS[dir],
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    });
  }
  if (!map.getSource(ME_SOURCE)) {
    map.addSource(ME_SOURCE, { type: 'geojson', data: positionFeature(me) });
  }
  for (const layer of prototypeLayers(colors, dir))
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  const mine = meLayer(colors);
  if (!map.getLayer(mine.id)) map.addLayer(mine);
  map.setFilter(PROTO_LAYER.selected, selectedFilter(selectedId));
}

export default function PrototypeMap({
  points,
  scheme,
  userPosition,
  focus,
  onSelectCompany,
  onSelectGroup,
  dir,
  selectedId,
  padding,
  framingTrim,
  onInteract,
  testID,
}: PrototypeMapProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const containerRef = useRef<View>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const latest = useRef({
    points,
    userPosition,
    colors,
    selectedId,
    onSelectCompany,
    onSelectGroup,
    onInteract,
    padding,
  });
  latest.current = {
    points,
    userPosition,
    colors,
    selectedId,
    onSelectCompany,
    onSelectGroup,
    onInteract,
    padding,
  };

  useEffect(() => {
    ensurePmtilesProtocol();
    ensureMapCss();
    const container = containerRef.current as unknown as HTMLElement | null;
    if (!container) return;
    const map = new maplibregl.Map({
      container,
      style: buildMapStyle(scheme),
      bounds: framingBounds(points, framingTrim),
      fitBoundsOptions: { padding },
      attributionControl: false, // a atribuição do protótipo é desenhada pelo ecrã (canto + "(i)")
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    map.on('style.load', () => {
      const l = latest.current;
      install(map, l.colors, dir, l.points, l.userPosition, l.selectedId);
    });

    // Regra da OSMF: a atribuição só recolhe numa ação da pessoa (o `originalEvent` distingue o
    // gesto do fitBounds/flyTo programático).
    const interacted = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) latest.current.onInteract();
    };
    map.on('dragstart', interacted);
    map.on('zoomstart', interacted);
    map.on('click', () => latest.current.onInteract());

    // Alvo de toque de 44 px à volta do ponto (os pinos desenhados são mais pequenos).
    const half = size.hitTarget / 2;
    map.on('click', async (e) => {
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - half, e.point.y - half],
        [e.point.x + half, e.point.y + half],
      ];
      const clusters = map.queryRenderedFeatures(e.point, { layers: [PROTO_LAYER.clusters] });
      const cluster = clusters[0];
      if (cluster && cluster.geometry.type === 'Point') {
        const clusterId = cluster.properties?.cluster_id as number;
        const source = map.getSource<GeoJSONSource>(COMPANIES_SOURCE);
        if (!source) return;
        const leaves = await source.getClusterLeaves(clusterId, MAX_LEAVES, 0);
        const zoom = map.getZoom();
        const expansion = await source.getClusterExpansionZoom(clusterId);
        if (mapRef.current !== map) return;
        if (sameCoordinates(leaves) || zoom >= CLUSTER_MAX_ZOOM || expansion <= zoom) {
          latest.current.onSelectGroup(featureIds(leaves));
          return;
        }
        map.easeTo({
          center: cluster.geometry.coordinates as [number, number],
          zoom: expansion,
          padding: latest.current.padding,
        });
        return;
      }
      const hits = map.queryRenderedFeatures(box, {
        layers: PROTO_POINT_LAYERS,
      }) as MapGeoJSONFeature[];
      if (!hits.length) return;
      // O mais próximo do toque primeiro; vários no mesmo sítio = grupo.
      const target = map.project(
        (hits[0].geometry as GeoJSON.Point).coordinates as [number, number],
      );
      const same = hits.filter((h) => {
        const p = map.project((h.geometry as GeoJSON.Point).coordinates as [number, number]);
        return Math.abs(p.x - target.x) < 1 && Math.abs(p.y - target.y) < 1;
      });
      const ids = [...new Set(featureIds(same))];
      if (ids.length > 1) latest.current.onSelectGroup(ids);
      else if (ids.length === 1) latest.current.onSelectCompany(ids[0]);
    });
    map.on('mousemove', (e) => {
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - half, e.point.y - half],
        [e.point.x + half, e.point.y + half],
      ];
      const any = map.queryRenderedFeatures(box, {
        layers: [PROTO_LAYER.clusters, ...PROTO_POINT_LAYERS],
      }).length;
      map.getCanvas().style.cursor = any ? 'pointer' : '';
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Só na montagem (a direção muda o URL e remonta o ecrã).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstScheme = useRef(scheme);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || firstScheme.current === scheme) return;
    firstScheme.current = scheme;
    map.setStyle(buildMapStyle(scheme));
  }, [scheme]);

  useEffect(() => {
    const map = mapRef.current;
    map?.getSource<GeoJSONSource>(COMPANIES_SOURCE)?.setData(toFeatureCollection(points));
    map?.getSource<GeoJSONSource>(ZONES_SOURCE)?.setData(zoneFeatures(points));
  }, [points]);

  useEffect(() => {
    mapRef.current?.getSource<GeoJSONSource>(ME_SOURCE)?.setData(positionFeature(userPosition));
  }, [userPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer(PROTO_LAYER.selected))
      map.setFilter(PROTO_LAYER.selected, selectedFilter(selectedId));
  }, [selectedId]);

  // Foco (?company=): o pino fica no centro da área livre, não por baixo do card.
  useEffect(() => {
    if (!focus) return;
    mapRef.current?.flyTo({
      center: [focus.lng, focus.lat],
      zoom: FOCUS_ZOOM,
      padding: latest.current.padding,
    });
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
    </View>
  );
}
