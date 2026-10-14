import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const STATIC_CONFIG_PATH = path.join(ROOT, 'static-config.js');
const CAPTURE_DIR = path.join(ROOT, 'cauldron-vancouver', 'data', 'captures');
const DEFAULT_STYLE = 'mapbox://styles/quadclipse/cmos12qyt008901rgg1eka1xm';
const DEFAULT_CITY = 'Vancouver';
const DEFAULT_RADIUS_METERS = 3000;
const DEFAULT_SIZE = 1280;

const args = parseArgs(process.argv.slice(2));
const city = args.city || DEFAULT_CITY;
const radiusMeters = Number(args.radius || DEFAULT_RADIUS_METERS);
const size = Number(args.size || DEFAULT_SIZE);
const style = args.style || DEFAULT_STYLE;
const token = args.token || await readMapboxToken();

if (!token) {
  throw new Error('Mapbox token missing. Pass --token or configure static-config.js.');
}

await fs.mkdir(CAPTURE_DIR, { recursive: true });

const center = await geocodeCity(city, token);
const zoom = zoomForRadius(center.center[1], radiusMeters, size);
const slug = slugify(city);
const stylePath = style.replace('mapbox://styles/', '');
const styleSlug = slugify(stylePath.replace('/', '_'));
const imageName = `${slug}_${radiusMeters}m_${styleSlug}.png`;
const jsonName = `${slug}_${radiusMeters}m_${styleSlug}.capture.json`;
const imagePath = path.join(CAPTURE_DIR, imageName);
const jsonPath = path.join(CAPTURE_DIR, jsonName);
const imageUrl = `https://api.mapbox.com/styles/v1/${stylePath}/static/${center.center[0]},${center.center[1]},${zoom.toFixed(2)},0/${size}x${size}?access_token=${encodeURIComponent(token)}`;

const response = await fetch(imageUrl);
if (!response.ok) {
  throw new Error(`Mapbox static image failed: HTTP ${response.status} ${await response.text()}`);
}
const bytes = new Uint8Array(await response.arrayBuffer());
await fs.writeFile(imagePath, bytes);

const capture = {
  schema: 'cauldron.mapboxCapture.v0.1',
  city,
  center: center.center,
  placeName: center.placeName,
  radiusMeters,
  diameterMeters: radiusMeters * 2,
  sizePixels: [size, size],
  metersPerPixel: (radiusMeters * 2) / size,
  zoom,
  bearing: 0,
  style,
  source: 'mapbox-static-images-api',
  imagePath: `./cauldron-vancouver/data/captures/${imageName}`,
  generatedAt: new Date().toISOString(),
};

await fs.writeFile(jsonPath, `${JSON.stringify(capture, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  city,
  center: capture.center,
  radiusMeters,
  zoom: capture.zoom,
  imagePath,
  jsonPath,
  bytes: bytes.length,
}, null, 2));

async function readMapboxToken() {
  try {
    const text = await fs.readFile(STATIC_CONFIG_PATH, 'utf8');
    return text.match(/mapboxToken:\s*['"]([^'"]+)['"]/)?.[1] || '';
  } catch {
    return '';
  }
}

async function geocodeCity(query, accessToken) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&types=place,locality&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Mapbox geocoding failed: HTTP ${response.status}`);
  const json = await response.json();
  const feature = json.features?.[0];
  if (!feature?.center) throw new Error(`No Mapbox geocoding result for city: ${query}`);
  return {
    center: feature.center,
    placeName: feature.place_name || query,
  };
}

function zoomForRadius(latitude, radiusMeters, sizePixels) {
  const metersPerPixel = (radiusMeters * 2) / sizePixels;
  const earthCircumference = 156543.03392;
  return Math.log2((earthCircumference * Math.cos(latitude * Math.PI / 180)) / metersPerPixel);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : 'true';
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'city';
}
