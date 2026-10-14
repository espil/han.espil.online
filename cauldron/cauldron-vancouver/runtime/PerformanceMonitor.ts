export interface PerformanceFrameStats {
  fps: number;
  frameTimeMs: number;
  drawCallCount: number;
  visibleObjectCount: number;
  visibleChunkCount: number;
  culledObjectCount: number;
  collisionChecksPerFrame: number;
  lastSlowFrameReason: string | null;
}

export interface PerformanceMonitorOptions {
  debugPerformance?: boolean;
  slowFrameMs?: number;
}

export class PerformanceMonitor {
  private debugPerformance: boolean;
  private slowFrameMs: number;
  private frameStartMs = 0;
  private lastReportMs = 0;
  private collisionChecks = 0;
  private stats: PerformanceFrameStats = {
    fps: 0,
    frameTimeMs: 0,
    drawCallCount: 0,
    visibleObjectCount: 0,
    visibleChunkCount: 0,
    culledObjectCount: 0,
    collisionChecksPerFrame: 0,
    lastSlowFrameReason: null,
  };

  constructor(options: PerformanceMonitorOptions = {}) {
    this.debugPerformance = options.debugPerformance ?? false;
    this.slowFrameMs = options.slowFrameMs ?? 80;
  }

  setDebugPerformance(enabled: boolean): void {
    this.debugPerformance = enabled;
  }

  beginFrame(now = performance.now()): void {
    this.frameStartMs = now;
    this.collisionChecks = 0;
  }

  recordCollisionCheck(count = 1): void {
    this.collisionChecks += count;
  }

  endFrame(
    frame: Pick<PerformanceFrameStats, 'drawCallCount' | 'visibleObjectCount' | 'visibleChunkCount' | 'culledObjectCount'>,
    now = performance.now()
  ): PerformanceFrameStats {
    const frameTimeMs = Math.max(0, now - this.frameStartMs);
    const fps = frameTimeMs > 0 ? 1000 / frameTimeMs : 0;
    this.stats = {
      fps,
      frameTimeMs,
      drawCallCount: frame.drawCallCount,
      visibleObjectCount: frame.visibleObjectCount,
      visibleChunkCount: frame.visibleChunkCount,
      culledObjectCount: frame.culledObjectCount,
      collisionChecksPerFrame: this.collisionChecks,
      lastSlowFrameReason: this.detectSlowFrameReason(frameTimeMs, frame.drawCallCount, frame.visibleObjectCount),
    };
    this.reportIfNeeded(now);
    return this.snapshot();
  }

  snapshot(): PerformanceFrameStats {
    return { ...this.stats };
  }

  formatDebugLine(): string {
    const stats = this.stats;
    return [
      `fps=${stats.fps.toFixed(1)}`,
      `frame=${stats.frameTimeMs.toFixed(1)}ms`,
      `draw=${stats.drawCallCount}`,
      `visible=${stats.visibleObjectCount}`,
      `chunks=${stats.visibleChunkCount}`,
      `culled=${stats.culledObjectCount}`,
      `collision=${stats.collisionChecksPerFrame}`,
      stats.lastSlowFrameReason ? `slow=${stats.lastSlowFrameReason}` : null,
    ].filter(Boolean).join(' ');
  }

  private detectSlowFrameReason(frameTimeMs: number, drawCallCount: number, visibleObjectCount: number): string | null {
    if (frameTimeMs <= this.slowFrameMs) return null;
    if (drawCallCount > 1000) return 'draw-call-count';
    if (visibleObjectCount > 1000) return 'visible-object-count';
    return 'frame-time-spike';
  }

  private reportIfNeeded(now: number): void {
    if (!this.debugPerformance || now - this.lastReportMs < 500) return;
    this.lastReportMs = now;
    console.debug(`[CauldronPerf] ${this.formatDebugLine()}`);
  }
}
