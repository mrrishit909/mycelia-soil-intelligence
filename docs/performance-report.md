# Performance report

Hardware: Apple M3 Pro, Chrome stable, **software WebGL (SwiftShader)**, 1280 x 800. No physical GPU was exercised: **no 60 fps claim is made.** Command: `node scripts/measure.mjs`, soil view.

| Measure | Value | Budget |
|---|---|---|
| Transfer (18 requests, local, uncompressed) | 746 KB | n/a |
| JS gzipped | 570 KB | 750 KB |
| soil-cutaway.glb / guides.json | 110 KB / 24 KB | 700 KB / 300 KB |
| Draw calls / triangles / geometries / textures | 29 / 4,946 / 44 / 7 | 200 / 200,000 |
| Strands | 900 strands, 7,200 line segments, 1,800 particles | n/a |
| LCP | 5.0 s (software rasteriser) | none set |
| CLS | 0 | 0.1 |
| Long tasks during load | 3.3 s | none set |
| Median / p95 frame | 33.3 / 50 ms (software) | none set |
| Rain slider to readout | 7 ms | 3 s |

Draw calls and triangles are renderer-reported and device independent. Everything dense is generated in the browser: the strands are one draw call of lines and the particles one draw call of points, so cost does not scale with the Blender mesh. The particles sample three float textures in the vertex shader (WebGL 2); a device without float vertex-texture support would need the CPU fallback, which is not built. The block, strands and nutrient particles are drawn twice (once in the world, once in the block); halving that is the first optimisation to try.

Degradation: the frame loop stops on a hidden tab; `?gfx=off` and context loss show the poster; reduced motion removes ambient motion; dpr is capped at 1.5. There is no automatic quality ladder.
