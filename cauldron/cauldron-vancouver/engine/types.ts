export type LngLat = [number, number];
export type TileId = string;

export type TerrainClass =
  | 'water'
  | 'shoreline'
  | 'road_primary'
  | 'road_residential'
  | 'footway'
  | 'building_downtown'
  | 'building_house'
  | 'park'
  | 'tree_conifer'
  | 'tree_deciduous'
  | 'plaza'
  | 'bridge';

export interface SourceRef {
  id: string;
  provider: 'osm' | 'overture' | 'city_of_vancouver' | 'metro_vancouver' | 'lidar' | 'user_capture';
  verification: 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5';
}

export interface RawFeature {
  id: string;
  source: SourceRef;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
}

export interface ClassifiedFeature extends RawFeature {
  terrainClass: TerrainClass;
  walkable: boolean;
  collision: boolean;
  shadow: boolean;
  heightEstimateM?: number;
  entranceCandidates?: LngLat[];
}

export interface CauldronObject {
  id: string;
  type: 'building' | 'road' | 'tree' | 'water' | 'park' | 'poi' | 'verification_object';
  lngLat: LngLat;
  terrainClass: TerrainClass;
  collision: boolean;
  sourceRefs: SourceRef[];
  properties: Record<string, unknown>;
}

export interface ClassifiedTile {
  id: TileId;
  bounds: [LngLat, LngLat];
  features: ClassifiedFeature[];
  objects: CauldronObject[];
  generatedAt: string;
}

export interface PixelTerrainCell {
  x: number;
  y: number;
  terrainClass: TerrainClass;
  color: string;
  zIndex: number;
  collision: boolean;
}

export interface PixelizedTile {
  id: TileId;
  size: number;
  cells: PixelTerrainCell[];
  objects: CauldronObject[];
}

export interface CollisionShape {
  id: string;
  type: 'polygon' | 'circle' | 'line_buffer';
  terrainClass: TerrainClass;
  collision: boolean;
  coordinates: LngLat[] | LngLat;
  radiusM?: number;
}

export interface CaptureEvidence {
  capture_type: 'photo' | 'video' | 'note';
  lat: number;
  lng: number;
  heading?: number;
  timestamp: string;
  subject: 'tree' | 'building' | 'poi' | 'road' | 'water' | 'other';
  detected_object?: string;
  user_note?: string;
  verification_level: 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5';
  media_uri?: string;
}
