import { CoordinateEngine } from '../engine/coordinateEngine.ts';
import type { LngLat, LocalPoint, PixelPoint } from '../engine/realityTypes.ts';

export class CameraBridge {
  private readonly coordinateEngine: CoordinateEngine;

  constructor(coordinateEngine: CoordinateEngine) {
    this.coordinateEngine = coordinateEngine;
  }

  lngLatToGame(point: LngLat): LocalPoint {
    return this.coordinateEngine.lngLatToLocal(point);
  }

  gameToScreen(point: LocalPoint): PixelPoint {
    return this.coordinateEngine.localToPixel(point);
  }
}
