import assert from 'node:assert/strict';
import { stableSortRenderCommands, footprintBottomScreenY } from '../engine/pixelSceneGenerator.ts';
import type { CauldronChunk, LocalBounds, RenderCommand, MaskGrid } from '../engine/realityTypes.ts';
import { CauldronCanvas } from '../runtime/CauldronCanvas.ts';
import { ChunkVisibilityIndex } from '../runtime/ChunkVisibility.ts';
import { CollisionSystem } from '../runtime/CollisionSystem.ts';
import { PerformanceMonitor } from '../runtime/PerformanceMonitor.ts';

const chunks = createSyntheticChunks();
const totalCommands = chunks.reduce((sum, chunk) => sum + chunk.renderCommands.length, 0);
const viewport: LocalBounds = { minX: 0, minY: 0, maxX: 50, maxY: 50 };
const visibility = new ChunkVisibilityIndex(chunks).visibleChunks(viewport, { paddingChunks: 1 });

assert.equal(totalCommands, 920, 'synthetic performance scene should contain 920 commands');
assert.equal(visibility.visibleChunkCount, 9, 'viewport padding should include 3x3 chunks');
assert.ok(visibility.visibleObjectCount < totalCommands, 'visible culling should reduce render objects');
assert.ok(visibility.culledObjectCount > 0, 'offscreen objects should be culled');
assert.equal(
  visibility.chunks.some((chunk) => chunk.chunkId === 'vancouver_2_2'),
  false,
  'far offscreen chunk should be skipped'
);

const visibleCommands = stableSortRenderCommands(visibility.chunks.flatMap((chunk) => chunk.renderCommands));
const sortedAgain = stableSortRenderCommands(visibleCommands);
assert.deepEqual(
  sortedAgain.map((command) => command.id),
  visibleCommands.map((command) => command.id),
  'render command ordering should remain stable after culling'
);

const visibleBuildings = visibleCommands.filter((command) => command.spriteType === 'building');
assert.deepEqual(
  visibleBuildings.map((command) => footprintBottomScreenY(command)),
  visibleBuildings.map((command) => footprintBottomScreenY(command)).sort((a, b) => a - b),
  'visible building commands should remain sorted by footprint bottom'
);

const monitor = new PerformanceMonitor();
const collision = new CollisionSystem();
collision.setChunks(chunks);
collision.setPerformanceMonitor(monitor);
monitor.beginFrame(0);
collision.resetDebugStats();
assert.equal(collision.canStandAt({ xMeters: 15, yMeters: 15 }), false, 'blocked mask cell should block standing');
assert.equal(collision.canStandAt({ xMeters: 3, yMeters: 3 }), true, 'walkable mask cell should allow standing');
const collisionStats = collision.getDebugStats();
assert.equal(collisionStats.objectScanCount, 0, 'collision lookup must not scan collision objects');
assert.equal(collisionStats.chunkLookups, 2, 'collision lookup should use direct chunk lookup');
const monitorStats = monitor.endFrame({
  drawCallCount: 0,
  visibleObjectCount: 0,
  visibleChunkCount: 0,
  culledObjectCount: 0,
}, 16);
assert.equal(monitorStats.collisionChecksPerFrame, 2, 'performance monitor should count collision checks');

const canvas = new CauldronCanvas({
  canvas: createMockCanvas(320, 240),
  maxDevicePixelRatio: 1.5,
  renderQuality: 'performance',
  performanceMonitor: new PerformanceMonitor(),
});
const firstFrame = canvas.drawFrame({
  chunks,
  viewport,
  player: { xMeters: 5, yMeters: 5 },
});
const firstCacheStats = canvas.getCacheStats();
const secondFrame = canvas.drawFrame({
  chunks,
  viewport,
  player: { xMeters: 6, yMeters: 5 },
});
const secondCacheStats = canvas.getCacheStats();

assert.ok(firstFrame.visibleObjectCount < totalCommands, 'canvas should render only visible culled commands');
assert.ok(firstFrame.culledObjectCount > 0, 'canvas frame stats should report culled objects');
assert.equal(secondFrame.visibleObjectCount, firstFrame.visibleObjectCount, 'simple player movement should keep visible command count stable');
assert.equal(secondCacheStats.groundRebuilds, firstCacheStats.groundRebuilds, 'player movement should not rebuild ground cache');
assert.equal(secondCacheStats.structureRebuilds, firstCacheStats.structureRebuilds, 'player movement should not rebuild structure cache');
assert.equal(secondCacheStats.debugRebuilds, firstCacheStats.debugRebuilds, 'player movement should not rebuild debug cache');
assert.equal(secondCacheStats.dynamicRedraws, firstCacheStats.dynamicRedraws + 1, 'player movement should only redraw dynamic layer');
assert.equal(canvas.startAnimationLoop(() => {}), true, 'first animation loop should start');
assert.equal(canvas.startAnimationLoop(() => {}), false, 'duplicate animation loop should be prevented');
canvas.stopAnimationLoop();

