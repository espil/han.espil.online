import type { CauldronObject, LocalBounds, MaskGrid } from './realityTypes.ts';

export interface MaskBuilderOptions {
  chunkId: string;
  localBounds: LocalBounds;
  cellSizeMeters?: number;
}

export function buildMasks(objects: CauldronObject[], options: MaskBuilderOptions): MaskGrid {
  const cellSizeMeters = options.cellSizeMeters ?? 1;
  const width = Math.ceil((options.localBounds.maxX - options.localBounds.minX) / cellSizeMeters);
  const height = Math.ceil((options.localBounds.maxY - options.localBounds.minY) / cellSizeMeters);
  const masks: MaskGrid = {
    chunkId: options.chunkId,
    cellSizeMeters,
    width,
    height,
    walkable: createGrid(width, height, false),
    blocked: createGrid(width, height, false),
    swimmable: createGrid(width, height, false),
    buildable: createGrid(width, height, false),
  };

  for (const object of objects) {
    const range = objectRange(object.world.localBounds, options.localBounds, cellSizeMeters, width, height);
    for (let y = range.minY; y <= range.maxY; y += 1) {
      for (let x = range.minX; x <= range.maxX; x += 1) {
        if (object.gameplay.walkable) masks.walkable[y][x] = true;
        if (object.gameplay.blocked) masks.blocked[y][x] = true;
        if (object.gameplay.swimmable) masks.swimmable[y][x] = true;
        if (object.gameplay.buildable) masks.buildable[y][x] = true;
        if (object.cauldronClass === 'building') {
          masks.walkable[y][x] = false;
          masks.buildable[y][x] = false;
        }
        if (object.cauldronClass === 'water') {
          masks.walkable[y][x] = false;
          masks.buildable[y][x] = false;
        }
      }
    }
  }

  return masks;
}

export function maskStats(mask: MaskGrid) {
  return {
    walkable: countTrue(mask.walkable),
    blocked: countTrue(mask.blocked),
    swimmable: countTrue(mask.swimmable),
    buildable: countTrue(mask.buildable),
  };
}

function createGrid(width: number, height: number, value: boolean): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => value));
}

function objectRange(bounds: LocalBounds, chunkBounds: LocalBounds, cellSize: number, width: number, height: number) {
  return {
    minX: clamp(Math.floor((bounds.minX - chunkBounds.minX) / cellSize), 0, width - 1),
    maxX: clamp(Math.ceil((bounds.maxX - chunkBounds.minX) / cellSize), 0, width - 1),
    minY: clamp(Math.floor((bounds.minY - chunkBounds.minY) / cellSize), 0, height - 1),
    maxY: clamp(Math.ceil((bounds.maxY - chunkBounds.minY) / cellSize), 0, height - 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function countTrue(grid: boolean[][]): number {
  return grid.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
}
