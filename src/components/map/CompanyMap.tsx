import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map,
  type CameraRef,
  type GeoJSONSourceRef,
  type LngLatBounds,
  type MapProps,
  type MapRef,
  type PressEventWithFeatures,
  type ViewStateChangeEvent,
  TransformRequestManager,
} from '@maplibre/maplibre-react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import type { CompanyMapProps } from './CompanyMap.types';
import {
  CLUSTER_RADIUS,
  COMPANIES_SOURCE,
  LAYER,
  ME_SOURCE,
  SELECTED_SOURCE,
  companyLayers,
  meLayer,
  selectedLayers,
} from './companyLayers';
import { CLUSTER_MAX_ZOOM, FOCUS_ZOOM, framingBounds, type Bounds } from './mapBox';
import { TILES_URL, buildMapStyle } from './mapStyle';
import {
  featureIds,
  positionFeature,
  sameCoordinates,
  toFeatureCollection,
} from './toFeatureCollection';
import { ZONE_IMAGE } from './zoneRing';

// iOS/Android: MapLibre RN 11 (New Architecture) com PMTiles nativo (`pmtiles://https://…`) e
// clusters na própria GeoJSONSource; o único componente de mapa do nativo. Nada de `UserLocation`,
// `NativeUserLocation`, `useCurrentPosition` nem `trackUserLocation`: a posição vem só do
// expo-location, pelo botão "A minha posição" (regra 1), e é desenhada como uma fonte de 1 ponto.
// A atribuição é do `MapScreen` (a do SDK fica desligada).

// Regra 3 (nativo): o MLNMapView (iOS) e o MapView (Android) do SDK arrancam com o estilo por
// omissão (https://demotiles.maplibre.org/style.json) antes de receberem o nosso `mapStyle`, o que
// faria um pedido a um domínio de terceiros (visto no iOS 26.3). Todo o pedido a esse domínio é
// reescrito, antes de sair, para um estilo vazio no nosso servidor (/tiles/empty-style.json, T1).
// Regista-se no carregamento do módulo, antes de qualquer <Map>.
export const THIRD_PARTY_STYLE_HOST = /^https?:\/\/demotiles\.maplibre\.org\/.*$/;
TransformRequestManager.addUrlTransform({
  id: 'aecc-no-third-party-style',
  match: THIRD_PARTY_STYLE_HOST,
  find: THIRD_PARTY_STYLE_HOST,
  replace: `${TILES_URL}/empty-style.json`,
});

// Símbolo da zona (SDF branca, pintada com `text2` pela camada): gerado por
// scripts/map/build-zone-ring.mjs a partir de zoneRing.ts, a mesma função da web.
const IMAGES = {
  [ZONE_IMAGE]: { source: require('./assets/zone-ring.png'), sdf: true },
};

const factory = createStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
}));

const MAX_LEAVES = 200;
/** Tentativas de afastar um cluster que ainda tapa a empresa focada (`?company=`). */
const FOCUS_STEPS = 3;

