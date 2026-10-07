import type { Field, Practice } from "@mycelia/schemas";
import { SOIL, infiltrationCapacity } from "./soil.ts";
import { scoreRotation } from "./rotation.ts";
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const edgeFraction = (f: Pick<Field, "hedgerowM" | "perimeterM">) => clamp(f.hedgerowM / f.perimeterM);
/** Habitat score 0..1: hedgerow share of the perimeter (saturating at 50%) blended with crop diversity. */
export const habitatScore = (f: Pick<Field, "hedgerowM" | "perimeterM">, diversity: number) => Math.round(clamp(0.6 * clamp(edgeFraction(f) * 2) + 0.4 * diversity) * 100) / 100;
/** Soil health 0..100: carbon 35, infiltration 20, habitat 20, pH 15, nitrogen balance 10. */
export function soilHealth(i: { soc: number; ph: number; infiltrationMmH: number; habitat: number; nBalance: number }) {
  const h = 35 * clamp((i.soc - 0.5) / 3.5) + 20 * clamp(i.infiltrationMmH / 60) + 20 * i.habitat + 15 * clamp(1 - Math.abs(i.ph - 6.5) / 2) + 10 * clamp((i.nBalance + 150) / 300);
  return Math.round(h);
}
export function fieldHealth(f: Field, soc: number, ph: number, p: Practice = { tillage: f.tillage, cover: f.cover, compost: f.compost, rotation: f.rotation }) {
  const rot = scoreRotation(p.rotation);
  return soilHealth({ soc, ph, infiltrationMmH: infiltrationCapacity(f.soilType, soc), habitat: habitatScore(f, rot.diversity), nBalance: rot.nBalance });
}
const RAMP: [number, [number, number, number]][] = [[0, [0x18, 0x14, 0x0f]], [30, [0xa3, 0x5c, 0x3b]], [55, [0x53, 0x6b, 0x3c]], [75, [0x92, 0xa8, 0x5e]], [100, [0xe8, 0xc8, 0x6a]]];
/** Health to an RGB colour on the palette ramp (soil black, clay, moss, fern, sunlight). */
export function healthColor(h: number): [number, number, number] {
  const v = clamp(h, 0, 100); for (let i = 1; i < RAMP.length; i++) if (v <= RAMP[i][0]) { const [a, ca] = RAMP[i - 1], [b, cb] = RAMP[i], k = (v - a) / (b - a); return [0, 1, 2].map((c) => Math.round(ca[c] + (cb[c] - ca[c]) * k)) as [number, number, number]; }
  return RAMP[RAMP.length - 1][1];
}
export const hex = (c: [number, number, number]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
void SOIL;
