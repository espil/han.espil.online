import { CoordinateEngine } from './coordinateEngine.ts';
import { buildMasks } from './maskBuilder.ts';
import { generateChunkRenderCommands } from './pixelSceneGenerator.ts';
import type { CauldronChunk, CauldronObject, LocalBounds } from './realityTypes.ts';

export interface ChunkBuilderOptions {
  chunkSizeMeters?: number;
  cellSizeMeters?: number;
  coordinateEngine: CoordinateEngine;
}

export function buildChunks(objects: CauldronObject[], options: ChunkBuilderOptions): CauldronChunk[] {
  const chunkSizeMeters = options.chunkSizeMeters ?? 50;
  const grouped = new Map<string, CauldronObject[]>();

  for (const object of objects) {
    const chunkId = chunkIdFor(object.world.centroid, chunkSizeMeters);
    grouped.set(chunkId, [...(grouped.get(chunkId) ?? []), object]);
  }

  return [...grouped.entries()].map(([chunkId, chunkObjects]) => {
    const localBounds = chunkLocalBounds(chunkId, chunkSizeMeters);
    const masks = buildMasks(chunkObjects, {
      chunkId,
      localBounds,
      cellSizeMeters: options.cellSizeMeters ?? 1,
    });
    return {
      chunkId,
      bbox: {
        west: localBounds.minX,
        south: localBounds.minY,
        east: localBounds.maxX,
        north: localBounds.maxY,
      },
      localBounds,
      features: chunkObjects,
      masks,
      renderCommands: generateChunkRenderCommands(chunkObjects, options.coordinateEngine),
    };
  }).sort((a, b) => a.chunkId.localeCompare(b.chunkId));
}

export function chunkIdFor(point: { xMeters: number; yMeters: number }, chunkSizeMeters = 50): string {
  const x = Math.floor(point.xMeters / chunkSizeMeters);
  const y = Math.floor(point.yMeters / chunkSizeMeters);
  return `vancouver_${formatIndex(x)}_${formatIndex(y)}`;
}

export function chunkLocalBounds(chunkId: string, chunkSizeMeters = 50): LocalBounds {
  const [, xText, yText] = chunkId.match(/^vancouver_(-?\d+)_(-?\d+)$/) ?? [];
  const x = Number(xText);
  const y = Number(yText);
  return {
    minX: x * chunkSizeMeters,
    minY: y * chunkSizeMeters,
    maxX: (x + 1) * chunkSizeMeters,
    maxY: (y + 1) * chunkSizeMeters,
  };
}

function formatIndex(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}${String(Math.abs(value)).padStart(3, '0')}`;
}
