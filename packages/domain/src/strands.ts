// The dense mycelium: strands are generated in the browser from the Blender guide curves, never baked into the GLB. Three keyframe sets share one vertex layout so a shader can morph between them:
// A the underground network, C the wordmark, B the farm map (field boundaries and the links between neighbouring fields).
import type { Farm, Pt } from "@mycelia/schemas";
import { mulberry32 } from "./rng.ts";
export const PTS = 9;                               // points per strand
export type Guides = { mycelium: number[][][]; root_cereal: number[][][]; root_legume: number[][][]; root_brassica: number[][][]; block: { width: number } };
export type StrandSets = { count: number; a: Float32Array; b: Float32Array; c: Float32Array; t: Float32Array };
const lerp3 = (p: number[], q: number[], k: number) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];
function along(poly: number[][], u: number) { const f = u * (poly.length - 1), i = Math.min(poly.length - 2, Math.floor(f)); return lerp3(poly[i], poly[i + 1], f - i); }
/** Keyframe A: each strand follows a guide polyline (mycelium guides plus a share of root guides) with a perpendicular wander that grows along its length. */
export function underground(g: Guides, count: number, seed = 5): Float32Array {
  const r = mulberry32(seed), out = new Float32Array(count * PTS * 3), all = [...g.mycelium, ...g.mycelium, ...g.root_cereal, ...g.root_legume, ...g.root_brassica];
  for (let s = 0; s < count; s++) {
    const poly = all[Math.floor(r() * all.length)], u0 = r() * 0.4, len = 0.35 + r() * 0.5, off = [(r() - 0.5) * 1.6, (r() - 0.5) * 3, (r() - 0.5) * 1.6];
    for (let k = 0; k < PTS; k++) { const p = along(poly, Math.min(1, u0 + (len * k) / (PTS - 1))), w = k / (PTS - 1); const o = (s * PTS + k) * 3; out[o] = p[0] + off[0] * w; out[o + 1] = p[2] + off[2] * w; out[o + 2] = p[1] + off[1] * w; } // glTF-style: x, y(up)=blender z, z=blender y
  }
  return out;
}
/** Keyframe C: strands drawn over the lit pixels of a w x h mask (the wordmark), each a short stroke; the wordmark spans `width` units centred at the origin on a plane facing +z at height y. */
export function wordmark(mask: Uint8Array, w: number, h: number, count: number, width: number, y: number, seed = 9): Float32Array {
  const lit: number[] = []; for (let i = 0; i < mask.length; i++) if (mask[i] > 127) lit.push(i);
  if (!lit.length) throw new Error("wordmark mask is empty");
  const r = mulberry32(seed), out = new Float32Array(count * PTS * 3), sc = width / w;
  for (let s = 0; s < count; s++) {
    const i = lit[Math.floor(r() * lit.length)], px = i % w, py = Math.floor(i / w), a = r() * Math.PI * 2, L = 5 + r() * 9;
    for (let k = 0; k < PTS; k++) { const t = (k / (PTS - 1) - 0.5) * L, o = (s * PTS + k) * 3; out[o] = (px + Math.cos(a) * t - w / 2) * sc; out[o + 1] = y + (h / 2 - (py + Math.sin(a) * t)) * sc; out[o + 2] = (r() - 0.5) * 0.15; }
  }
  return out;
}
/** Keyframe B: strands lie along the farm map's field edges and neighbour links, on the ground plane (units: farm metres * scale). */
export function farmMap(farm: Farm, count: number, scale: number, seed = 13): Float32Array {
  const segs: [Pt, Pt][] = []; const ids = new Set<string>();
  for (const f of farm.fields) { for (let i = 0; i < f.polygon.length; i++) segs.push([f.polygon[i], f.polygon[(i + 1) % f.polygon.length]]); for (const n of f.neighbours) { const k = [f.id, n].sort().join(); if (ids.has(k)) continue; ids.add(k); const m = farm.fields.find((x) => x.id === n)!; segs.push([f.centroid, m.centroid]); } }
  const r = mulberry32(seed), out = new Float32Array(count * PTS * 3), len = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])), tot = len.reduce((a, b) => a + b, 0);
  for (let s = 0; s < count; s++) {
    let pick = r() * tot, si = 0; while (si < segs.length - 1 && pick > len[si]) { pick -= len[si]; si++; }
    const [a, b] = segs[si], u0 = r() * 0.6, u1 = Math.min(1, u0 + 0.25 + r() * 0.4);
    for (let k = 0; k < PTS; k++) { const u = u0 + ((u1 - u0) * k) / (PTS - 1), o = (s * PTS + k) * 3; out[o] = (a[0] + (b[0] - a[0]) * u - farm.extent.w / 2) * scale; out[o + 1] = 1.7 + r() * 0.05; out[o + 2] = -(a[1] + (b[1] - a[1]) * u - farm.extent.h / 2) * scale; }
  }
  return out;
}
/** Per-vertex strand parameter: x = position along the strand 0..1, y = strand's random phase 0..1 (used for growth order and the nutrient particles). */
export function params(count: number, seed = 21): Float32Array { const r = mulberry32(seed), t = new Float32Array(count * PTS * 2); for (let s = 0; s < count; s++) { const ph = r(); for (let k = 0; k < PTS; k++) { t[(s * PTS + k) * 2] = k / (PTS - 1); t[(s * PTS + k) * 2 + 1] = ph; } } return t; }
export const buildStrands = (g: Guides, farm: Farm, mask: Uint8Array, mw: number, mh: number, count = 900, scale = 0.02): StrandSets => ({ count, a: underground(g, count), b: farmMap(farm, count, scale), c: wordmark(mask, mw, mh, count, 26, 8, 9), t: params(count) });
