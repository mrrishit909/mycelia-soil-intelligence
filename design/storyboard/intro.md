# Intro storyboard (about 23 s, wall clock, skippable from the first frame)

| t (s) | Shot | What moves |
|---|---|---|
| 0 | A dry cracked field under muted sun (a shader of Voronoi cracks). | camera eases in |
| 2.4 | One raindrop falls and finds the crack. | drop position; camera follows through the ground (back faces culled, so the ground simply vanishes from below) |
| 3.6 | The soil block fades in around the camera: layers, rocks, three water channels, three crop root systems from the Blender asset. | `block` opacity, `grow` 0 to 0.35 |
| 6.2 | The network grows along the guide curves with nutrient particles riding it; the camera drifts through. | `grow` to 1; two camera moves |
| 14.1 | The strands pull out of the soil and settle into the word MYCELIA. | `m1` 0 to 1 (morph A to C); camera leaves the block |
| 18.2 | Pull back: the same strands lie along the field boundaries and the links between neighbouring fields; the fields rise. | `m2` 0 to 1 (morph C to B); camera to the map |
| 21.5 | The panels grow in from the middle of the farm. | CSS `--grow` radius |

One object carries the story: 900 strands of 9 points each, with three position sets (underground, wordmark, farm map) in one vertex layout. A shader mixes them, so there is no cut and no second object. Reduced motion: four keyframes and an "Enter the farm" button.
