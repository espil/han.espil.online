import { CoordinateEngine, VANCOUVER_CENTER } from './coordinateEngine.ts';
import { buildVerticalModel, heightSourceTrust } from './buildingHeightModel.ts';
import { classifySemantics } from './semanticClassifier.ts';
import type { CauldronFeature, CauldronObject, CauldronSource, CompiledCauldronDocument, CompileOptions, GeoJsonFeature, GeoJsonFeatureCollection } from './realityTypes.ts';

export interface RealityCompilerOptions extends Partial<CompileOptions> {
  defaultSource?: CauldronSource;
}

export function compileFeatureCollection(
  collection: GeoJsonFeatureCollection,
  options: RealityCompilerOptions = {}
): CauldronObject[] {
  const center = options.center ?? VANCOUVER_CENTER;
  const coordinateEngine = new CoordinateEngine({
    center,
    metersPerPixel: options.metersPerPixel ?? 1,
  });

  return collection.features.map((feature, index) => {
    const cauldronFeature = toCauldronFeature(feature, index, options.defaultSource ?? 'osm');
    const semantic = classifySemantics(cauldronFeature);
    const cauldronClass = semantic.cauldronClass === 'unknown' ? 'terrain' : semantic.cauldronClass;
    const localBounds = coordinateEngine.localBoundsFor(cauldronFeature.geometry);
    const centroid = coordinateEngine.centroidFor(cauldronFeature.geometry);
    const vertical = cauldronClass === 'building' ? buildVerticalModel(cauldronFeature.properties) : undefined;
    return {
      id: cauldronFeature.id,
      source: cauldronFeature.source,
      cauldronClass,
      geometry: cauldronFeature.geometry,
      world: { localBounds, centroid },
      gameplay: {
        walkable: semantic.walkable,
        blocked: semantic.blocked,
        swimmable: semantic.swimmable,
        buildable: semantic.buildable,
        interactable: semantic.interactable,
        spawnAllowed: semantic.spawnAllowed,
        collisionType: semantic.collisionType,
      },
      render: {
        layer: semantic.layer,
        styleKey: semantic.styleKey,
        spriteHint: semantic.spriteHint,
        debugColor: vertical ? buildingDebugColor(vertical.height_source) : semantic.debugColor,
      },
      building: vertical ? { vertical } : undefined,
      verification: {
        level: cauldronFeature.verificationLevel,
        sourceTrust: semantic.sourceTrust,
      },
      properties: cauldronFeature.properties,
    };
  });
}

export function compileToDocument(collection: GeoJsonFeatureCollection, options: RealityCompilerOptions = {}): CompiledCauldronDocument {
  const center = options.center ?? VANCOUVER_CENTER;
  return {
    schema: 'cauldron.compiled.v0.2',
    mode: 'verticalData',
    center,
    generatedAt: new Date().toISOString(),
    objects: compileFeatureCollection(collection, options),
  };
}

function buildingDebugColor(heightSource: ReturnType<typeof buildVerticalModel>['height_source']): string {
  const trust = heightSourceTrust(heightSource);
  if (trust === 'lidar') return '#7be7ff';
  if (trust === 'trusted') return '#4a6274';
  if (trust === 'estimated') return '#666b70';
  return '#8a8a8a';
}

function toCauldronFeature(feature: GeoJsonFeature, index: number, defaultSource: CauldronSource): CauldronFeature {
  const properties = feature.properties ?? {};
  const source = normalizeSource(String(properties.source ?? properties.cauldron_source ?? defaultSource));
  return {
    id: String(feature.id ?? properties.id ?? `${source}:${index}`),
    source,
    geometry: feature.geometry,
    properties,
    cauldronClass: 'unknown',
    verificationLevel: normalizeVerification(properties.verificationLevel ?? properties.verification ?? trustDefault(source)),
  };
}

function normalizeSource(source: string): CauldronSource {
  if (source === 'public_trees' || source === 'overture' || source === 'lidar' || source === 'user_capture' || source === 'osm') return source;
  if (source.includes('tree')) return 'public_trees';
  return 'osm';
}

function normalizeVerification(value: unknown): 0 | 1 | 2 | 3 | 4 | 5 {
  const numberValue = typeof value === 'string' && value.startsWith('V') ? Number(value.slice(1)) : Number(value);
  if ([0, 1, 2, 3, 4, 5].includes(numberValue)) return numberValue as 0 | 1 | 2 | 3 | 4 | 5;
  return 0;
}

function trustDefault(source: CauldronSource): number {
  if (source === 'public_trees') return 3;
  if (source === 'overture' || source === 'osm') return 4;
  if (source === 'lidar') return 4;
  if (source === 'user_capture') return 1;
  return 0;
}
