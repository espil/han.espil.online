import type { CauldronChunk, CauldronObject, LocalPoint, PixelScene, RenderCommand } from './realityTypes.ts';
import { coordinatesOf, CoordinateEngine } from './coordinateEngine.ts';

export const DEBUG_PALETTE = {
  road: '#7c7f86',
  building: '#24242b',
  tree: '#1fa34a',
  water: '#1e73be',
  park: '#8bd66b',
  terrain: '#9b8b6d',
  poi: '#ffd45c',
  collision: 'rgba(255,0,0,0.32)',
  player: '#ff4d6d',
};

export const RENDER_BANDS = {
  terrain: 0,
  surface: 1,
  ecosystem: 2,
  structure: 3,
  player: 4,
  overlay: 5,
} as const;

export function objectToRenderCommand(object: CauldronObject, coordinateEngine: CoordinateEngine): RenderCommand {
  return {
    id: `render:${object.id}`,
    objectId: object.id,
    spriteType: object.cauldronClass,
    layer: object.render.layer,
    styleKey: object.render.styleKey,
    debugColor: object.render.debugColor,
    localBounds: object.world.localBounds,
    points: coordinatesOf(object.geometry).map((point) => coordinateEngine.lngLatToLocal(point)),
    footprint: object.cauldronClass === 'building' ? object.geometry : undefined,
    blocked: object.gameplay.blocked,
    vertical: object.building?.vertical,
  };
}

export function generateChunkRenderCommands(objects: CauldronObject[], coordinateEngine: CoordinateEngine): RenderCommand[] {
  return stableSortRenderCommands(objects.map((object) => objectToRenderCommand(object, coordinateEngine)));
}

export function generatePixelScene(sceneId: string, chunks: CauldronChunk[], center: [number, number], metersPerPixel = 1): PixelScene {
  const renderCommands = stableSortRenderCommands(chunks.flatMap((chunk) => chunk.renderCommands));
  return {
    sceneId,
    center,
    metersPerPixel,
    mode: 'verticalData',
    renderCommands,
    debugPalette: DEBUG_PALETTE,
  };
}

export function pointsToCanvasPath(points: LocalPoint[], origin: LocalPoint, metersPerPixel: number): [number, number][] {
  return points.map((point) => [
    (point.xMeters - origin.xMeters) / metersPerPixel,
    (origin.yMeters - point.yMeters) / metersPerPixel,
  ]);
}

export function stableSortRenderCommands(commands: RenderCommand[]): RenderCommand[] {
  return commands
    .map((command, index) => ({ command, index }))
    .sort((a, b) => compareVerticalDataRenderCommands(a.command, b.command) || a.index - b.index)
    .map(({ command }) => command);
}

export function compareVerticalDataRenderCommands(a: RenderCommand, b: RenderCommand): number {
  const bandDelta = renderBandForCommand(a) - renderBandForCommand(b);
  if (bandDelta) return bandDelta;

  const aBand = renderBandForCommand(a);
  if (aBand === RENDER_BANDS.ecosystem || aBand === RENDER_BANDS.structure) {
    return footprintBottomScreenY(a) - footprintBottomScreenY(b);
  }

  return 0;
}

export function renderBandForCommand(command: RenderCommand): number {
  if (command.spriteType === 'terrain') return RENDER_BANDS.terrain;
  if (command.layer === 'overlay') return RENDER_BANDS.overlay;
  if (command.layer === 'ground' || command.spriteType === 'water' || command.spriteType === 'road' || command.spriteType === 'park') {
    return RENDER_BANDS.surface;
  }
  if (command.layer === 'ecosystem' || command.spriteType === 'tree') return RENDER_BANDS.ecosystem;
  if (command.layer === 'structure' || command.spriteType === 'building') return RENDER_BANDS.structure;
  return RENDER_BANDS.overlay;
}

export function footprintBottomScreenY(command: RenderCommand): number {
  return -command.localBounds.minY;
}
