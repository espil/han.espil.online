import { footprintBottomScreenY, pointsToCanvasPath, renderBandForCommand, RENDER_BANDS, stableSortRenderCommands } from '../engine/pixelSceneGenerator.ts';
import type { CauldronChunk, LocalBounds, LocalPoint, PixelScene, RenderCommand } from '../engine/realityTypes.ts';
import { ChunkVisibilityIndex } from './ChunkVisibility.ts';
import { PerformanceMonitor, type PerformanceFrameStats } from './PerformanceMonitor.ts';

export type RenderQuality = 'performance' | 'balanced' | 'quality';

export interface DirtyFlags {
  groundDirty: boolean;
  structureDirty: boolean;
  debugDirty: boolean;
  dynamicDirty: boolean;
}

export interface CanvasCacheStats {
  groundRebuilds: number;
  structureRebuilds: number;
  debugRebuilds: number;
  dynamicRedraws: number;
  sortedCommandRebuilds: number;
}

export interface CauldronCanvasOptions {
  canvas: HTMLCanvasElement;
  metersPerPixel?: number;
  origin?: LocalPoint;
  maxDevicePixelRatio?: number;
  renderQuality?: RenderQuality;
  debugOverlays?: boolean;
  debugPerformance?: boolean;
  performanceMonitor?: PerformanceMonitor;
}

export interface CauldronFrameOptions {
  scene?: PixelScene;
  chunks?: CauldronChunk[];
  viewport?: LocalBounds;
  player?: LocalPoint;
  origin?: LocalPoint;
  zoom?: number;
  renderMode?: PixelScene['mode'];
  renderQuality?: RenderQuality;
  debugOverlays?: boolean;
  debugPerformance?: boolean;
}

interface RenderBatch {
  key: string;
  commands: RenderCommand[];
}

type LayerName = 'ground' | 'structure' | 'dynamic' | 'debug';

