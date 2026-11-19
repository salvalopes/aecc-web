import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeColors } from '@/theme/colors';
import type { CompanyMapProps } from './CompanyMap.types';
import {
  CLUSTER_RADIUS,
  COMPANIES_SOURCE,
  LAYER,
  ME_SOURCE,
  POINT_LAYERS,
  SELECTED_SOURCE,
  companyLayers,
  meLayer,
  selectedLayers,
} from './companyLayers';
import { ensureMapCss } from './mapCss.web';
import { CLUSTER_MAX_ZOOM, FOCUS_ZOOM, framingBounds } from './mapBox';
import { buildMapStyle } from './mapStyle';
import {
  featureIds,
  positionFeature,
  sameCoordinates,
  toFeatureCollection,
} from './toFeatureCollection';
import { ZONE_IMAGE, ZONE_RING, zoneRingPixels } from './zoneRing';

// Web: maplibre-gl 5 + PMTiles, o único componente de mapa da web. Este módulo só é carregado pelo
// ecrã do mapa (React.lazy), para não crescer o bundle inicial (regra 4). Sem SDKs nem pedidos a
// terceiros: estilo, tiles, glyphs e sprites vêm de TILES_URL. Sem controlos de localização do
// MapLibre: a posição vem só do botão "A minha posição" (regra 1). A atribuição é do `MapScreen`.

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
  // Só para leitores de ecrã: o canvas do mapa não é legível (sem foco nem toque).
  srOnly: {
    position: 'absolute',
    width: spacing['2xs'],
    height: spacing['2xs'],
    overflow: 'hidden',
  },
}));

const MAX_LEAVES = 200;
/** Tentativas de afastar um cluster que ainda tapa a empresa focada (`?company=`). */
const FOCUS_STEPS = 3;

/** Fontes, imagem e camadas próprias (voltam a entrar depois de cada `setStyle`, ex.: tema). */
function installOverlays(
  map: maplibregl.Map,
  colors: ThemeColors,
  points: CompanyMapProps['points'],
  me: CompanyMapProps['userPosition'],
  selected: CompanyMapProps['points'],
) {
  if (!map.hasImage(ZONE_IMAGE)) {
    map.addImage(ZONE_IMAGE, zoneRingPixels(), { sdf: true, pixelRatio: ZONE_RING.pixelRatio });
  }
  if (!map.getSource(COMPANIES_SOURCE)) {
    map.addSource(COMPANIES_SOURCE, {
      type: 'geojson',
      data: toFeatureCollection(points),
      cluster: true,
      clusterRadius: CLUSTER_RADIUS,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    });
  }
  if (!map.getSource(SELECTED_SOURCE)) {
    map.addSource(SELECTED_SOURCE, { type: 'geojson', data: toFeatureCollection(selected) });
  }
  if (!map.getSource(ME_SOURCE)) {
    map.addSource(ME_SOURCE, { type: 'geojson', data: positionFeature(me) });
  }
  for (const layer of [...companyLayers(colors), ...selectedLayers(colors), meLayer(colors)]) {
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  }
}

