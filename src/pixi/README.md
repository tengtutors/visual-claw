# Pixi Office Renderer Notes

Hybrid strategy for the first office simulation pass:

- Use the shipped `Office Level` PNGs as high-value room backdrops to get a polished office quickly.
- Use reusable tileset props on a shared sortable world layer so agents can pass behind desks and in front of chairs.
- Prefer the `32x32 no shadow` tileset for Stage 1 because it is easier to read at the current map scale and gives cleaner layering than the shadowed variants.
- Keep `16x16` and `no shadow` variants in the asset tree for later tilemap/collision refinement.
