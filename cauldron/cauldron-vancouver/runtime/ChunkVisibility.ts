import type { CauldronChunk, LocalBounds } from '../engine/realityTypes.ts';

export interface ChunkVisibilityOptions {
  paddingChunks?: number;
  chunkSizeMeters?: number;
}

export interface VisibleChunkResult {
  chunks: CauldronChunk[];
  visibleChunkCount: number;
  totalChunkCount: number;
  visibleObjectCount: number;
  culledObjectCount: number;
  key: string;
}

export class ChunkVisibilityIndex {
  private readonly chunks: CauldronChunk[];
  private readonly chunksByGrid = new Map<string, CauldronChunk>();
  private readonly chunkSizeMeters: number;
  private readonly totalObjectCount: number;

  constructor(chunks: CauldronChunk[], options: ChunkVisibilityOptions = {}) {
    this.chunks = chunks;
    this.chunkSizeMeters = options.chunkSizeMeters ?? inferChunkSize(chunks);
    this.totalObjectCount = chunks.reduce((sum, chunk) => sum + chunk.renderCommands.length, 0);
    for (const chunk of chunks) {
      this.chunksByGrid.set(gridKeyForBounds(chunk.localBounds, this.chunkSizeMeters), chunk);
    }
  }

  visibleChunks(viewport: LocalBounds, options: ChunkVisibilityOptions = {}): VisibleChunkResult {
    const paddingChunks = options.paddingChunks ?? 1;
    const edgeEpsilon = 1e-9;
    const minChunkX = Math.floor(viewport.minX / this.chunkSizeMeters) - paddingChunks;
    const maxChunkX = Math.floor((viewport.maxX - edgeEpsilon) / this.chunkSizeMeters) + paddingChunks;
    const minChunkY = Math.floor(viewport.minY / this.chunkSizeMeters) - paddingChunks;
    const maxChunkY = Math.floor((viewport.maxY - edgeEpsilon) / this.chunkSizeMeters) + paddingChunks;
    const visible: CauldronChunk[] = [];

    for (let y = minChunkY; y <= maxChunkY; y += 1) {
      for (let x = minChunkX; x <= maxChunkX; x += 1) {
        const chunk = this.chunksByGrid.get(`${x},${y}`);
        if (chunk) visible.push(chunk);
      }
    }

    const visibleObjectCount = visible.reduce((sum, chunk) => sum + chunk.renderCommands.length, 0);
    return {
      chunks: visible,
      visibleChunkCount: visible.length,
      totalChunkCount: this.chunks.length,
      visibleObjectCount,
      culledObjectCount: Math.max(0, this.totalObjectCount - visibleObjectCount),
      key: visibleChunkSetKey(visible),
    };
  }
}

export function visibleChunkSetKey(chunks: CauldronChunk[]): string {
  return chunks.map((chunk) => chunk.chunkId).sort().join('|');
}

function inferChunkSize(chunks: CauldronChunk[]): number {
  const first = chunks[0];
  if (!first) return 50;
  return Math.max(1, first.localBounds.maxX - first.localBounds.minX);
}

function gridKeyForBounds(bounds: LocalBounds, chunkSizeMeters: number): string {
  return `${Math.floor(bounds.minX / chunkSizeMeters)},${Math.floor(bounds.minY / chunkSizeMeters)}`;
}
