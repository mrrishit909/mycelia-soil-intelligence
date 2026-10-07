# Architecture

```
model/parts.json ──> model/build.py ──Blender──> soil-cutaway.glb, guides.json, source.blend, poster.png
                 └─> model/validate.py (fresh-scene re-import; GLB nodes, guide curves inside the block, layer thicknesses, budgets)
data/simulators/generate.ts ──> farm.json (12 fields), soil.json (6 depths each, 5-year carbon history)
packages/domain: soil water, carbon, rotation, health, network, season, scenario, strands (pure, tested)
apps/web (Next.js 16 static export): App ─ store ─ Panels (DOM) + Scene (R3F) + Intro (GSAP)
apps/api (node:http): the blueprint's section 12 contract over the same domain package
```

**Guides, not meshes.** The book asks for guide curves and anchors rather than baked fungal meshes. `build.py` writes the polylines it built the roots and channels from to `guides.json` (80 root curves, 16 mycelium curves, 3 water channels). In the browser `strands.ts` turns them into 900 strands of 9 points, each wandering from its guide.

**One object, three layouts.** Every strand has three position sets in one vertex layout: underground (A), the wordmark (C, sampled from the lit pixels of a canvas-drawn word) and the farm map (B, along field edges and neighbour links). A vertex shader mixes A to C to B with two uniforms, and the nutrient particles read the same three sets from float textures so they ride the morph.

**The soil block follows the selection.** The GLB sits under the selected field at 0.56 scale; the ground plane becomes nearly transparent in the soil, water and carbon views so the block is visible from above.

**Domain, shared.** Water (a bucket model), carbon (first-order stock), rotation rules, health index, the neighbour graph and the strand generator are in `packages/domain` and used by the browser and the API.

**Not built.** PostgreSQL/PostGIS and TimescaleDB (the demo reads JSON; fields are plain polygons in metres), MapLibre/deck.gl, FastAPI (the API is Node with the same contract), object storage, real weather or sensor adapters, and any claim of agronomic accuracy.
