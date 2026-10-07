// Crop rotation: 8 seasons (4 years of spring and autumn slots). Invented agronomy table; the rules are real-shaped, the numbers are not.
export type Crop = { id: string; label: string; family: "cereal" | "legume" | "brassica" | "root" | "cover" | "fallow"; nFixKgHa: number; nRemovalKgHa: number; carbonInput: number; heightM: number };
export const CROPS: Crop[] = [
  { id: "wheat", label: "Winter wheat", family: "cereal", nFixKgHa: 0, nRemovalKgHa: 110, carbonInput: 1.0, heightM: 0.9 },
  { id: "barley", label: "Spring barley", family: "cereal", nFixKgHa: 0, nRemovalKgHa: 85, carbonInput: 0.9, heightM: 0.8 },
  { id: "beans", label: "Field beans", family: "legume", nFixKgHa: 160, nRemovalKgHa: 70, carbonInput: 0.8, heightM: 1.1 },
  { id: "clover", label: "Clover ley", family: "legume", nFixKgHa: 140, nRemovalKgHa: 10, carbonInput: 1.3, heightM: 0.3 },
  { id: "rapeseed", label: "Oilseed rape", family: "brassica", nFixKgHa: 0, nRemovalKgHa: 120, carbonInput: 0.9, heightM: 1.3 },
  { id: "potato", label: "Potatoes", family: "root", nFixKgHa: 0, nRemovalKgHa: 130, carbonInput: 0.5, heightM: 0.5 },
  { id: "rye-cover", label: "Cover crop (rye)", family: "cover", nFixKgHa: 0, nRemovalKgHa: 0, carbonInput: 1.1, heightM: 0.4 },
  { id: "fallow", label: "Bare fallow", family: "fallow", nFixKgHa: 0, nRemovalKgHa: 0, carbonInput: 0.1, heightM: 0 },
];
export const SLOTS = 8;
const byId = (id: string) => CROPS.find((c) => c.id === id);
export type RotationCheck = { errors: string[]; warnings: string[] };
export function validateRotation(seq: string[]): RotationCheck {
  const errors: string[] = [], warnings: string[] = [];
  if (seq.length !== SLOTS) errors.push(`a rotation has ${SLOTS} seasons, not ${seq.length}`);
  seq.forEach((id, i) => { if (!byId(id)) errors.push(`season ${i + 1}: unknown crop "${id}"`); });
  for (let i = 0; i < seq.length; i++) {
    const a = byId(seq[i]), b = byId(seq[(i + 1) % seq.length]); if (!a || !b) continue;
    if (a.family !== "cover" && a.family !== "fallow" && a.family === b.family && a.id === b.id) errors.push(`seasons ${i + 1} and ${((i + 1) % seq.length) + 1}: ${a.label} twice in a row`);
    else if (a.family === "brassica" && b.family === "brassica") errors.push(`seasons ${i + 1} and ${((i + 1) % seq.length) + 1}: two brassicas in a row`);
  }
  const fams = seq.map((s) => byId(s)?.family);
  if (!fams.includes("legume")) warnings.push("no legume in the rotation: nitrogen has to come from fertiliser");
  if (fams.filter((f) => f === "fallow").length > 2) warnings.push("more than two bare fallow seasons leave the soil exposed");
  return { errors, warnings };
}
export function scoreRotation(seq: string[]) {
  const cs = seq.map(byId).filter(Boolean) as Crop[], fams = new Set(cs.map((c) => c.family)), crops = new Set(cs.map((c) => c.id));
  const nBalance = cs.reduce((a, c) => a + c.nFixKgHa - c.nRemovalKgHa, 0), carbonInput = cs.reduce((a, c) => a + c.carbonInput, 0) / Math.max(1, cs.length);
  return { diversity: Math.round(Math.min(1, (fams.size - 1) / 4 * 0.6 + (crops.size - 1) / 6 * 0.4) * 100) / 100, nBalance, carbonInput: Math.round(carbonInput * 100) / 100, legumeSeasons: cs.filter((c) => c.family === "legume").length };
}
export const MONOCULTURE = ["wheat", "barley", "wheat", "barley", "wheat", "barley", "wheat", "fallow"];
export const REGENERATIVE = ["wheat", "rye-cover", "beans", "barley", "clover", "rapeseed", "clover", "rye-cover"];
