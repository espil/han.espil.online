import type { CauldronObject, ClassifiedFeature, ClassifiedTile, RawFeature, TerrainClass, TileId } from './types';

export const VANCOUVER_MVP_AREAS = [
  'Downtown Vancouver',
  'Coal Harbour',
  'Stanley Park east',
  'False Creek',
  'Yaletown',
  'Gastown',
  'Waterfront',
] as const;

export interface TileLoadRequest {
  tileId: TileId;
  rawFeatures: RawFeature[];
  terrainRules: Record<string, { walkable?: boolean; collision?: boolean; shadow?: boolean }>;
}

export function classifyFeature(feature: RawFeature): TerrainClass {
  const text = `${feature.properties.class ?? ''} ${feature.properties.type ?? ''} ${feature.properties.kind ?? ''} ${feature.properties.maki ?? ''}`.toLowerCase();
  const sourceProvider = feature.source.provider;

  if (/water|river|stream|bay|ocean|sea/.test(text)) return 'water';
  if (/bridge/.test(text)) return 'bridge';
  if (/footway|path|pedestrian|sidewalk/.test(text)) return 'footway';
  if (/motorway|primary|secondary|trunk/.test(text)) return 'road_primary';
  if (/road|residential|service|cycleway/.test(text)) return 'road_residential';
  if (/park|grass|green/.test(text)) return 'park';
  if (/plaza|square/.test(text)) return 'plaza';
  if (/cedar|fir|conifer|thuja|pseudotsuga/.test(text)) return 'tree_conifer';
  if (/tree|maple|acer|deciduous/.test(text)) return 'tree_deciduous';
  if (sourceProvider === 'overture' || /building|house|apartments|commercial/.test(text)) {
    return /house|residential/.test(text) ? 'building_house' : 'building_downtown';
  }
  return 'road_residential';
}

export function featureCentroid(feature: RawFeature): [number, number] {
  const geometry = feature.geometry;
  if (geometry.type === 'Point') return geometry.coordinates as [number, number];
  const coords = geometry.type === 'Polygon'
    ? geometry.coordinates.flat(1)
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat(2)
      : geometry.type === 'LineString'
        ? geometry.coordinates
        : [];
  if (!coords.length) return [0, 0];
  const sum = coords.reduce<[number, number]>((acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]], [0, 0]);
  return [sum[0] / coords.length, sum[1] / coords.length];
}

export function classifyTile(request: TileLoadRequest): ClassifiedTile {
  const features = request.rawFeatures.map<ClassifiedFeature>((feature) => {
    const terrainClass = classifyFeature(feature);
    const rule = request.terrainRules[terrainClass] ?? {};
    return {
      ...feature,
      terrainClass,
      walkable: Boolean(rule.walkable),
      collision: Boolean(rule.collision),
      shadow: Boolean(rule.shadow),
      heightEstimateM: estimateHeight(feature, terrainClass),
      entranceCandidates: terrainClass.startsWith('building') ? [featureCentroid(feature)] : [],
    };
  });

  return {
    id: request.tileId,
    bounds: [[0, 0], [0, 0]],
    features,
    objects: features.map(toCauldronObject),
    generatedAt: new Date().toISOString(),
  };
}

function estimateHeight(feature: RawFeature, terrainClass: TerrainClass): number | undefined {
  const height = Number(feature.properties.height ?? feature.properties.render_height);
  if (Number.isFinite(height) && height > 0) return height;
  const floors = Number(feature.properties.num_floors ?? feature.properties.levels);
  if (Number.isFinite(floors) && floors > 0) return floors * 3;
  if (terrainClass === 'building_downtown') return 18;
  if (terrainClass === 'building_house') return 9;
  return undefined;
}

function toCauldronObject(feature: ClassifiedFeature): CauldronObject {
  const terrainToType: Record<string, CauldronObject['type']> = {
    water: 'water',
    shoreline: 'water',
    road_primary: 'road',
    road_residential: 'road',
    footway: 'road',
    building_downtown: 'building',
    building_house: 'building',
    park: 'park',
    tree_conifer: 'tree',
    tree_deciduous: 'tree',
    plaza: 'road',
    bridge: 'road',
  };

  return {
    id: feature.id,
    type: terrainToType[feature.terrainClass] ?? 'poi',
    lngLat: featureCentroid(feature),
    terrainClass: feature.terrainClass,
    collision: feature.collision,
    sourceRefs: [feature.source],
    properties: {
      ...feature.properties,
      heightEstimateM: feature.heightEstimateM,
      entranceCandidates: feature.entranceCandidates,
    },
  };
}