export class CauldronCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly layers: Record<LayerName, HTMLCanvasElement | OffscreenCanvas>;
  private readonly layerContexts: Record<LayerName, CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D>;
  private readonly performanceMonitor: PerformanceMonitor;
  private metersPerPixel: number;
  private origin: LocalPoint;
  private readonly cacheOrigins: Record<LayerName, LocalPoint>;
  private maxDevicePixelRatio: number;
  private devicePixelRatio = 1;
  private viewWidth = 1;
  private viewHeight = 1;
  private renderQuality: RenderQuality;
  private renderMode: PixelScene['mode'] = 'verticalData';
  private zoom = 1;
  private debugOverlays: boolean;
  private sourceChunks: CauldronChunk[] | null = null;
  private sourceScene: PixelScene | null = null;
  private chunkVisibilityIndex: ChunkVisibilityIndex | null = null;
  private visibleChunkKey = '';
  private visibleChunks: CauldronChunk[] = [];
  private visibleCommands: RenderCommand[] = [];
  private groundBatches: RenderBatch[] = [];
  private structureBatches: RenderBatch[] = [];
  private overlayBatches: RenderBatch[] = [];
  private totalObjectCount = 0;
  private lastFrameStats: PerformanceFrameStats;
  private frameDrawCallCount = 0;
  private animationLoopRunning = false;
  private animationFrameId: number | null = null;
  readonly dirtyFlags: DirtyFlags = {
    groundDirty: true,
    structureDirty: true,
    debugDirty: true,
    dynamicDirty: true,
  };
  private readonly cacheStats: CanvasCacheStats = {
    groundRebuilds: 0,
    structureRebuilds: 0,
    debugRebuilds: 0,
    dynamicRedraws: 0,
    sortedCommandRebuilds: 0,
  };

  constructor(options: CauldronCanvasOptions) {
    this.canvas = options.canvas;
    const context = options.canvas.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable.');
    this.context = context;
    this.metersPerPixel = options.metersPerPixel ?? 1;
    this.origin = options.origin ?? { xMeters: -25, yMeters: 25 };
    this.cacheOrigins = {
      ground: { ...this.origin },
      structure: { ...this.origin },
      dynamic: { ...this.origin },
      debug: { ...this.origin },
    };
    this.maxDevicePixelRatio = options.maxDevicePixelRatio ?? 1.5;
    this.renderQuality = options.renderQuality ?? 'performance';
    this.debugOverlays = options.debugOverlays ?? false;
    this.performanceMonitor = options.performanceMonitor ?? new PerformanceMonitor({
      debugPerformance: options.debugPerformance ?? false,
    });
    this.lastFrameStats = this.performanceMonitor.snapshot();
    this.layers = {
      ground: createCanvasBuffer(1, 1),
      structure: createCanvasBuffer(1, 1),
      dynamic: createCanvasBuffer(1, 1),
      debug: createCanvasBuffer(1, 1),
    };
    this.layerContexts = {
      ground: getCanvasContext(this.layers.ground),
      structure: getCanvasContext(this.layers.structure),
      dynamic: getCanvasContext(this.layers.dynamic),
      debug: getCanvasContext(this.layers.debug),
    };
    this.resizeToDisplaySize();
  }

  drawScene(scene: PixelScene, player?: LocalPoint): PerformanceFrameStats {
    return this.drawFrame({ scene, player });
  }

  drawFrame(options: CauldronFrameOptions = {}): PerformanceFrameStats {
    this.performanceMonitor.setDebugPerformance(options.debugPerformance ?? false);
    this.performanceMonitor.beginFrame();
    this.frameDrawCallCount = 0;
    this.applyFrameOptions(options);
    this.rebuildDirtyStaticLayers();
    this.redrawDynamicLayer(options.player);
    this.composeLayers(options.player);
    this.lastFrameStats = this.performanceMonitor.endFrame({
      drawCallCount: this.frameDrawCallCount,
      visibleObjectCount: this.visibleCommands.length,
      visibleChunkCount: this.visibleChunks.length,
      culledObjectCount: Math.max(0, this.totalObjectCount - this.visibleCommands.length),
    });
    return this.lastFrameStats;
  }

  resizeToDisplaySize(width?: number, height?: number): boolean {
    const rect = typeof this.canvas.getBoundingClientRect === 'function'
      ? this.canvas.getBoundingClientRect()
      : { width: this.canvas.width || 1, height: this.canvas.height || 1 };
    const nextWidth = Math.max(1, Math.round(width ?? rect.width ?? 1));
    const nextHeight = Math.max(1, Math.round(height ?? rect.height ?? 1));
    const nextRatio = Math.min(devicePixelRatioForRuntime(), this.maxDevicePixelRatio);
    if (nextWidth === this.viewWidth && nextHeight === this.viewHeight && nextRatio === this.devicePixelRatio) return false;
    this.viewWidth = nextWidth;
    this.viewHeight = nextHeight;
    this.devicePixelRatio = nextRatio;
    resizeCanvas(this.canvas, nextWidth, nextHeight, nextRatio);
    for (const layer of Object.values(this.layers)) resizeCanvas(layer, nextWidth, nextHeight, nextRatio);
    this.markStaticDirty();
    this.dirtyFlags.dynamicDirty = true;
    return true;
  }

  drawPlayer(point: LocalPoint): void {
    this.drawPlayerToContext(this.context, point);
  }

  startAnimationLoop(frame: (now: number) => void): boolean {
    if (this.animationLoopRunning) return false;
    this.animationLoopRunning = true;
    const tick = (now: number) => {
      if (!this.animationLoopRunning) return;
      frame(now);
      this.animationFrameId = requestRuntimeFrame(tick);
    };
    this.animationFrameId = requestRuntimeFrame(tick);
    return true;
  }

  stopAnimationLoop(): void {
    this.animationLoopRunning = false;
    if (this.animationFrameId !== null) cancelRuntimeFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  isAnimationLoopRunning(): boolean {
    return this.animationLoopRunning;
  }

  getDirtyFlags(): DirtyFlags {
    return { ...this.dirtyFlags };
  }

  getCacheStats(): CanvasCacheStats {
    return { ...this.cacheStats };
  }

  getLastFrameStats(): PerformanceFrameStats {
    return { ...this.lastFrameStats };
  }

  clear(): void {
    clearContext(this.context, this.viewWidth, this.viewHeight);
  }

  private applyFrameOptions(options: CauldronFrameOptions): void {
    if (options.origin) this.origin = options.origin;
    if (options.zoom !== undefined && options.zoom !== this.zoom) {
      this.zoom = options.zoom;
      this.markStaticDirty();
    }
    if (options.renderMode && options.renderMode !== this.renderMode) {
      this.renderMode = options.renderMode;
      this.markStaticDirty();
    }
    if (options.renderQuality && options.renderQuality !== this.renderQuality) {
      this.renderQuality = options.renderQuality;
      this.markStaticDirty();
    }
    if (options.debugOverlays !== undefined && options.debugOverlays !== this.debugOverlays) {
      this.debugOverlays = options.debugOverlays;
      this.dirtyFlags.debugDirty = true;
    }
    if (options.chunks) this.applyChunks(options.chunks, options.viewport);
    else if (options.scene) this.applyScene(options.scene);
  }

  private applyChunks(chunks: CauldronChunk[], viewport?: LocalBounds): void {
    if (chunks !== this.sourceChunks) {
      this.sourceChunks = chunks;
      this.sourceScene = null;
      this.chunkVisibilityIndex = new ChunkVisibilityIndex(chunks);
      this.totalObjectCount = chunks.reduce((sum, chunk) => sum + chunk.renderCommands.length, 0);
      this.visibleChunkKey = '';
    }
    if (!this.chunkVisibilityIndex) return;
    const nextViewport = viewport ?? this.viewportFromOrigin();
    const result = this.chunkVisibilityIndex.visibleChunks(nextViewport, { paddingChunks: 1 });
    if (result.key === this.visibleChunkKey) return;
    this.visibleChunkKey = result.key;
    this.visibleChunks = result.chunks;
    this.setVisibleCommands(stableSortRenderCommands(result.chunks.flatMap((chunk) => chunk.renderCommands)));
  }

  private applyScene(scene: PixelScene): void {
    if (scene === this.sourceScene) return;
    this.sourceScene = scene;
    this.sourceChunks = null;
    this.chunkVisibilityIndex = null;
    this.visibleChunkKey = `scene:${scene.sceneId}:${scene.renderCommands.length}`;
    this.visibleChunks = [];
    this.totalObjectCount = scene.renderCommands.length;
    this.setVisibleCommands(stableSortRenderCommands(scene.renderCommands));
  }

  private setVisibleCommands(commands: RenderCommand[]): void {
    this.visibleCommands = commands;
    this.groundBatches = buildRenderBatches(commands.filter((command) => {
      const band = renderBandForCommand(command);
      return band === RENDER_BANDS.terrain || band === RENDER_BANDS.surface;
    }));
    this.structureBatches = buildRenderBatches(commands.filter((command) => {
      const band = renderBandForCommand(command);
      return band === RENDER_BANDS.ecosystem || band === RENDER_BANDS.structure;
    }));
    this.overlayBatches = buildRenderBatches(commands.filter((command) => {
      if (isDebugOnlyCommand(command) && !this.debugOverlays) return false;
      return renderBandForCommand(command) === RENDER_BANDS.overlay;
    }));
    this.cacheStats.sortedCommandRebuilds += 1;
    this.markStaticDirty();
  }

  private rebuildDirtyStaticLayers(): void {
    if (this.dirtyFlags.groundDirty) {
      this.rebuildLayer('ground', this.groundBatches);
      this.dirtyFlags.groundDirty = false;
      this.cacheStats.groundRebuilds += 1;
    }
    if (this.dirtyFlags.structureDirty) {
      this.rebuildLayer('structure', this.structureBatches);
      this.dirtyFlags.structureDirty = false;
      this.cacheStats.structureRebuilds += 1;
    }
    if (this.dirtyFlags.debugDirty) {
      this.rebuildLayer('debug', this.overlayBatches);
      this.dirtyFlags.debugDirty = false;
      this.cacheStats.debugRebuilds += 1;
    }
  }

  private rebuildLayer(layer: LayerName, batches: RenderBatch[]): void {
    const context = this.layerContexts[layer];
    clearContext(context, this.viewWidth, this.viewHeight);
    this.cacheOrigins[layer] = { ...this.origin };
    for (const batch of batches) {
      for (const command of batch.commands) {
        this.drawCommandToContext(context, command, this.cacheOrigins[layer]);
        this.frameDrawCallCount += 1;
      }
    }
  }

  private redrawDynamicLayer(player?: LocalPoint): void {
    const context = this.layerContexts.dynamic;
    clearContext(context, this.viewWidth, this.viewHeight);
    if (player) {
      this.drawPlayerToContext(context, player);
      this.frameDrawCallCount += 1;
    }
    this.dirtyFlags.dynamicDirty = false;
    this.cacheStats.dynamicRedraws += 1;
  }

  private composeLayers(player?: LocalPoint): void {
    this.clear();
    this.drawCachedLayer('ground');
    const drawPlayerBehindStructures = player ? this.playerDrawsBehindStructures(player) : false;
    if (drawPlayerBehindStructures) this.drawRawLayer('dynamic');
    this.drawCachedLayer('structure');
    if (!drawPlayerBehindStructures) this.drawRawLayer('dynamic');
    this.drawCachedLayer('debug');
  }

  private drawCachedLayer(layer: LayerName): void {
    const cacheOrigin = this.cacheOrigins[layer];
    const dx = (cacheOrigin.xMeters - this.origin.xMeters) / this.metersPerPixel;
    const dy = (this.origin.yMeters - cacheOrigin.yMeters) / this.metersPerPixel;
    this.context.drawImage(this.layers[layer] as CanvasImageSource, dx, dy, this.viewWidth, this.viewHeight);
    this.frameDrawCallCount += 1;
  }

  private drawRawLayer(layer: LayerName): void {
    this.context.drawImage(this.layers[layer] as CanvasImageSource, 0, 0, this.viewWidth, this.viewHeight);
    this.frameDrawCallCount += 1;
  }

  private playerDrawsBehindStructures(player: LocalPoint): boolean {
    const playerScreenY = -player.yMeters;
    const structureBottoms = this.visibleCommands
      .filter((command) => renderBandForCommand(command) === RENDER_BANDS.structure)
      .map((command) => footprintBottomScreenY(command));
    if (!structureBottoms.length) return false;
    return playerScreenY <= Math.min(...structureBottoms);
  }

  private markStaticDirty(): void {
    this.dirtyFlags.groundDirty = true;
    this.dirtyFlags.structureDirty = true;
    this.dirtyFlags.debugDirty = true;
  }

  private viewportFromOrigin(): LocalBounds {
    return {
      minX: this.origin.xMeters,
      maxX: this.origin.xMeters + this.viewWidth * this.metersPerPixel,
      minY: this.origin.yMeters - this.viewHeight * this.metersPerPixel,
      maxY: this.origin.yMeters,
    };
  }

  private drawCommandToContext(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    command: RenderCommand,
    origin: LocalPoint
  ): void {
    const path = pointsToCanvasPath(command.points, origin, this.metersPerPixel);
    if (!path.length) return;
    context.fillStyle = command.debugColor;
    context.strokeStyle = command.debugColor;
    context.lineWidth = command.layer === 'ground' ? 4 : 2;

    if (command.vertical && command.layer === 'structure') {
      this.drawExtrudedBuilding(context, command, path);
      return;
    }

    if (path.length === 1) {
      context.beginPath();
      context.arc(path[0][0], path[0][1], command.layer === 'ecosystem' ? 4 : 3, 0, Math.PI * 2);
      context.fill();
      return;
    }

    context.beginPath();
    context.moveTo(path[0][0], path[0][1]);
    for (const point of path.slice(1)) context.lineTo(point[0], point[1]);
    if (command.layer === 'structure' || command.layer === 'ground') {
      context.closePath();
      context.fill();
    }
    context.stroke();
  }

  private drawPlayerToContext(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    point: LocalPoint
  ): void {
    const x = (point.xMeters - this.origin.xMeters) / this.metersPerPixel;
    const y = (this.origin.yMeters - point.yMeters) / this.metersPerPixel;
    context.fillStyle = '#ff4d6d';
    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fill();
  }

  private drawExtrudedBuilding(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    command: RenderCommand,
    path: [number, number][]
  ): void {
    const height = Math.max(2, command.vertical?.extrusion_height_units ?? 0);
    const verticalPixels = Math.min(this.renderQuality === 'performance' ? 48 : 96, height / this.metersPerPixel);
    const topPath = path.map(([x, y]) => [x, y - verticalPixels] as [number, number]);

    context.fillStyle = 'rgba(0,0,0,.18)';
    context.beginPath();
    context.moveTo(path[0][0], path[0][1]);
    for (const point of path.slice(1)) context.lineTo(point[0], point[1]);
    context.closePath();
    context.fill();

    if (this.renderQuality === 'performance') {
      context.fillStyle = command.debugColor;
      context.globalAlpha = command.vertical?.height_source === 'unknown' ? 0.44 : 0.68;
      context.beginPath();
      context.moveTo(topPath[0][0], topPath[0][1]);
      for (const point of topPath.slice(1)) context.lineTo(point[0], point[1]);
      context.closePath();
      context.fill();
      context.globalAlpha = 1;
      context.stroke();
      return;
    }

    context.fillStyle = command.debugColor;
    context.globalAlpha = command.vertical?.height_source === 'unknown' ? 0.48 : 0.72;
    for (let index = 0; index < path.length; index += 1) {
      const next = (index + 1) % path.length;
      context.beginPath();
      context.moveTo(path[index][0], path[index][1]);
      context.lineTo(path[next][0], path[next][1]);
      context.lineTo(topPath[next][0], topPath[next][1]);
      context.lineTo(topPath[index][0], topPath[index][1]);
      context.closePath();
      context.fill();
    }

    context.globalAlpha = 1;
    context.fillStyle = command.debugColor;
    context.beginPath();
    context.moveTo(topPath[0][0], topPath[0][1]);
    for (const point of topPath.slice(1)) context.lineTo(point[0], point[1]);
    context.closePath();
    context.fill();
    context.stroke();
  }
}

