import type { CauldronClass, CauldronFeature, CauldronObject, CollisionType, RenderLayer, SourceTrust } from './realityTypes.ts';

export interface SemanticProfile {
  cauldronClass: CauldronClass;
  walkable: boolean;
  blocked: boolean;
  swimmable: boolean;
  buildable: boolean;
  interactable: boolean;
  spawnAllowed: boolean;
  collisionType: CollisionType;
  layer: RenderLayer;
  styleKey: string;
  spriteHint?: string;
  debugColor: string;
  sourceTrust: SourceTrust;
}

export function classifySemantics(feature: CauldronFeature): SemanticProfile {
  const props = feature.properties;
  const treeText = [
    props.species,
    props.common_name,
    props.natural,
    props.cauldronClass,
  ].filter(Boolean).join(' ').toLowerCase();
  const text = [
    props.highway,
    props.footway,
    props.cycleway,
    props.building,
    props.natural,
    props.water,
    props.leisure,
    props.amenity,
    props.shop,
    props.tourism,
    props.species,
    props.common_name,
    props.bridge,
  ].filter(Boolean).join(' ').toLowerCase();

  if (feature.source === 'public_trees' || /tree|maple|acer|cedar|thuja|fir|pseudotsuga/.test(treeText)) {
    return profile('tree', false, false, false, false, true, false, 'soft', 'ecosystem', treeStyle(treeText), 'tree_cluster', '#1fa34a', trustFor(feature));
  }
  const buildingTag = String(props.building ?? '').trim().toLowerCase();
  if ((buildingTag.length > 0 && buildingTag !== 'no') || feature.source === 'overture') {
    return profile('building', false, true, false, false, true, false, 'hard', 'structure', buildingStyle(text), 'building_block', '#24242b', trustFor(feature));
  }
  if (/water|river|stream|bay|ocean|sea|lake/.test(text)) {
    return profile('water', false, false, true, false, false, false, 'water', 'ground', 'vancouver_deep_blue_water', undefined, '#1e73be', trustFor(feature));
  }
  if (/park|grass|garden|forest|recreation_ground/.test(text)) {
    return profile('park', true, false, false, true, false, true, 'none', 'ground', 'vancouver_soft_grass', undefined, '#8bd66b', trustFor(feature));
  }
  if (/primary|secondary|residential|service|footway|path|cycleway|pedestrian|road/.test(text) || props.highway) {
    return profile('road', true, false, false, false, false, true, 'none', 'ground', roadStyle(text), undefined, '#7c7f86', trustFor(feature));
  }
  if (/restaurant|cafe|shop|museum|landmark|tourism/.test(text)) {
    return profile('poi', true, false, false, false, true, false, 'none', 'overlay', 'vancouver_poi_marker', 'poi_marker', '#ffd45c', trustFor(feature));
  }
  return profile('unknown', false, false, false, false, false, false, 'none', 'overlay', 'debug_unknown', undefined, '#ff00ff', 'unknown');
}

export function inferCauldronClass(properties: Record<string, unknown>, source: CauldronFeature['source']): CauldronClass {
  return classifySemantics({
    id: 'infer',
    source,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties,
    cauldronClass: 'unknown',
    verificationLevel: 0,
  }).cauldronClass;
}

export function gameplaySummary(object: CauldronObject): string {
  return [
    object.cauldronClass,
    object.gameplay.walkable ? 'walkable' : 'not-walkable',
    object.gameplay.blocked ? 'blocked' : 'not-blocked',
    object.gameplay.swimmable ? 'swimmable' : 'not-swimmable',
    object.gameplay.collisionType,
  ].join(':');
}

function profile(
  cauldronClass: CauldronClass,
  walkable: boolean,
  blocked: boolean,
  swimmable: boolean,
  buildable: boolean,
  interactable: boolean,
  spawnAllowed: boolean,
  collisionType: CollisionType,
  layer: RenderLayer,
  styleKey: string,
  spriteHint: string | undefined,
  debugColor: string,
  sourceTrust: SourceTrust
): SemanticProfile {
  return {
    cauldronClass,
    walkable,
    blocked,
    swimmable,
    buildable,
    interactable,
    spawnAllowed,
    collisionType,
    layer,
    styleKey,
    spriteHint,
    debugColor,
    sourceTrust,
  };
}

function roadStyle(text: string): string {
  if (/primary|secondary|trunk/.test(text)) return 'vancouver_dark_asphalt_wide';
  if (/footway|path|pedestrian/.test(text)) return 'vancouver_light_stone_path';
  return 'vancouver_soft_gray_street';
}

function buildingStyle(text: string): string {
  if (/house|detached|residential/.test(text)) return 'residential_wood_house';
  if (/brick|heritage|gastown/.test(text)) return 'heritage_brick_lowrise';
  return 'downtown_glass_midrise';
}

function treeStyle(text: string): string {
  if (/cedar|thuja|fir|pseudotsuga|conifer/.test(text)) return 'cedar_cluster';
  return 'maple_cluster';
}

function trustFor(feature: CauldronFeature): SourceTrust {
  if (feature.source === 'user_capture') return 'user';
  if (feature.source === 'osm' || feature.source === 'public_trees' || feature.source === 'overture') return 'official';
  if (feature.source === 'lidar') return 'system';
  return 'unknown';
}
