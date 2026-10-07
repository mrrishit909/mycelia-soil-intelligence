# QA report

Apple M3 Pro, Chrome stable, Playwright 1.63, WebGL through SwiftShader. Last full runs: 22 e2e passed three times in a row; 33 unit and API tests passed.

| Matrix row (blueprint 18) | Covered by | Result |
|---|---|---|
| Intro first load, skip, refresh mid-sequence | demo walk, refresh test | pass |
| Input: click, keyboard, hover | demo walk (clicks), keyboard test | pass |
| Input: drag, touch | the fields can be picked from the list; clicking a field slab on the map is implemented but not tested; no touch test | partial |
| Scroll | no scroll navigation in this product; deep links restore a view and field | pass |
| Responsive | phone 390 px: views strip above, panel below, no sideways overflow | pass at one phone size |
| Motion: reduced | static keyframes; charts already grown; no panel animation | pass |
| Graphics: success, failure, context loss | all WebGL tests; `?gfx=off`; lost-context event | pass |
| Lifecycle: tab hidden | frame loop pauses on visibilitychange | manual only |
| Domain behaviour | water conserves mass; more carbon means less runoff; regenerative beats current on every field; rotation rules; graph connectivity; strand sets share one layout | pass |
| Visual regression | six views against the poster fallback | pass |
| Performance | budgets in tests/e2e/performance.spec.ts | pass |

Defects found and fixed during the build: a mis-parenthesised opacity update let the selected field's slab grow opaque in the soil view and hide the block; the farm-map strands were drawn inside the field slabs until they were lifted above them; the rain-event default storm showed no runoff on a regenerative field and was raised to 60 mm/h.
