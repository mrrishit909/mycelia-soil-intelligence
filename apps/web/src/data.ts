import type { Farm, FieldSoil } from "@mycelia/schemas";
import type { Guides } from "@mycelia/domain";
export type Data = { farm: Farm; soils: FieldSoil[]; guides: Guides };
export const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export async function loadData(): Promise<Data> {
  const g = async <T,>(n: string) => (await fetch(`${base}/data/${n}.json`)).json() as Promise<T>;
  const [farm, soils, guides] = await Promise.all([g<Farm>("farm"), g<FieldSoil[]>("soil"), g<Guides>("guides")]);
  return { farm, soils, guides };
}
export const SCALE = 0.02;
export const toScene = (x: number, y: number, farm: { extent: { w: number; h: number } }): [number, number] => [(x - farm.extent.w / 2) * SCALE, -(y - farm.extent.h / 2) * SCALE];
