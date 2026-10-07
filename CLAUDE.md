# MYCELIA

Regenerative-farm soil intelligence demo (blueprint 03, Advanced Engineering Build Book Vol. VII). Static site; the Blender cutaway is scripted. The farm, fields, soil data and every model parameter are synthetic or invented.

- Build the asset: `npm run model` (Blender 4.5 at ~/Applications), then `node scripts/copy-assets.ts`. Contract: `model/parts.json`; the build also writes `model/exports/guides.json`, the polylines the dense strands are generated from in the browser.
- Data/rules: `npm run seed`; domain in `packages/domain` (water, carbon, rotation, health, network, strands). Tests: `npm test`, `npm run e2e` after `npm run build`.
- Space: scene unit = 1 Blender unit for the soil block; the farm map uses 0.02 units per metre; the block moves under the selected field at 0.56 scale. Depth is Y-negative.
- Multi-agent is the development process only (.claude/agents); the product contains no agents.
