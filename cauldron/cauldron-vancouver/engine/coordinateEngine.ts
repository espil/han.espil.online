import type { Geometry, LngLat, LocalBounds, LocalPoint, PixelPoint } from './realityTypes.ts';

export const VANCOUVER_CENTER: LngLat = [-123.1207, 49.2827];

export interface CoordinateEngineOptions {
  center?: LngLat;
  metersPerPixel?: number;
}

export class CoordinateEngine {
  readonly center: LngLat;
  readonly metersPerPixel: number;

  constructor(options: CoordinateEngineOptions = {}) {
    this.center = options.center ?? VANCOUVER_CENTER;
    this.metersPerPixel = options.metersPerPixel ?? 1;
  }

  lngLatToLocal(point: LngLat): LocalPoint {
    const latRad = this.center[1] * Math.PI / 180;
    return {
      xMeters: (point[0] - this.center[0]) * 111320 * Math.cos(latRad),
      yMeters: (point[1] - this.center[1]) * 110540,
    };
  }

  localToPixel(point: LocalPoint): PixelPoint {
    return {
      x: point.xMeters / this.metersPerPixel,
      y: -point.yMeters / this.metersPerPixel,
    };
  }

  geometryPoints(geometry: Geometry): LocalPoint[] {
    return coordinatesOf(geometry).map((point) => this.lngLatToLocal(point));
  }

  localBoundsFor(geometry: Geometry): LocalBounds {
    const points = this.geometryPoints(geometry);
    if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return {
      minX: Math.min(...points.map((point) => point.xMeters)),
      minY: Math.min(...points.map((point) => point.yMeters)),
      maxX: Math.max(...points.map((point) => point.xMeters)),
      maxY: Math.max(...points.map((point) => point.yMeters)),
    };
  }

  centroidFor(geometry: Geometry): LocalPoint {
    const points = this.geometryPoints(geometry);
    if (!points.length) return { xMeters: 0, yMeters: 0 };
    const sum = points.reduce((acc, point) => ({
      xMeters: acc.xMeters + point.xMeters,
      yMeters: acc.yMeters + point.yMeters,
    }), { xMeters: 0, yMeters: 0 });
    return {
      xMeters: sum.xMeters / points.length,
      yMeters: sum.yMeters / points.length,
    };
  }
}

export function coordinatesOf(geometry: Geometry): LngLat[] {
  if (geometry.type === 'Point') return [geometry.coordinates];
  if (geometry.type === 'LineString') return geometry.coordinates;
  if (geometry.type === 'Polygon') return geometry.coordinates.flat(1);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat(2);
  return [];
}
