import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  type CameraRef,
  type GeoJSONSourceRef,
  type MapProps,
  type MapRef,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import { createStyles, useStyles } from '@/theme/createStyles';
import { useTheme } from '@/theme/ThemeContext';
import type { CompanyMapProps } from './CompanyMap.types';
import { COMPANIES_SOURCE, ME_SOURCE, companyLayers, meLayer } from './companyLayers';
import { MapAttribution } from './MapAttribution';
import { CLUSTER_MAX_ZOOM, FOCUS_ZOOM, INITIAL_ZOOM, MAP_CENTER } from './mapBox';
import { buildMapStyle } from './mapStyle';
import {
  featureIds,
  positionFeature,
  sameCoordinates,
  toFeatureCollection,
} from './toFeatureCollection';

// iOS/Android (mapa-plano W3): MapLibre RN 11 (New Architecture) com PMTiles nativo
// (`pmtiles://https://…`) e clusters na própria GeoJSONSource. Nada de `UserLocation`,
// `NativeUserLocation`, `useCurrentPosition` nem `trackUserLocation`: a posição vem só do
// expo-location, pelo botão "A minha posição" (regra 1), e é desenhada como uma fonte de 1 ponto.

const factory = createStyles(({ colors, spacing }) => ({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
  attribution: { position: 'absolute', left: spacing.sm, bottom: spacing.sm, right: spacing.sm },
}));

const MAX_LEAVES = 200;

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
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);

  // O mesmo JSON do web; os tipos do style-spec do MapLibre RN são de outra versão do pacote.
  const mapStyle = useMemo(
    () => buildMapStyle(scheme) as unknown as MapProps['mapStyle'],
    [scheme],
  );
  const layers = useMemo(() => companyLayers(colors), [colors]);
  const me = useMemo(() => meLayer(colors), [colors]);
  const data = useMemo(() => toFeatureCollection(points), [points]);
  const mine = useMemo(() => positionFeature(userPosition), [userPosition]);

  useEffect(() => {
    if (!focus) return;
    cameraRef.current?.flyTo({ center: [focus.lng, focus.lat], zoom: FOCUS_ZOOM });
  }, [focus]);

  async function handlePress(event: NativeSyntheticEvent<PressEventWithFeatures>) {
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
      cameraRef.current?.easeTo({ center: [lng, lat], zoom: expansion });
      return;
    }
    const ids = featureIds(features);
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
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: [MAP_CENTER.lng, MAP_CENTER.lat], zoom: INITIAL_ZOOM }}
        />
        <GeoJSONSource
          id={COMPANIES_SOURCE}
          ref={sourceRef}
          data={data}
          cluster
          clusterRadius={50}
          clusterMaxZoom={CLUSTER_MAX_ZOOM}
          onPress={handlePress}
        >
          {layers.map((layer) => (
            <Layer key={layer.id} {...layer} />
          ))}
        </GeoJSONSource>
        <GeoJSONSource id={ME_SOURCE} data={mine}>
          <Layer {...me} />
        </GeoJSONSource>
      </Map>
      <MapAttribution style={[s.attribution, { bottom: s.attribution.bottom + insetBottom }]} />
    </View>
  );
}
