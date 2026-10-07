// Soil organic carbon, first order: stock' = inputs - k * stock. Invented parameters; the demo's claim is the direction and rough size of the effect, not a forecast.
import type { Practice, SoilType } from "@mycelia/schemas";
import { SOIL } from "./soil.ts";
import { scoreRotation } from "./rotation.ts";
const DEPTH_CM = 30;
export const stockTHa = (socPct: number, type: SoilType) => socPct * SOIL[type].bulk * DEPTH_CM;
export const socPct = (stock: number, type: SoilType) => stock / (SOIL[type].bulk * DEPTH_CM);
/** Annual carbon input (t C/ha/yr) and decay rate for a practice. */
export function carbonTerms(p: Practice, type: SoilType) {
  const rot = scoreRotation(p.rotation), clay = type === "clay" ? 0.85 : type === "sandy-loam" ? 1.15 : 1;
  const input = 1.1 + rot.carbonInput * 0.35 + (p.cover ? 0.7 : 0) + (p.compost ? 1.1 : 0);
  const k = 0.03 * (p.tillage === "conventional" ? 1.35 : 1) * clay;
  return { input, k };
}
/** Project soc over `years`; returns years 0..years inclusive. */
export function projectSOC(soc0: number, p: Practice, type: SoilType, years: number, startYear = 2026) {
  const { input, k } = carbonTerms(p, type); let stock = stockTHa(soc0, type); const out = [{ year: startYear, soc: round2(soc0) }];
  for (let y = 1; y <= years; y++) { stock += input - k * stock; out.push({ year: startYear + y, soc: round2(socPct(stock, type)) }); }
  return out;
}
export const equilibriumSOC = (p: Practice, type: SoilType) => { const { input, k } = carbonTerms(p, type); return round2(socPct(input / k, type)); };
const round2 = (v: number) => Math.round(v * 100) / 100;
