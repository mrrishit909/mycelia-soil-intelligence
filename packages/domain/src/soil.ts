// Water in the profile. A deliberately small bucket model: invented parameters that behave plausibly, not an agronomic model.
import type { SoilType } from "@mycelia/schemas";
export const LAYERS_CM = [5, 15, 30, 50, 75, 100] as const;                     // layer centres
export const THICKNESS_CM = [10, 10, 20, 20, 30, 30] as const;                  // each layer's thickness (cm)
export const SOIL: Record<SoilType, { label: string; ksat: number; fc: number; wp: number; bulk: number }> = {
  loam:         { label: "Loam",         ksat: 28, fc: 0.30, wp: 0.12, bulk: 1.3 },
  clay:         { label: "Clay",         ksat: 9,  fc: 0.38, wp: 0.22, bulk: 1.4 },
  "sandy-loam": { label: "Sandy loam",   ksat: 55, fc: 0.22, wp: 0.08, bulk: 1.45 },
  silt:         { label: "Silt",         ksat: 18, fc: 0.34, wp: 0.14, bulk: 1.25 },
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** Infiltration capacity in mm/h: saturated conductivity scaled by organic carbon (structure). 1.5% carbon is the reference. */
export const infiltrationCapacity = (type: SoilType, socPct: number) => Math.round(SOIL[type].ksat * clamp(1 + 0.32 * (socPct - 1.5), 0.55, 1.9) * 10) / 10;
export type WaterResult = { rainMm: number; infiltratedMm: number; runoffMm: number; drainedMm: number; moisture: number[]; storageMm: number[]; capacityMmH: number };
/** Simulate `hours` of steady rain (mm/h) on a profile starting at `start` volumetric moisture per layer. One-hour steps. */
export function rainEvent(type: SoilType, socPct: number, start: number[], rainMmH: number, hours: number): WaterResult {
  const s = SOIL[type], cap = infiltrationCapacity(type, socPct), m = [...start]; let inf = 0, run = 0, drained = 0;
  for (let h = 0; h < hours; h++) {
    let supply = Math.min(rainMmH, cap); run += rainMmH - supply;               // anything above capacity runs off
    for (let i = 0; i < m.length; i++) {
      const room = (0.45 - m[i]) * THICKNESS_CM[i] * 10;                         // mm of room to saturation
      const take = Math.min(supply, Math.max(0, room)); m[i] += take / (THICKNESS_CM[i] * 10); supply -= take; inf += take;
      if (m[i] > s.fc) { const excess = (m[i] - s.fc) * THICKNESS_CM[i] * 10 * 0.3; m[i] -= excess / (THICKNESS_CM[i] * 10); if (i + 1 < m.length) m[i + 1] += excess / (THICKNESS_CM[i + 1] * 10); else drained += excess; }
    }
    run += supply; inf -= supply;                                               // a full profile sheds the rest
  }
  return { rainMm: rainMmH * hours, infiltratedMm: Math.round(inf * 10) / 10, runoffMm: Math.round(run * 10) / 10, drainedMm: Math.round(drained * 10) / 10, moisture: m.map((v) => Math.round(v * 1000) / 1000), storageMm: m.map((v, i) => Math.round(v * THICKNESS_CM[i] * 10 * 10) / 10), capacityMmH: cap };
}
/** Plant-available water in the top metre, mm. */
export const availableWater = (type: SoilType, moisture: number[]) => Math.round(moisture.reduce((a, v, i) => a + Math.max(0, v - SOIL[type].wp) * THICKNESS_CM[i] * 10, 0) * 10) / 10;
