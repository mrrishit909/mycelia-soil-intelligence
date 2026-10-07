export const SEASONS = ["spring", "summer", "autumn", "winter"] as const; export type Season = (typeof SEASONS)[number];
export const SEASON: Record<Season, { sunElevationDeg: number; sun: string; ground: string; growth: number; label: string }> = {
  spring: { sunElevationDeg: 48, sun: "#F4E3A8", ground: "#536B3C", growth: 0.45, label: "Spring" },
  summer: { sunElevationDeg: 66, sun: "#FFE9A0", ground: "#92A85E", growth: 1.0, label: "Summer" },
  autumn: { sunElevationDeg: 34, sun: "#F0B66A", ground: "#A35C3B", growth: 0.6, label: "Autumn" },
  winter: { sunElevationDeg: 18, sun: "#C9D2D8", ground: "#3d3a33", growth: 0.15, label: "Winter" },
};
/** Crop height multiplier for a crop in a season: winter wheat and rape keep some growth in winter; spring crops and potatoes do not. */
export function cropGrowth(cropId: string, s: Season) {
  const base = SEASON[s].growth, winterHardy = ["wheat", "rapeseed", "rye-cover", "clover"].includes(cropId);
  return s === "winter" ? (winterHardy ? 0.3 : 0) : base;
}
