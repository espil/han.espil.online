import type { BuildingHeightSource, BuildingVerticalModel } from './realityTypes.ts';

const FLOOR_HEIGHTS = {
  residential: 3.0,
  commercial: 4.0,
  mixed_use: 3.5,
  industrial: 5.0,
  unknown: 3.2,
} as const;

const ESTIMATED_HEIGHTS = {
  detached_house: 6,
  lowrise: 12,
  midrise: 30,
  highrise: 80,
  unknown_building: 9,
} as const;

export function buildVerticalModel(properties: Record<string, unknown>): BuildingVerticalModel {
  const minHeightMeters = parseMeters(firstDefined(
    properties.min_height,
    properties.min_height_m,
    properties['building:min_height']
  )) ?? minHeightFromLevels(properties);
  const explicitHeight = parseMeters(firstDefined(
    properties.height,
    properties.height_m,
    properties['building:height']
  ));
  const buildingUse = detectBuildingUse(properties);
  const floorHeightMeters = floorHeightFor(buildingUse);
  const levels = parseLevels(firstDefined(properties['building:levels'], properties.levels));

  if (explicitHeight !== null) {
    return vertical(explicitHeight, 'explicit_height', levels, floorHeightMeters, minHeightMeters);
  }

  if (levels !== null) {
    return vertical(levels * floorHeightMeters, 'building_levels', levels, floorHeightMeters, minHeightMeters);
  }

  const lidarHeight = parseMeters(firstDefined(
    properties.lidar_height,
    properties.lidar_height_m,
    properties.lidar_derived_height,
    properties.lidar_derived_height_m
  ));
  if (lidarHeight !== null) {
    return vertical(lidarHeight, 'lidar', levels, floorHeightMeters, minHeightMeters);
  }

  const estimated = estimateBuildingHeight(properties);
  if (estimated !== null) {
    return vertical(estimated, 'estimated', levels, floorHeightMeters, minHeightMeters);
  }

  return vertical(null, 'unknown', levels, floorHeightMeters, minHeightMeters);
}

export function parseMeters(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const normalized = String(value).trim().toLowerCase().replace(',', '.');
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)\s*(m|meter|meters|metre|metres)?$/);
  if (!match) return null;
  const numberValue = Number(match[1]);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

export function parseLevels(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = typeof value === 'number' ? value : Number(String(value).trim().match(/^-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

export function heightSourceTrust(source: BuildingHeightSource): 'unknown' | 'estimated' | 'trusted' | 'lidar' {
  if (source === 'lidar') return 'lidar';
  if (source === 'explicit_height' || source === 'building_levels') return 'trusted';
  if (source === 'estimated') return 'estimated';
  return 'unknown';
}

function vertical(
  heightMeters: number | null,
  heightSource: BuildingHeightSource,
  buildingLevels: number | null,
  floorHeightMeters: number | null,
  minHeightMeters: number
): BuildingVerticalModel {
  return {
    height_meters: heightMeters,
    height_source: heightSource,
    building_levels: buildingLevels,
    floor_height_meters: floorHeightMeters,
    extrusion_height_units: Math.max(0, heightMeters ?? 0),
    min_height_meters: minHeightMeters,
  };
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function minHeightFromLevels(properties: Record<string, unknown>): number {
  const minLevel = parseLevels(properties['building:min_level']);
  if (minLevel === null) return 0;
  return minLevel * floorHeightFor(detectBuildingUse(properties));
}

function floorHeightFor(buildingUse: keyof typeof FLOOR_HEIGHTS): number {
  return FLOOR_HEIGHTS[buildingUse] ?? FLOOR_HEIGHTS.unknown;
}

function detectBuildingUse(properties: Record<string, unknown>): keyof typeof FLOOR_HEIGHTS {
  const text = [
    properties.building,
    properties.building_use,
    properties.use,
    properties.landuse,
    properties.amenity,
    properties.shop,
    properties.office,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/industrial|warehouse|manufacturing|factory/.test(text)) return 'industrial';
  if (/mixed|mixed_use|mixed-use/.test(text)) return 'mixed_use';
  if (/commercial|retail|office|shop|restaurant|cafe|hotel/.test(text)) return 'commercial';
  if (/residential|apartments|house|detached|semidetached|terrace|condo/.test(text)) return 'residential';
  return 'unknown';
}

function estimateBuildingHeight(properties: Record<string, unknown>): number | null {
  const text = [
    properties.building,
    properties.building_type,
    properties.type,
    properties.name,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/detached|house|bungalow|cabin/.test(text)) return ESTIMATED_HEIGHTS.detached_house;
  if (/lowrise|low-rise/.test(text)) return ESTIMATED_HEIGHTS.lowrise;
  if (/midrise|mid-rise|commercial|retail|office|apartments/.test(text)) return ESTIMATED_HEIGHTS.midrise;
  if (/highrise|high-rise|tower|skyscraper/.test(text)) return ESTIMATED_HEIGHTS.highrise;
  if (String(properties.building ?? '').trim()) return ESTIMATED_HEIGHTS.unknown_building;
  return null;
}
