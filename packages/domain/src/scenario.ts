import type { Field, Practice, Scenario, FieldSoil } from "@mycelia/schemas";
import { projectSOC } from "./carbon.ts";
import { fieldHealth, habitatScore } from "./health.ts";
import { infiltrationCapacity } from "./soil.ts";
import { scoreRotation, validateRotation, REGENERATIVE } from "./rotation.ts";
export const currentPractice = (f: Field): Practice => ({ tillage: f.tillage, cover: f.cover, compost: f.compost, rotation: f.rotation });
export const regenerativePractice = (): Practice => ({ tillage: "no-till", cover: true, compost: true, rotation: [...REGENERATIVE] });
export function validatePractice(p: Practice): string[] { const r = validateRotation(p.rotation); return [...r.errors]; }
export function runScenario(f: Field, soil: FieldSoil, p: Practice, years = 10, id = "", name = "Scenario"): Scenario {
  const soc0 = soil.layers.filter((l) => l.depthCm <= 30).reduce((a, l, _, arr) => a + l.organicCarbon / arr.length, 0), ph = soil.layers[0].ph;
  const series = projectSOC(soc0, p, f.soilType, years), socEnd = series[series.length - 1].soc, rot = scoreRotation(p.rotation);
  return { id, fieldId: f.id, name, practice: p, years, projected: { socSeries: series, soc0: Math.round(soc0 * 100) / 100, socEnd, infiltrationMmH: infiltrationCapacity(f.soilType, socEnd), health0: fieldHealth(f, soc0, ph), healthEnd: fieldHealth(f, socEnd, ph, p), diversity: rot.diversity, nBalance: rot.nBalance } };
}
void habitatScore;
