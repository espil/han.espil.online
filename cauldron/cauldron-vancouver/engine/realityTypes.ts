export type LngLat = [number, number];
export type CauldronSource = 'osm' | 'public_trees' | 'overture' | 'lidar' | 'user_capture';
export type CauldronClass = 'road' | 'building' | 'tree' | 'water' | 'park' | 'terrain' | 'poi' | 'unknown';
export type CollisionType = 'none' | 'hard' | 'soft' | 'water';
export type RenderLayer = 'ground' | 'ecosystem' | 'structure' | 'overlay';
export type SourceTrust = 'unknown' | 'user' | 'official' | 'system';
export type BuildingHeightSource = 'explicit_height' | 'building_levels' | 'lidar' | 'estimated' | 'unknown';

export type Geometry =
  | { type: 'Point'; coordinates: LngLat }
  | { type: 'LineString'; coordinates: LngLat[] }
  | { type: 'Polygon'; coordinates: LngLat[][] }
  | { type: 'MultiPolygon'; coordinates: LngLat[][][] };

export interface GeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  geometry: Geometry;
  properties?: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface LocalPoint {
  xMeters: number;
  yMeters: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface LocalBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CauldronFeature {
  id: string;
  source: CauldronSource;
  geometry: Geometry;
  properties: Record<string, unknown>;
  cauldronClass: CauldronClass;
  verificationLevel: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface CauldronObject {
  id: string;
  source: CauldronSource;
  cauldronClass: Exclude<CauldronClass, 'unknown'>;
  geometry: Geometry;
  world: {
    localBounds: LocalBounds;
    centroid: LocalPoint;
  };
  gameplay: {
    walkable: boolean;
    blocked: boolean;
    swimmable: boolean;
    buildable: boolean;
    interactable: boolean;
    spawnAllowed: boolean;
    collisionType: CollisionType;
  };
  render: {
    layer: RenderLayer;
    styleKey: string;
    spriteHint?: string;
    debugColor: string;
  };
  building?: {
    vertical: BuildingVerticalModel;
  };
  verification: {
    level: 0 | 1 | 2 | 3 | 4 | 5;
    sourceTrust: SourceTrust;
  };
  properties: Record<string, unknown>;
}

export interface RenderCommand {
  id: string;
  objectId: string;
  spriteType: CauldronObject['cauldronClass'];
  layer: RenderLayer;
  styleKey: string;
  debugColor: string;
  localBounds: LocalBounds;
  points: LocalPoint[];
  footprint?: Geometry;
  blocked: boolean;
  vertical?: BuildingVerticalModel;
}

export interface MaskGrid {
  chunkId: string;
  cellSizeMeters: number;
  width: number;
  height: number;
  walkable: boolean[][];
  blocked: boolean[][];
  swimmable: boolean[][];
  buildable: boolean[][];
}

export interface CauldronChunk {
  chunkId: string;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  localBounds: LocalBounds;
  features: CauldronObject[];
  masks: MaskGrid;
  renderCommands: RenderCommand[];
}

export interface PixelScene {
  sceneId: string;
  center: LngLat;
  metersPerPixel: number;
  mode: 'verticalData';
  renderCommands: RenderCommand[];
  debugPalette: Record<string, string>;
}

export interface CompiledCauldronDocument {
  schema: 'cauldron.compiled.v0.2';
  mode: 'verticalData';
  center: LngLat;
  generatedAt: string;
  objects: CauldronObject[];
}

export interface CompileOptions {
  center: LngLat;
  metersPerPixel: number;
}

export interface RuntimeBuildResult {
  compiled: CompiledCauldronDocument;
  chunks: CauldronChunk[];
  scenes: PixelScene[];
}

export interface BuildingVerticalModel {
  height_meters: number | null;
  height_source: BuildingHeightSource;
  building_levels: number | null;
  floor_height_meters: number | null;
  extrusion_height_units: number;
  min_height_meters: number;
}
