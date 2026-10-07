# MYCELIA: soil intelligence for regenerative farms

A raindrop falls into a crack in a dry field and the camera follows it underground, through roots, water channels and a fungal network that then spells the product's name and pulls back to become the boundaries and links of the farm map. From there: field health, a soil-profile descent, a rain-and-infiltration simulation, carbon trajectories that grow like roots, a rotation planner and a biodiversity view.

Built from blueprint 03 of the *Advanced Engineering Build Book, Volume VII* as a **vertical slice**. **The farm, fields, soil data and all model parameters are invented**: the water, carbon, rotation and health models are small demonstrations of direction and rough size, not agronomy.

- Live: https://mrrishit909.github.io/projects/mycelia-soil-intelligence/demo/
- Case study: https://mrrishit909.github.io/projects/mycelia-soil-intelligence/

## Run it
```bash
npm ci
npm run seed                      # farm and soil data
npm run model                     # Blender 4.5: build.py then validate.py (the GLB and guides.json are committed, so optional)
npm test                          # 33 domain + API tests
npm run build && node scripts/serve.ts 8651   # static export at http://127.0.0.1:8651
npm run e2e                       # 22 Playwright tests (needs Google Chrome)
node apps/api/src/server.ts       # /v1 API on :8650, OpenAPI at /openapi.json
```
`?skip=1`, `?view=farm|soil|water|carbon|rotation|biodiversity`, `&field=f05`, `&season=winter`, `&projected=1`, `?gfx=off`, `?motion=reduced`.

## The pipeline
`model/build.py` builds the soil cutaway and, from the same polylines, writes `guides.json`. `model/validate.py` re-imports the GLB into an empty scene and checks the contract and the guides. The browser generates the dense strands from the guides (the book's rule: guide curves, not millions of baked meshes) and animates one object through three layouts.

See [docs/](docs/) (architecture, asset contract, QA, performance) and [design/](design/).

## Agent roles
`.claude/agents/` defines the twelve roles from the book, `.claude/skills/` the six project skills. **Honest note:** this repository was produced by one Claude Code session playing those roles in sequence on one working tree, not by parallel subagents in separate worktrees. The multi-agent workflow is the development process; the product contains no agents.

## Not built, and why
PostGIS/TimescaleDB (JSON files), MapLibre/deck.gl (the map is a 3D scene of extruded polygons), FastAPI (Node with the same contract), real weather/sensor adapters, auth, a touch test, tablet and large-desktop checks, a measurement on a physical GPU, and any agronomic validation.
