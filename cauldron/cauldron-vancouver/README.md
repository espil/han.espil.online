# Cauldron Vancouver Server Skeleton

This folder is the Vancouver MVP data and runtime structure for Cauldron.

The goal is not to generate a fake world. Vancouver remains geographically recognizable, and real data becomes game objects through a deterministic pipeline:

```text
Raw Data
  OSM / Overture / Vancouver Open Data / LiDAR / Public Trees
    -> Normalizer
      coordinates, duplicates, schemas
    -> Tile Classifier
      water / road / building / park / forest / slope / plaza / bridge
    -> Pixelizer
      terrain classes to pixel terrain style
    -> Cauldron Tile Cache
      z/x/y or chunk_id
    -> Runtime Renderer
      MapLibre base + Canvas/WebGL pixel overlay
    -> Gameplay Layer
      character, collision, NPC, posts, events, verification objects
```

## MVP Bounds

Start with a compact, high-density Vancouver area:

- Downtown Vancouver
- Coal Harbour
- Stanley Park east side
- False Creek
- Yaletown
- Gastown
- Waterfront

## Runtime Contract

- Base map: `MapLibre GL JS` with vector tiles or PMTiles.
- Pixel layer: `Canvas` or `WebGL` overlay above the map.
- Storage/cache: chunked `raw`, `classified`, and `pixelized` tiles.
- Gameplay: collision, interaction, POI, ecosystem, and verification objects are built from classified chunks.

## Runtime Performance Rules

- No `GeoJSON` parsing during gameplay; runtime loads precompiled `data/chunks/*.chunk.json` and `data/scenes/*.pixel_scene.json`.
- No semantic classifier, mask generation, building height calculation, or render sorting in the animation frame.
- Chunk culling is required: render only chunks intersecting the camera viewport plus one chunk of padding.
- Static ground is cached separately from static structures; player/NPC movement redraws only the dynamic layer.
- Debug overlays are off by default, including collision masks, chunk grids, bbox labels, object labels, and height labels.
- Collision uses direct chunk mask lookup: player position -> chunk grid -> precomputed cell.
- Canvas device pixel ratio is capped by runtime settings, defaulting to `1.5`.
- The runtime owns one guarded `requestAnimationFrame` loop; remounts or toggles must not start duplicate loops.
- MapLibre should not be forced to repaint every game frame, and React state should not be updated inside the animation loop.

## Non-Fake Data Rule

Large source files such as Overture Parquet, Vancouver LiDAR, and full OSM extracts are not faked here. This folder contains manifests, schemas, rules, and engine contracts so real source files can be dropped in without changing gameplay code.