console.log(JSON.stringify({
  ok: true,
  totalCommands,
  visibleCommands: visibility.visibleObjectCount,
  culledCommands: visibility.culledObjectCount,
  visibleChunks: visibility.visibleChunkCount,
  cacheStats: secondCacheStats,
  collisionStats,
}, null, 2));

function createSyntheticChunks(): CauldronChunk[] {
  const chunks: CauldronChunk[] = [];
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const localBounds = {
        minX: x * 50,
        minY: y * 50,
        maxX: (x + 1) * 50,
        maxY: (y + 1) * 50,
      };
      chunks.push({
        chunkId: `vancouver_${x}_${y}`,
        bbox: { west: 0, south: 0, east: 0, north: 0 },
        localBounds,
        features: [],
        masks: createMask(`vancouver_${x}_${y}`),
        renderCommands: [],
      });
    }
  }

  addCommands(chunks, 100, 'road');
  addCommands(chunks, 300, 'building');
  addCommands(chunks, 500, 'tree');
  addCommands(chunks, 20, 'water');
  for (const chunk of chunks) {
    chunk.renderCommands = stableSortRenderCommands(chunk.renderCommands);
  }
  return chunks;
}

function addCommands(chunks: CauldronChunk[], count: number, spriteType: RenderCommand['spriteType']): void {
  for (let index = 0; index < count; index += 1) {
    const chunk = chunks[index % chunks.length];
    chunk.renderCommands.push(createCommand(chunk, spriteType, index));
  }
}

function createCommand(chunk: CauldronChunk, spriteType: RenderCommand['spriteType'], index: number): RenderCommand {
  const x = chunk.localBounds.minX + 2 + (index % 8) * 5;
  const y = chunk.localBounds.minY + 2 + (Math.floor(index / 8) % 8) * 5;
  const isPoint = spriteType === 'tree';
  const bounds = isPoint
    ? { minX: x, minY: y, maxX: x, maxY: y }
    : { minX: x, minY: y, maxX: x + 3, maxY: y + 3 };
  return {
    id: `${chunk.chunkId}:${spriteType}:${index}`,
    objectId: `${chunk.chunkId}:${spriteType}:${index}`,
    spriteType,
    layer: layerFor(spriteType),
    styleKey: styleFor(spriteType),
    debugColor: colorFor(spriteType),
    localBounds: bounds,
    points: isPoint
      ? [{ xMeters: x, yMeters: y }]
      : [
        { xMeters: bounds.minX, yMeters: bounds.minY },
        { xMeters: bounds.maxX, yMeters: bounds.minY },
        { xMeters: bounds.maxX, yMeters: bounds.maxY },
        { xMeters: bounds.minX, yMeters: bounds.maxY },
      ],
    footprint: spriteType === 'building' ? { type: 'Polygon', coordinates: [] } : undefined,
    blocked: spriteType === 'building',
    vertical: spriteType === 'building'
      ? {
        height_meters: 30,
        height_source: 'explicit_height',
        building_levels: null,
        floor_height_meters: 4,
        extrusion_height_units: 30,
        min_height_meters: 0,
      }
      : undefined,
  };
}

function createMask(chunkId: string): MaskGrid {
  const width = 50;
  const height = 50;
  const walkable = Array.from({ length: height }, () => Array.from({ length: width }, () => true));
  const blocked = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  const swimmable = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  const buildable = Array.from({ length: height }, () => Array.from({ length: width }, () => true));
  blocked[15][15] = true;
  return {
    chunkId,
    cellSizeMeters: 1,
    width,
    height,
    walkable,
    blocked,
    swimmable,
    buildable,
  };
}

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = {
    width,
    height,
    style: { width: `${width}px`, height: `${height}px` },
    getBoundingClientRect: () => ({ width, height }),
    getContext: () => context,
  };
  const context = {
    canvas,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    setTransform() {},
    clearRect() {},
    drawImage() {},
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
  };
  return canvas as unknown as HTMLCanvasElement;
}

function layerFor(spriteType: RenderCommand['spriteType']): RenderCommand['layer'] {
  if (spriteType === 'building') return 'structure';
  if (spriteType === 'tree') return 'ecosystem';
  return 'ground';
}

function styleFor(spriteType: RenderCommand['spriteType']): string {
  if (spriteType === 'building') return 'downtown_glass_midrise';
  if (spriteType === 'tree') return 'maple_cluster';
  if (spriteType === 'water') return 'vancouver_deep_blue_water';
  return 'vancouver_soft_gray_street';
}

function colorFor(spriteType: RenderCommand['spriteType']): string {
  if (spriteType === 'building') return '#4a6274';
  if (spriteType === 'tree') return '#1fa34a';
  if (spriteType === 'water') return '#1e73be';
  return '#7c7f86';
}
