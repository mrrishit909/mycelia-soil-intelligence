// The fields as a graph (shared boundaries), and the mycelial activation that spreads over it.
export type Graph = Record<string, string[]>;
export function hops(g: Graph, sources: string[]): Record<string, number> {
  const d: Record<string, number> = {}; const q = [...sources]; sources.forEach((s) => (d[s] = 0));
  while (q.length) { const a = q.shift()!; for (const b of g[a] ?? []) if (d[b] === undefined) { d[b] = d[a] + 1; q.push(b); } }
  return d;
}
export function shortestPath(g: Graph, from: string, to: string): string[] {
  const prev: Record<string, string | null> = { [from]: null }, q = [from];
  while (q.length) { const a = q.shift()!; if (a === to) break; for (const b of g[a] ?? []) if (!(b in prev)) { prev[b] = a; q.push(b); } }
  if (!(to in prev)) return []; const out: string[] = []; for (let c: string | null = to; c; c = prev[c]) out.unshift(c); return out;
}
/** Activation 0..1 of each field at time t (s): a source lights immediately; each hop later by `delay` seconds, ramping over `ramp`. Fields not reached stay 0. */
export function activation(g: Graph, sources: string[], t: number, delay = 0.35, ramp = 0.5): Record<string, number> {
  const h = hops(g, sources), out: Record<string, number> = {};
  for (const id of Object.keys(g)) { const k = h[id]; out[id] = k === undefined ? 0 : Math.min(1, Math.max(0, (t - k * delay) / ramp)); out[id] = out[id] * out[id] * (3 - 2 * out[id]); }
  return out;
}