function buildRenderBatches(commands: RenderCommand[]): RenderBatch[] {
  const batches: RenderBatch[] = [];
  for (const command of commands) {
    const key = [
      command.layer,
      command.spriteType,
      command.styleKey,
      command.debugColor,
      command.blocked ? 'blocked' : 'free',
      isDebugOnlyCommand(command) ? 'debug' : 'normal',
    ].join(':');
    const previous = batches[batches.length - 1];
    if (previous?.key === key) previous.commands.push(command);
    else batches.push({ key, commands: [command] });
  }
  return batches;
}

function isDebugOnlyCommand(command: RenderCommand): boolean {
  return command.styleKey.startsWith('debug_') || command.styleKey.includes('collision') || command.styleKey.includes('mask');
}

function createCanvasBuffer(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  const offscreenCanvas = (globalThis as { OffscreenCanvas?: new (width: number, height: number) => OffscreenCanvas }).OffscreenCanvas;
  if (typeof offscreenCanvas === 'function') return new offscreenCanvas(width, height);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return new NoopCanvas(width, height) as unknown as HTMLCanvasElement;
}

function getCanvasContext(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context unavailable.');
  return context as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}

function resizeCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, width: number, height: number, ratio: number): void {
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  if ('style' in canvas) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  const context = getCanvasContext(canvas);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function clearContext(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number): void {
  context.clearRect(0, 0, width, height);
}

function devicePixelRatioForRuntime(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
}

function requestRuntimeFrame(callback: FrameRequestCallback): number {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
  return setTimeout(() => callback(performance.now()), 16) as unknown as number;
}

function cancelRuntimeFrame(id: number): void {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
}

class NoopCanvas {
  width: number;
  height: number;
  style = { width: '', height: '' };
  private readonly context: NoopCanvasContext;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.context = new NoopCanvasContext(this);
  }

  getContext(): NoopCanvasContext {
    return this.context;
  }
}

class NoopCanvasContext {
  canvas: NoopCanvas;
  fillStyle: string | CanvasGradient | CanvasPattern = '#000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000';
  lineWidth = 1;
  globalAlpha = 1;

  constructor(canvas: NoopCanvas) {
    this.canvas = canvas;
  }

  setTransform(): void {}
  clearRect(): void {}
  drawImage(): void {}
  beginPath(): void {}
  arc(): void {}
  fill(): void {}
  stroke(): void {}
  moveTo(): void {}
  lineTo(): void {}
  closePath(): void {}
}
