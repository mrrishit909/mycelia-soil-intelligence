import { useSyncExternalStore } from "react";
import { Vector3 } from "three";
import { REGENERATIVE, MONOCULTURE, type Season } from "@mycelia/domain";
import type { Practice } from "@mycelia/schemas";
export type View = "farm" | "soil" | "water" | "carbon" | "rotation" | "biodiversity";
export const VIEWS: { id: View; label: string; blurb: string }[] = [
  { id: "farm", label: "Farm", blurb: "Fields and their health" }, { id: "soil", label: "Soil profile", blurb: "Descend into a field" }, { id: "water", label: "Water", blurb: "Rain, infiltration" },
  { id: "carbon", label: "Carbon", blurb: "Trajectories and scenarios" }, { id: "rotation", label: "Rotation", blurb: "Plan the seasons" }, { id: "biodiversity", label: "Biodiversity", blurb: "Habitat and edges" },
];
export type State = { view: View; prevView: View; fieldId: string; season: Season; filterCrop: string; minHealth: number; sources: string[]; activationAt: number; showProjected: boolean; applied: Record<string, Practice>; draft: Practice | null;
  rain: { mm: number; hours: number; t: number; playing: boolean }; introDone: boolean; introStep: number; reduced: boolean; pauseMotion: boolean; gfx: "webgl" | "poster"; pulse: string[]; pulseAt: number };
export const state: State = { view: "farm", prevView: "farm", fieldId: "f05", season: "summer", filterCrop: "", minHealth: 0, sources: [], activationAt: -99, showProjected: false, applied: {}, draft: null, rain: { mm: 60, hours: 3, t: 0, playing: false }, introDone: false, introStep: 0, reduced: false, pauseMotion: false, gfx: "webgl", pulse: [], pulseAt: -99 };
/** Per-frame values the intro drives and the canvas reads. */
export const live = { cam: new Vector3(0, 30, 30), look: new Vector3(0, 0, 0), grow: 1, m1: 1, m2: 1, block: 0, fieldsK: 1, drop: -1, dropPos: new Vector3(), groundK: 1, hud: 1, rainK: 0, blockPos: new Vector3(), blockScale: 1, coverGround: 1 };
let snap = { ...state }; const subs = new Set<() => void>();
export function set(p: Partial<State>) { Object.assign(state, p); snap = { ...state }; subs.forEach((f) => f()); }
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snap, () => snap);
export const PRESETS: Record<string, Practice> = { regenerative: { tillage: "no-till", cover: true, compost: true, rotation: [...REGENERATIVE] }, monoculture: { tillage: "conventional", cover: false, compost: false, rotation: [...MONOCULTURE] } };
