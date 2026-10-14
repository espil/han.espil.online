import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { buildCauldronRuntime, summarizeRuntime } from '../engine/cauldronRuntime.ts';
import { maskStats } from '../engine/maskBuilder.ts';
import { footprintBottomScreenY, renderBandForCommand, stableSortRenderCommands } from '../engine/pixelSceneGenerator.ts';
import { CollisionSystem } from '../runtime/CollisionSystem.ts';
import type { GeoJsonFeatureCollection } from '../engine/realityTypes.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const rawPath = resolve(root, 'data/raw/vancouver_demo.raw.geojson');
const compiledPath = resolve(root, 'data/compiled/vancouver_demo.compiled.json');
const chunkPath = resolve(root, 'data/chunks/vancouver_000_000.chunk.json');
const scenePath = resolve(root, 'data/scenes/vancouver_demo.pixel_scene.json');

const raw = JSON.parse(await readFile(rawPath, 'utf8')) as GeoJsonFeatureCollection;
const result = buildCauldronRuntime(raw, {
  center: [-123.1207, 49.2827],
  metersPerPixel: 1,
  chunkSizeMeters: 50,
  cellSizeMeters: 1,
});
const summary = summarizeRuntime(result);
const primaryChunk = result.chunks.find((chunk) => chunk.chunkId === 'vancouver_000_000');

assert.equal(summary.objects, 9, 'demo should compile nine CauldronObjects');
assert.ok(summary.classes.road >= 1, 'road class missing');
assert.equal(summary.classes.building, 4, 'building class count mismatch');
assert.ok(summary.classes.tree >= 1, 'tree class missing');
assert.ok(summary.classes.water >= 1, 'water class missing');
assert.ok(summary.classes.park >= 1, 'park class missing');
assert.ok(primaryChunk, 'expected vancouver_000_000 chunk');

const stats = maskStats(primaryChunk!.masks);
assert.equal(primaryChunk!.masks.width, 50, 'chunk width should be 50 cells');
assert.equal(primaryChunk!.masks.height, 50, 'chunk height should be 50 cells');
assert.ok(stats.walkable > 0, 'walkable mask should contain true cells');
assert.ok(stats.blocked > 0, 'blocked mask should contain true cells');
assert.ok(stats.swimmable > 0, 'swimmable mask should contain true cells');
assert.ok(primaryChunk!.renderCommands.length >= 6, 'render commands should be generated');

const objects = result.compiled.objects;
const buildingExplicit = objects.find((object) => object.id === 'overture-building-demo');
const buildingHeightM = objects.find((object) => object.id === 'osm-building-height-m-demo');
const buildingLevels = objects.find((object) => object.id === 'osm-building-levels-demo');
const buildingEstimated = objects.find((object) => object.id === 'osm-building-estimated-demo');
const nonBuildingsWithVertical = objects.filter((object) => object.cauldronClass !== 'building' && object.building?.vertical);
const buildingCommands = result.scenes[0].renderCommands.filter((command) => command.spriteType === 'building');
const heightStats = buildingHeightStats(objects);
const renderOrder = result.scenes[0].renderCommands.map((command) => command.spriteType);
const renderBands = result.scenes[0].renderCommands.map((command) => renderBandForCommand(command));

