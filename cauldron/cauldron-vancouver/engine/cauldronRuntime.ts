import { CoordinateEngine, VANCOUVER_CENTER } from './coordinateEngine.ts';
import { compileFeatureCollection, compileToDocument } from './realityCompiler.ts';
import { buildChunks } from './chunkBuilder.ts';
import { generatePixelScene } from './pixelSceneGenerator.ts';
import type { GeoJsonFeatureCollection, RuntimeBuildResult } from './realityTypes.ts';

export interface RuntimeOptions {
  center?: [number, number];
  metersPerPixel?: number;
  chunkSizeMeters?: number;
  cellSizeMeters?: number;
}

export function buildCauldronRuntime(
  rawGeoJson: GeoJsonFeatureCollection,
  options: RuntimeOptions = {}
): RuntimeBuildResult {
  const center = options.center ?? VANCOUVER_CENTER;
  const metersPerPixel = options.metersPerPixel ?? 1;
  const coordinateEngine = new CoordinateEngine({ center, metersPerPixel });
  const objects = compileFeatureCollection(rawGeoJson, { center, metersPerPixel });
  const chunks = buildChunks(objects, {
    coordinateEngine,
    chunkSizeMeters: options.chunkSizeMeters ?? 50,
    cellSizeMeters: options.cellSizeMeters ?? 1,
  });
  const scene = generatePixelScene('vancouver_demo', chunks, center, metersPerPixel);
  return {
    compiled: compileToDocument(rawGeoJson, { center, metersPerPixel }),
    chunks,
    scenes: [scene],
  };
}

export function summarizeRuntime(result: RuntimeBuildResult) {
  return {
    objects: result.compiled.objects.length,
    chunks: result.chunks.length,
    renderCommands: result.scenes.reduce((sum, scene) => sum + scene.renderCommands.length, 0),
    classes: result.compiled.objects.reduce<Record<string, number>>((acc, object) => {
      acc[object.cauldronClass] = (acc[object.cauldronClass] ?? 0) + 1;
      return acc;
    }, {}),
  };
}