export default function CompanyMap({
  points,
  framingPoints,
  scheme,
  userPosition,
  focus,
  selectedId,
  padding,
  onSelectCompany,
  onSelectGroup,
  onInteract,
  testID,
}: CompanyMapProps) {
  const s = useStyles(factory);
  const { colors, size } = useTheme();
  const containerRef = useRef<View>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Valores atuais para os handlers registados uma vez.
  const latest = useRef({
    points,
    userPosition,
    colors,
    selectedId,
    padding,
    onSelectCompany,
    onSelectGroup,
    onInteract,
  });
  latest.current = {
    points,
    userPosition,
    colors,
    selectedId,
    padding,
    onSelectCompany,
    onSelectGroup,
    onInteract,
  };

  // Criação do mapa (uma vez), enquadrado pelos dados (decisão 3: corte de 3 % dentro da caixa).
  useEffect(() => {
    ensurePmtilesProtocol();
    ensureMapCss();
    const container = containerRef.current as unknown as HTMLElement | null;
    if (!container) return;
    const map = new maplibregl.Map({
      container,
      style: buildMapStyle(scheme),
      bounds: framingBounds(framingPoints),
      fitBoundsOptions: { padding: latest.current.padding },
      attributionControl: false, // a atribuição é do MapScreen (canto + "(i)")
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.getCanvas().setAttribute('aria-label', 'Mapa das empresas');
    mapRef.current = map;

    map.on('style.load', () => {
      const l = latest.current;
      installOverlays(
        map,
        l.colors,
        l.points,
        l.userPosition,
        selectedPoints(l.points, l.selectedId),
      );
    });

    // Regra da OSMF: a atribuição só recolhe numa ação da pessoa (o `originalEvent` distingue o
    // gesto do fitBounds/flyTo programático).
    const interacted = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) latest.current.onInteract();
    };
    map.on('dragstart', interacted);
    map.on('zoomstart', interacted);

    // Alvo de toque de 44 px à volta do ponto (os pinos desenhados são mais pequenos; A1 #11).
    const half = size.hitTarget / 2;
    const around = (p: maplibregl.Point): [maplibregl.PointLike, maplibregl.PointLike] => [
      [p.x - half, p.y - half],
      [p.x + half, p.y + half],
    ];

    map.on('click', async (e) => {
      latest.current.onInteract();
      const cluster = map.queryRenderedFeatures(e.point, { layers: [LAYER.clusters] })[0];
      if (cluster && cluster.geometry.type === 'Point') {
        const clusterId = cluster.properties?.cluster_id as number;
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
        map.easeTo({
          center: cluster.geometry.coordinates as [number, number],
          zoom: expansion,
          padding: latest.current.padding,
        });
        return;
      }
      const hits = map.queryRenderedFeatures(around(e.point), {
        layers: POINT_LAYERS,
      }) as MapGeoJSONFeature[];
      if (!hits.length) return;
      // O mais próximo do toque; vários exatamente no mesmo sítio = grupo.
      const at = (h: MapGeoJSONFeature) =>
        map.project((h.geometry as GeoJSON.Point).coordinates as [number, number]);
      const dist = (h: MapGeoJSONFeature) => at(h).dist(e.point);
      const nearest = hits.reduce((a, b) => (dist(b) < dist(a) ? b : a));
      const target = at(nearest);
      const same = hits.filter((h) => at(h).dist(target) < 1);
      const ids = [...new Set(featureIds(same))];
      if (ids.length > 1) latest.current.onSelectGroup(ids);
      else if (ids.length === 1) latest.current.onSelectCompany(ids[0]);
    });
    map.on('mousemove', (e) => {
      const any = map.queryRenderedFeatures(around(e.point), {
        layers: [LAYER.clusters, ...POINT_LAYERS],
      }).length;
      map.getCanvas().style.cursor = any ? 'pointer' : '';
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Só na montagem: o tema, os pontos, a seleção e a posição atualizam-se nos efeitos abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tema: novo estilo (os tiles vêm da mesma fonte; `style.load` reinstala imagem e camadas).
  const firstScheme = useRef(scheme);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || firstScheme.current === scheme) return;
    firstScheme.current = scheme;
    map.setStyle(buildMapStyle(scheme));
  }, [scheme]);

  // Pontos (filtro no cliente).
  useEffect(() => {
    mapRef.current
      ?.getSource<GeoJSONSource>(COMPANIES_SOURCE)
      ?.setData(toFeatureCollection(points));
  }, [points]);

  // A sua posição (só em memória; nunca vai em nenhum pedido).
  useEffect(() => {
    mapRef.current?.getSource<GeoJSONSource>(ME_SOURCE)?.setData(positionFeature(userPosition));
  }, [userPosition]);

  // Pino selecionado (fonte própria, por cima dos clusters).
  useEffect(() => {
    mapRef.current
      ?.getSource<GeoJSONSource>(SELECTED_SOURCE)
      ?.setData(toFeatureCollection(selectedPoints(points, selectedId)));
  }, [points, selectedId]);

  // Foco (?company=): o pino fica no centro da área livre, não por baixo da ficha. Se, a z14, a
  // empresa ainda estiver dentro de um cluster, aproxima até ao zoom de expansão dele (até 3 vezes),
  // para que o anel da seleção se veja. O maplibre-gl salta sem animação com prefers-reduced-motion.
  useEffect(() => {
    const map = mapRef.current;
    if (!focus || !map) return;
    let steps = 0;
    const center: [number, number] = [focus.lng, focus.lat];
    const settle = async () => {
      if (mapRef.current !== map || steps++ >= FOCUS_STEPS) return;
      const id = latest.current.selectedId;
      const source = map.getSource<GeoJSONSource>(COMPANIES_SOURCE);
      if (!id || !source) return;
      // O cluster é desenhado no centróide das folhas, até `CLUSTER_RADIUS` px longe da empresa:
      // procura-se à volta e fica o que a contém.
      const p = map.project(center);
      const r = CLUSTER_RADIUS;
      const clusters = map.queryRenderedFeatures(
        [
          [p.x - r, p.y - r],
          [p.x + r, p.y + r],
        ],
        { layers: [LAYER.clusters] },
      );
      for (const cluster of clusters) {
        const clusterId = cluster.properties?.cluster_id as number;
        const count = cluster.properties?.point_count as number;
        const leaves = await source.getClusterLeaves(clusterId, count, 0);
        if (mapRef.current !== map) return;
        if (!featureIds(leaves).includes(id)) continue;
        if (sameCoordinates(leaves)) return; // vários ENI no mesmo CP4: o cluster não se desfaz
        const expansion = await source.getClusterExpansionZoom(clusterId);
        if (mapRef.current !== map) return;
        if (expansion <= map.getZoom()) return;
        map.once('idle', settle);
        map.easeTo({ center, zoom: expansion, padding: latest.current.padding });
        return;
      }
    };
    // `idle`, não `moveend`: só depois de desenhar é que os clusters do novo zoom existem.
    const start = () => {
      map.once('idle', settle);
      map.flyTo({ center, zoom: FOCUS_ZOOM, padding: latest.current.padding });
    };
    // Na 1.ª abertura (?company=) o estilo pode ainda não ter carregado.
    if (map.isStyleLoaded()) start();
    else map.once('load', start);
    return () => {
      map.off('idle', settle);
      map.off('load', start);
    };
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

/** 0 ou 1 ponto: o da ficha aberta. */
function selectedPoints(
  points: CompanyMapProps['points'],
  id: string | null,
): CompanyMapProps['points'] {
  const p = id ? points.find((c) => c.id === id) : undefined;
  return p ? [p] : [];
}