assert.equal(buildingExplicit?.building?.vertical.height_meters, 30, 'height "30" should become 30 meters');
assert.equal(buildingExplicit?.building?.vertical.height_source, 'explicit_height');
assert.equal(buildingHeightM?.building?.vertical.height_meters, 30, 'height "30 m" should become 30 meters');
assert.equal(buildingHeightM?.building?.vertical.height_source, 'explicit_height');
assert.equal(buildingLevels?.building?.vertical.height_meters, 40, '10 commercial levels should become 40 meters');
assert.equal(buildingLevels?.building?.vertical.height_source, 'building_levels');
assert.equal(buildingLevels?.building?.vertical.floor_height_meters, 4);
assert.equal(buildingLevels?.building?.vertical.building_levels, 10);
assert.equal(buildingEstimated?.building?.vertical.height_meters, 6, 'detached building should receive estimated height');
assert.equal(buildingEstimated?.building?.vertical.height_source, 'estimated');
assert.equal(nonBuildingsWithVertical.length, 0, 'road/water/tree/park/poi must not receive building vertical data');
assert.equal(result.scenes[0].mode, 'verticalData', 'pixel scene must be verticalData mode');
assert.equal(buildingCommands.length, 4, 'verticalData mode should create building render commands');
assert.ok(buildingCommands.every((command) => command.vertical?.extrusion_height_units && command.blocked), 'building commands need extrusion and blocked footprint');
assert.deepEqual(renderOrder.slice(0, 4), ['road', 'water', 'park', 'tree'], 'ground/surface/ecosystem order should be stable');
assert.equal(renderOrder.at(-1), 'poi', 'overlay/debug commands should render last');
assert.deepEqual(renderBands, [...renderBands].sort((a, b) => a - b), 'render bands should be globally ordered');
assert.deepEqual(
  buildingCommands.map((command) => footprintBottomScreenY(command)),
  [...buildingCommands.map((command) => footprintBottomScreenY(command))].sort((a, b) => a - b),
  'buildings should sort by footprint bottom screenY'
);
assert.deepEqual(
  stableSortRenderCommands(buildingCommands).map((command) => command.id),
  buildingCommands.map((command) => command.id),
  'verticalData render sort should be stable when commands are already ordered'
);
const equalDepthBuildingCommands = buildingCommands.slice(0, 3).map((command, index) => ({
  ...command,
  id: `stable-depth-${index}`,
  objectId: `stable-depth-${index}`,
  localBounds: { ...command.localBounds, minY: 0, maxY: 10 },
}));
assert.deepEqual(
  stableSortRenderCommands(equalDepthBuildingCommands).map((command) => command.id),
  equalDepthBuildingCommands.map((command) => command.id),
  'verticalData render sort should preserve input order when depth keys tie'
);

const collision = new CollisionSystem();
collision.setChunks([primaryChunk!]);
assert.equal(collision.canStandAt({ xMeters: 2, yMeters: 0 }), true, 'road cell should be standable');
assert.equal(collision.canStandAt({ xMeters: 15, yMeters: 15 }), false, 'building cell should block standing');
assert.equal(collision.canSwimAt({ xMeters: 35, yMeters: 15 }), true, 'water cell should be swimmable');

await mkdir(dirname(compiledPath), { recursive: true });
await mkdir(dirname(chunkPath), { recursive: true });
await mkdir(dirname(scenePath), { recursive: true });
await writeFile(compiledPath, JSON.stringify(result.compiled, null, 2), 'utf8');
await writeFile(chunkPath, JSON.stringify(primaryChunk, null, 2), 'utf8');
await writeFile(scenePath, JSON.stringify(result.scenes[0], null, 2), 'utf8');

console.log(JSON.stringify({
  ok: true,
  summary,
  heightStats,
  maskStats: stats,
  outputs: {
    compiledPath,
    chunkPath,
    scenePath,
  },
}, null, 2));

function buildingHeightStats(objects: typeof result.compiled.objects) {
  return objects
    .filter((object) => object.cauldronClass === 'building')
    .reduce((acc, object) => {
      const source = object.building?.vertical.height_source ?? 'unknown';
      if (source === 'explicit_height') acc.explicit += 1;
      else if (source === 'building_levels') acc.levelDerived += 1;
      else if (source === 'estimated') acc.estimated += 1;
      else if (source === 'unknown') acc.unknown += 1;
      else if (source === 'lidar') acc.lidar += 1;
      return acc;
    }, {
      explicit: 0,
      levelDerived: 0,
      estimated: 0,
      unknown: 0,
      lidar: 0,
    });
}
