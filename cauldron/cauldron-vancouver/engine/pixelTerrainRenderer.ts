import type { PixelizedTile, TerrainClass } from './types';

export interface PixelRendererOptions {
  canvas: HTMLCanvasElement;
  terrainRules: Record<string, { pixel?: { base?: string; highlight?: string; shadow?: string }; z_index?: number }>;
}

export class PixelTerrainRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly terrainRules: PixelRendererOptions['terrainRules'];

  constructor(options: PixelRendererOptions) {
    const context = options.canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable.');
    this.canvas = options.canvas;
    this.context = context;
    this.terrainRules = options.terrainRules;
  }

  resize(width: number, height: number, devicePixelRatio = window.devicePixelRatio || 1): void {
    const scale = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.max(1, Math.round(width * scale));
    this.canvas.height = Math.max(1, Math.round(height * scale));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
  }

  draw(tile: PixelizedTile): void {
    const orderedCells = [...tile.cells].sort((a, b) => a.zIndex - b.zIndex);
    for (const cell of orderedCells) {
      this.context.fillStyle = cell.color || this.colorFor(cell.terrainClass);
      this.context.fillRect(cell.x, cell.y, 1, 1);
    }
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private colorFor(terrainClass: TerrainClass): string {
    return this.terrainRules[terrainClass]?.pixel?.base ?? '#ff00ff';
  }
}

export function terrainToPixelColor(
  terrainClass: TerrainClass,
  terrainRules: PixelRendererOptions['terrainRules']
): string {
  return terrainRules[terrainClass]?.pixel?.base ?? '#ff00ff';
}
