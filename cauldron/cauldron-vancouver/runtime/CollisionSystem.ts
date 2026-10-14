import type { CauldronChunk, LocalPoint } from '../engine/realityTypes.ts';
import type { PerformanceMonitor } from './PerformanceMonitor.ts';

export interface CollisionDebugStats {
  collisionChecks: number;
  chunkLookups: number;
  objectScanCount: number;
}

export interface CollisionProbe {
  worldX: number;
  worldY: number;
  chunkId: string | null;
  localCellX: number | null;
  localCellY: number | null;
  hasChunk: boolean;
  hasMask: boolean;
  walkable: boolean;
  blocked: boolean;
  swimmable: boolean;
}

export class CollisionSystem {
  private chunks: CauldronChunk[] = [];
  private chunkByGrid = new Map<string, CauldronChunk>();
  private chunkSizeMeters = 50;
  private performanceMonitor?: PerformanceMonitor;
  private warnedOutsideChunk = false;
  private warnedMissingMask = false;
  private debugStats: CollisionDebugStats = {
    collisionChecks: 0,
    chunkLookups: 0,
    objectScanCount: 0,
  };

  setChunks(chunks: CauldronChunk[]): void {
    this.chunks = chunks;
    this.chunkSizeMeters = inferChunkSize(chunks);
    this.chunkByGrid = new Map(chunks.map((chunk) => [gridKeyForPoint(chunk.localBounds.minX, chunk.localBounds.minY, this.chunkSizeMeters), chunk]));
  }

  setPerformanceMonitor(performanceMonitor: PerformanceMonitor | undefined): void {
    this.performanceMonitor = performanceMonitor;
  }

  resetDebugStats(): void {
    this.debugStats = {
      collisionChecks: 0,
      chunkLookups: 0,
      objectScanCount: 0,
    };
  }

  getDebugStats(): CollisionDebugStats {
    return { ...this.debugStats };
  }

  canStandAt(point: LocalPoint): boolean {
    const sample = this.sample(point);
    if (!sample) return false;
    return sample.walkable && !sample.blocked;
  }

  canSwimAt(point: LocalPoint): boolean {
    const sample = this.sample(point);
    return Boolean(sample?.swimmable);
  }

  sample(point: LocalPoint): null | { walkable: boolean; blocked: boolean; swimmable: boolean; buildable: boolean; chunkId: string } {
    this.debugStats.collisionChecks += 1;
    this.debugStats.chunkLookups += 1;
    this.performanceMonitor?.recordCollisionCheck();
    const chunk = this.chunkByGrid.get(gridKeyForPoint(point.xMeters, point.yMeters, this.chunkSizeMeters));
    if (!chunk) {
      if (!this.warnedOutsideChunk) {
        this.warnedOutsideChunk = true;
        console.warn('[Cauldron Collision] outside loaded chunks', point);
      }
      return null;
    }
    if (!hasMask(chunk)) {
      if (!this.warnedMissingMask) {
        this.warnedMissingMask = true;
        console.error('[Cauldron Collision] chunk mask missing', chunk.chunkId);
      }
      return null;
    }
    const x = Math.floor((point.xMeters - chunk.localBounds.minX) / chunk.masks.cellSizeMeters);
    const y = Math.floor((point.yMeters - chunk.localBounds.minY) / chunk.masks.cellSizeMeters);
    return {
      walkable: Boolean(chunk.masks.walkable[y]?.[x]),
      blocked: Boolean(chunk.masks.blocked[y]?.[x]),
      swimmable: Boolean(chunk.masks.swimmable[y]?.[x]),
      buildable: Boolean(chunk.masks.buildable[y]?.[x]),
      chunkId: chunk.chunkId,
    };
  }

  debugProbe(point: LocalPoint): CollisionProbe {
    const chunkId = gridKeyForPoint(point.xMeters, point.yMeters, this.chunkSizeMeters);
    const chunk = this.chunkByGrid.get(chunkId);
    if (!chunk) {
      return {
        worldX: point.xMeters,
        worldY: point.yMeters,
        chunkId,
        localCellX: null,
        localCellY: null,
        hasChunk: false,
        hasMask: false,
        walkable: false,
        blocked: true,
        swimmable: false,
      };
    }
    if (!hasMask(chunk)) {
      return {
        worldX: point.xMeters,
        worldY: point.yMeters,
        chunkId: chunk.chunkId,
        localCellX: null,
        localCellY: null,
        hasChunk: true,
        hasMask: false,
        walkable: false,
        blocked: true,
        swimmable: false,
      };
    }
    const localCellX = Math.floor((point.xMeters - chunk.localBounds.minX) / chunk.masks.cellSizeMeters);
    const localCellY = Math.floor((point.yMeters - chunk.localBounds.minY) / chunk.masks.cellSizeMeters);
    return {
      worldX: point.xMeters,
      worldY: point.yMeters,
      chunkId: chunk.chunkId,
      localCellX,
      localCellY,
      hasChunk: true,
      hasMask: true,
      walkable: Boolean(chunk.masks.walkable[localCellY]?.[localCellX]),
      blocked: Boolean(chunk.masks.blocked[localCellY]?.[localCellX]),
      swimmable: Boolean(chunk.masks.swimmable[localCellY]?.[localCellX]),
    };
  }
}

function inferChunkSize(chunks: CauldronChunk[]): number {
  const first = chunks[0];
  if (!first) return 50;
  return Math.max(1, first.localBounds.maxX - first.localBounds.minX);
}

function gridKeyForPoint(xMeters: number, yMeters: number, chunkSizeMeters: number): string {
  return `${Math.floor(xMeters / chunkSizeMeters)},${Math.floor(yMeters / chunkSizeMeters)}`;
}

function hasMask(chunk: CauldronChunk): boolean {
  return Boolean(chunk.masks?.walkable && chunk.masks?.blocked && chunk.masks?.swimmable && chunk.masks?.buildable);
}
