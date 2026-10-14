# Tile Cache Layout

- `raw`: normalized source chunks before gameplay classification.
- `classified`: chunks after road/building/water/park/tree classification.
- `pixelized`: render-ready pixel terrain chunks.

Chunk IDs should use either:

- Web map tile keys: `z/x/y`
- Stable local grid keys: `vancouver_mvp:{zoom}:{grid_x}:{grid_y}`

Do not commit large generated tile caches unless they are tiny fixtures.
