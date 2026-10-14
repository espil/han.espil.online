import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { CollisionSystem } from '../runtime/CollisionSystem.ts';
import type { CauldronChunk, PixelScene } from '../engine/realityTypes.ts';

const root = resolve(import.meta.dirname, '..');
const webRoot = resolve(root, '..');
const appJs = await readFile(resolve(webRoot, 'app.js'), 'utf8');
const indexHtml = await readFile(resolve(webRoot, 'index.html'), 'utf8');
const runtimeVersion = await readFile(resolve(root, 'runtime/runtimeVersion.ts'), 'utf8');
const productionRuntime = await readFile(resolve(root, 'runtime/productionRuntime.browser.js'), 'utf8');
const scene = JSON.parse(await readFile(resolve(root, 'data/scenes/vancouver_demo.pixel_scene.json'), 'utf8')) as PixelScene;
const chunk = JSON.parse(await readFile(resolve(root, 'data/chunks/vancouver_000_000.chunk.json'), 'utf8')) as CauldronChunk;

assert.ok(runtimeVersion.includes('v0.3.1-production-wiring'), 'runtime version stamp missing');
assert.ok(productionRuntime.includes('CAULDRON_RUNTIME_VERSION'), 'browser runtime must expose version');
assert.ok(indexHtml.includes('cauldron-runtime-canvas'), 'production canvas must be mounted in DOM');
assert.ok(indexHtml.includes('productionRuntime.browser.js?v=cauldron-v0.3.1'), 'browser runtime script needs cache-busted wiring');
assert.ok(indexHtml.includes('app.js?v=cauldron-v0.3.1'), 'app.js needs v0.3.1 cache busting');
assert.ok(appJs.includes("VANCOUVER_SCENE_PATH = './cauldron-vancouver/data/scenes/vancouver_demo.pixel_scene.json'"), 'scene path must be web-safe relative');
assert.ok(appJs.includes("VANCOUVER_CHUNK_PATH = './cauldron-vancouver/data/chunks/vancouver_000_000.chunk.json'"), 'chunk path must be web-safe relative');
assert.equal(/C:\\Users\\|Desktop\\htdocs/.test(appJs), false, 'browser app must not fetch local Windows paths');
assert.ok(appJs.includes('Refusing silent old-map fallback'), 'missing scene/chunk must show visible error instead of silent fallback');
assert.ok(appJs.includes('[Cauldron] runtime version'), 'startup should log Cauldron runtime version');
assert.ok(appJs.includes('if (state.animationLoopRunning) return;'), 'animation loop guard missing');
assert.equal((appJs.match(/startCharacterLoop\(\);/g) || []).length, 1, 'startup should call startCharacterLoop once');
assert.equal(scene.mode, 'verticalData', 'Vancouver runtime scene must default to verticalData');
assert.ok(scene.renderCommands.some((command) => command.vertical), 'verticalData scene needs vertical building commands');

const collision = new CollisionSystem();
collision.setChunks([chunk]);
assert.equal(collision.debugProbe({ xMeters: 2, yMeters: 0 }).walkable, true, 'known road point should be walkable');
assert.equal(collision.debugProbe({ xMeters: 15, yMeters: 15 }).blocked, true, 'known building point should be blocked');
assert.equal(collision.debugProbe({ xMeters: 35, yMeters: 15 }).swimmable, true, 'known water point should be swimmable');
assert.equal(collision.canStandAt({ xMeters: 999, yMeters: 999 }), false, 'outside loaded chunks must not silently allow movement');

const missingMaskCollision = new CollisionSystem();
missingMaskCollision.setChunks([{ ...chunk, masks: undefined as unknown as CauldronChunk['masks'] }]);
assert.equal(missingMaskCollision.canStandAt({ xMeters: 2, yMeters: 0 }), false, 'missing chunk mask must block movement');
assert.deepEqual(
  {
    hasChunk: missingMaskCollision.debugProbe({ xMeters: 2, yMeters: 0 }).hasChunk,
    hasMask: missingMaskCollision.debugProbe({ xMeters: 2, yMeters: 0 }).hasMask,
    blocked: missingMaskCollision.debugProbe({ xMeters: 2, yMeters: 0 }).blocked,
  },
  { hasChunk: true, hasMask: false, blocked: true },
  'missing mask probe should expose safe fallback'
);

console.log(JSON.stringify({
  ok: true,
  runtimeVersion: 'v0.3.1-production-wiring',
  sceneMode: scene.mode,
  canvasMounted: indexHtml.includes('cauldron-runtime-canvas'),
  collisionProbe: {
    road: collision.debugProbe({ xMeters: 2, yMeters: 0 }),
    building: collision.debugProbe({ xMeters: 15, yMeters: 15 }),
    water: collision.debugProbe({ xMeters: 35, yMeters: 15 }),
    outside: collision.debugProbe({ xMeters: 999, yMeters: 999 }),
  },
}, null, 2));
