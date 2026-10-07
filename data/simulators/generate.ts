// Synthetic farm: 12 fields on a jittered 4 x 3 grid with shared corners, soil profiles by depth, a five-year carbon history. Fictional farm and field names.
import { mkdirSync, writeFileSync } from "node:fs";
import { mulberry32, SOIL, LAYERS_CM, CROPS, MONOCULTURE, REGENERATIVE, validateRotation, projectSOC, currentPractice } from "../../packages/domain/src/index.ts";
import type { Farm, Field, FieldSoil, Pt, SoilType } from "../../packages/schemas/src/index.ts";

const r = mulberry32(2026), W = 2400, H = 1800, C = 4, R = 3;
const corner: Pt[][] = Array.from({ length: R + 1 }, (_, j) => Array.from({ length: C + 1 }, (_, i) => [i * (W / C) + (i % C === 0 ? 0 : (r() - 0.5) * 140), j * (H / R) + (j % R === 0 ? 0 : (r() - 0.5) * 140)] as Pt));
const names = ["North Meadow", "Hollin Field", "Long Acre", "Brook Piece", "Stone Close", "Mill Field", "Top Barn", "Orchard Field", "Cuckoo Pen", "Far Moor", "Lower Hay", "Kiln Ground"];
const crops = ["wheat", "barley", "beans", "clover", "rapeseed", "potato", "wheat", "barley", "beans", "wheat", "rapeseed", "clover"];
const types: SoilType[] = ["loam", "clay", "loam", "silt", "sandy-loam", "loam", "clay", "silt", "loam", "sandy-loam", "silt", "clay"];
const mixed = ["wheat", "beans", "barley", "rapeseed", "wheat", "clover", "barley", "fallow"];
const fields: Field[] = []; const soils: FieldSoil[] = []; const q: number[] = [];
for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
  const k = j * C + i, poly = [corner[j][i], corner[j][i + 1], corner[j + 1][i + 1], corner[j + 1][i]];
  const area = Math.abs(poly.reduce((a, p, n) => a + (p[0] * poly[(n + 1) % 4][1] - poly[(n + 1) % 4][0] * p[1]), 0)) / 2 / 10000, per = poly.reduce((a, p, n) => a + Math.hypot(poly[(n + 1) % 4][0] - p[0], poly[(n + 1) % 4][1] - p[1]), 0);
  const regen = k === 2 || k === 8, mix = [1, 5, 6, 9].includes(k);
  const rotation = regen ? [...REGENERATIVE] : mix ? [...mixed] : [...MONOCULTURE];
  if (validateRotation(rotation).errors.length) throw new Error(`rotation for ${names[k]} is invalid: ${validateRotation(rotation).errors.join("; ")}`);
  const nb = [j > 0 ? k - C : null, j < R - 1 ? k + C : null, i > 0 ? k - 1 : null, i < C - 1 ? k + 1 : null].filter((x) => x !== null) as number[];
  fields.push({ id: `f${String(k + 1).padStart(2, "0")}`, name: names[k], crop: crops[k], soilType: types[k], tillage: regen || k === 10 ? "no-till" : "conventional", areaHa: Math.round(area * 10) / 10, polygon: poly.map((p) => [Math.round(p[0]), Math.round(p[1])] as Pt), centroid: [Math.round(poly.reduce((a, p) => a + p[0], 0) / 4), Math.round(poly.reduce((a, p) => a + p[1], 0) / 4)], neighbours: nb.map((n) => `f${String(n + 1).padStart(2, "0")}`), hedgerowM: Math.round(per * (regen ? 0.55 : 0.1 + r() * 0.35)), perimeterM: Math.round(per), rotation, cover: regen || k === 10 || k === 5, compost: regen });
  q.push(regen ? 2.9 + r() * 0.4 : mix ? 1.9 + r() * 0.5 : 1.0 + r() * 0.8);
}
fields.forEach((f, k) => {
  const s = SOIL[f.soilType], surf = q[k], ph = Math.round((5.7 + r() * 1.7) * 10) / 10;
  const layers = LAYERS_CM.map((d) => ({ depthCm: d, moisture: Math.round((s.wp + (s.fc - s.wp) * (0.35 + 0.35 * r() + d / 400)) * 1000) / 1000, organicCarbon: Math.round(surf * Math.exp(-d / 38) * 100) / 100, ph: Math.round((ph + d / 150) * 10) / 10, nitrogen: Math.round(55 * (surf / 2) * Math.exp(-d / 45)) }));
  const soc30 = layers.filter((l) => l.depthCm <= 30).reduce((a, l, _, arr) => a + l.organicCarbon / arr.length, 0), trend = f.cover && f.compost ? 0.07 : f.tillage === "no-till" ? 0.02 : -0.04;
  soils.push({ fieldId: f.id, asOf: "2025-12-31", layers, socHistory: [2021, 2022, 2023, 2024, 2025].map((y, n) => ({ year: y, soc: Math.round((soc30 - trend * (4 - n)) * 100) / 100 })) });
});
void currentPractice; void projectSOC; void CROPS;
const farm: Farm = { id: "hollin-beck", name: "Hollin Beck Farm (fictional)", extent: { w: W, h: H }, fields };
const out = new URL("../generated/", import.meta.url).pathname; mkdirSync(out, { recursive: true });
writeFileSync(out + "farm.json", JSON.stringify(farm)); writeFileSync(out + "soil.json", JSON.stringify(soils));
console.log(`generated ${fields.length} fields (${fields.reduce((a, f) => a + f.areaHa, 0).toFixed(0)} ha), ${soils.length} soil profiles`);
