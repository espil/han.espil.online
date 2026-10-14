import type { ClassifiedTile, CollisionShape, LngLat } from './types';

export function buildCollisionShapes(tile: ClassifiedTile): CollisionShape[] {
  return tile.features
    .filter((feature) => feature.collision)
    .map((feature): CollisionShape => {
      if (feature.geometry.type === 'Point') {
        return {
          id: feature.id,
          type: 'circle',
          terrainClass: feature.terrainClass,
          collision: true,
          coordinates: feature.geometry.coordinates as LngLat,
          radiusM: feature.terrainClass.startsWith('tree') ? 1.8 : 3,
        };
      }
      if (feature.geometry.type === 'LineString') {
        return {
          id: feature.id,
          type: 'line_buffer',
          terrainClass: feature.terrainClass,
          collision: true,
          coordinates: feature.geometry.coordinates as LngLat[],
          radiusM: 2,
        };
      }
      return {
        id: feature.id,
        type: 'polygon',
        terrainClass: feature.terrainClass,
        collision: true,
        coordinates: polygonOuterRing(feature.geometry),
      };
    });
}

export function canEnter(point: LngLat, shapes: CollisionShape[]): boolean {
  return !shapes.some((shape) => hitsShape(point, shape));
}

export function hitsShape(point: LngLat, shape: CollisionShape): boolean {
  if (!shape.collision) return false;
  if (shape.type === 'circle') {
    return distanceMeters(point, shape.coordinates as LngLat) <= (shape.radiusM ?? 0);
  }
  if (shape.type === 'polygon') {
    return pointInPolygon(point, shape.coordinates as LngLat[]);
  }
  if (shape.type === 'line_buffer') {
    return distanceToLine(point, shape.coordinates as LngLat[]) <= (shape.radiusM ?? 0);
  }
  return false;
}

function polygonOuterRing(geometry: GeoJSON.Geometry): LngLat[] {
  if (geometry.type === 'Polygon') return geometry.coordinates[0] as LngLat[];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates[0][0] as LngLat[];
  return [];
}

function pointInPolygon(point: LngLat, polygon: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects = yi > point[1] !== yj > point[1]
      && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToLine(point: LngLat, line: LngLat[]): number {
  if (line.length < 2) return Infinity;
  let min = Infinity;
  for (let index = 0; index < line.length - 1; index += 1) {
    min = Math.min(min, distanceMeters(point, line[index]), distanceMeters(point, line[index + 1]));
  }
  return min;
}

function distanceMeters(a: LngLat, b: LngLat): number {
  const lat = ((a[1] + b[1]) / 2) * Math.PI / 180;
  const dx = (b[0] - a[0]) * 111320 * Math.cos(lat);
  const dy = (b[1] - a[1]) * 110540;
  return Math.hypot(dx, dy);
}