const flat = ([[w, s], [e, n]]: Bounds): LngLatBounds => [w, s, e, n];

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
  onReady,
  testID,
}: CompanyMapProps) {
  const s = useStyles(factory);
  const { colors } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);
  const paddingRef = useRef(padding);
  paddingRef.current = padding;

  // O mesmo JSON do web; os tipos do style-spec do MapLibre RN são de outra versão do pacote.
  const mapStyle = useMemo(
    () => buildMapStyle(scheme) as unknown as MapProps['mapStyle'],
    [scheme],
  );
  const layers = useMemo(() => companyLayers(colors), [colors]);
  const selectedStyle = useMemo(() => selectedLayers(colors), [colors]);
  const selectedData = useMemo(() => {
    const p = selectedId ? points.find((c) => c.id === selectedId) : undefined;
    return toFeatureCollection(p ? [p] : []);
  }, [points, selectedId]);
  const me = useMemo(() => meLayer(colors), [colors]);
  const data = useMemo(() => toFeatureCollection(points), [points]);
  const mine = useMemo(() => positionFeature(userPosition), [userPosition]);
  // Enquadramento inicial pelos dados (decisão 3), calculado uma vez: o filtro não move a câmara.
  const [initialView] = useMemo(
    () => [{ bounds: flat(framingBounds(framingPoints)), padding }],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Foco (?company=): o pino fica no centro da área livre. Se, a z14, a empresa ainda estiver
  // dentro de um cluster, aproxima até ao zoom de expansão dele (até 3 vezes), para que o anel da
  // seleção se veja. O passo seguinte corre no `onRegionDidChange` (fim do movimento).
  const pendingFocus = useRef<{ steps: number } | null>(null);
  useEffect(() => {
    if (!focus) return;
    pendingFocus.current = { steps: 0 };
    cameraRef.current?.flyTo({
      center: [focus.lng, focus.lat],
      zoom: FOCUS_ZOOM,
      padding: paddingRef.current,
    });
  }, [focus]);

  async function settleFocus() {
    const pending = pendingFocus.current;
    const map = mapRef.current;
    const source = sourceRef.current;
    if (!pending || !focus || !map || !source || pending.steps++ >= FOCUS_STEPS) {
      pendingFocus.current = null;
      return;
    }
    // O cluster é desenhado no centróide das folhas, até `CLUSTER_RADIUS` px longe da empresa:
    // procura-se à volta e fica o que a contém.
    const [x, y] = await map.project([focus.lng, focus.lat]);
    const r = CLUSTER_RADIUS;
    const clusters = await map.queryRenderedFeatures(
      [
        [x - r, y - r],
        [x + r, y + r],
      ],
      { layers: [LAYER.clusters] },
    );
    for (const cluster of clusters) {
      const clusterId = cluster.properties?.cluster_id as number;
      const count = cluster.properties?.point_count as number;
      const leaves = await source.getClusterLeaves(clusterId, count, 0);
      if (!selectedId || !featureIds(leaves).includes(selectedId)) continue;
      const [expansion, zoom] = await Promise.all([
        source.getClusterExpansionZoom(clusterId),
        map.getZoom(),
      ]);
      // Vários no mesmo ponto (o cluster não se desfaz) ou já no zoom de expansão: fica.
      if (sameCoordinates(leaves) || expansion <= zoom) break;
      cameraRef.current?.easeTo({
        center: [focus.lng, focus.lat],
        zoom: expansion,
        padding: paddingRef.current,
      });
      return;
    }
    pendingFocus.current = null;
  }

  function handleRegionWillChange(event: NativeSyntheticEvent<ViewStateChangeEvent>) {
    // Regra da OSMF: só um gesto da pessoa recolhe a atribuição (não o fitBounds/flyTo).
    if (event.nativeEvent.userInteraction) {
      pendingFocus.current = null;
      onInteract();
    }
  }

  async function handlePress(event: NativeSyntheticEvent<PressEventWithFeatures>) {
    onInteract();
    const features = event.nativeEvent.features ?? [];
    const cluster = features.find((f) => f.properties?.cluster);
    if (cluster && cluster.geometry.type === 'Point') {
      const clusterId = cluster.properties?.cluster_id as number;
      const source = sourceRef.current;
      if (!source) return;
      const [leaves, zoom, expansion] = await Promise.all([
        source.getClusterLeaves(clusterId, MAX_LEAVES, 0),
        mapRef.current?.getZoom() ?? Promise.resolve(CLUSTER_MAX_ZOOM),
        source.getClusterExpansionZoom(clusterId),
      ]);
      // Folhas no mesmo ponto (vários ENI no mesmo CP4) ou zoom máximo: lista, não zoom.
      if (sameCoordinates(leaves) || zoom >= CLUSTER_MAX_ZOOM || expansion <= zoom) {
        onSelectGroup(featureIds(leaves));
        return;
      }
      const [lng, lat] = cluster.geometry.coordinates;
      cameraRef.current?.easeTo({
        center: [lng, lat],
        zoom: expansion,
        padding: paddingRef.current,
      });
      return;
    }
    // O `hitbox` por omissão já é 44×44. Vários exatamente no mesmo sítio = grupo.
    const points = features.filter((f) => f.geometry.type === 'Point' && !f.properties?.cluster);
    if (!points.length) return;
    const [lng, lat] = (points[0].geometry as GeoJSON.Point).coordinates;
    const same = points.filter((f) => {
      const [x, y] = (f.geometry as GeoJSON.Point).coordinates;
      return Math.abs(x - lng) < 1e-9 && Math.abs(y - lat) < 1e-9;
    });
    const ids = [...new Set(featureIds(same))];
    if (ids.length > 1) onSelectGroup(ids);
    else if (ids.length === 1) onSelectCompany(ids[0]);
  }

  return (
    <View testID={testID} style={s.root}>
      <Map
        ref={mapRef}
        style={s.map}
        mapStyle={mapStyle}
        attribution={false}
        logo={false}
        compass={false}
        touchRotate={false}
        touchPitch={false}
        onRegionWillChange={handleRegionWillChange}
        onRegionDidChange={settleFocus}
        onDidFinishLoadingMap={onReady}
      >
        <Camera ref={cameraRef} initialViewState={initialView} />
        <Images images={IMAGES} />
        <GeoJSONSource
          id={COMPANIES_SOURCE}
          ref={sourceRef}
          data={data}
          cluster
          clusterRadius={CLUSTER_RADIUS}
          clusterMaxZoom={CLUSTER_MAX_ZOOM}
          onPress={handlePress}
        >
          {layers.map((layer) => (
            <Layer key={layer.id} {...layer} />
          ))}
        </GeoJSONSource>
        {/* O pino da ficha aberta, sem clusters e por cima deles (vê-se mesmo agregado). */}
        <GeoJSONSource id={SELECTED_SOURCE} data={selectedData}>
          {selectedStyle.map((layer) => (
            <Layer key={layer.id} {...layer} />
          ))}
        </GeoJSONSource>
        <GeoJSONSource id={ME_SOURCE} data={mine}>
          <Layer {...me} />
        </GeoJSONSource>
      </Map>
    </View>
  );
}
