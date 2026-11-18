import type { MapCompany, MapPrecision } from '@/types/api';
import type { LatLng } from './CompanyMap.types';

export interface CompanyFeatureProps {
  id: string;
  precision: MapPrecision;
}

/** Pontos do GET /companies/map → GeoJSON para a fonte com clusters (só id e precisão). */
export function toFeatureCollection(
  points: readonly MapCompany[],
): GeoJSON.FeatureCollection<GeoJSON.Point, CompanyFeatureProps> {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { id: p.id, precision: p.precision },
    })),
  };
}

/** Ponto "a sua posição" (fonte própria, só em memória). */
export function positionFeature(position: LatLng | null): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: position
      ? [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [position.lng, position.lat] },
            properties: {},
          },
        ]
      : [],
  };
}

/** Folhas de um cluster todas no mesmo ponto (ex.: vários ENI no mesmo centróide CP4). */
export function sameCoordinates(features: readonly GeoJSON.Feature[]): boolean {
  const coords = features
    .map((f) => (f.geometry.type === 'Point' ? f.geometry.coordinates : null))
    .filter((c): c is GeoJSON.Position => !!c);
  if (coords.length < 2) return false;
  const [lng, lat] = coords[0];
  return coords.every((c) => Math.abs(c[0] - lng) < 1e-9 && Math.abs(c[1] - lat) < 1e-9);
}

export function featureIds(features: readonly GeoJSON.Feature[]): string[] {
  return features
    .map((f) => (f.properties as Partial<CompanyFeatureProps> | null)?.id)
    .filter((id): id is string => typeof id === 'string');
}
