export type Pair = { a: string; b: string };

export function cleanExclusions(ids: string[], exclusions: Pair[]): Pair[] {
  const have = new Set(ids);
  const seen = new Set<string>();
  const out: Pair[] = [];
  for (const e of exclusions) {
    if (!have.has(e.a) || !have.has(e.b) || e.a === e.b) continue;
    const a = e.a < e.b ? e.a : e.b;
    const b = e.a < e.b ? e.b : e.a;
    const key = `${a}|${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ a, b });
  }
  return out;
}

/**
 * ponytail: rejection-sample a derangement. Can miss a rare valid map after `tries`,
 * and the sample is not uniform. Upgrade path: exact backtracking.
 * `rand` must return a number in [0, 1).
 */
export function derange(
  ids: string[],
  exclusions: Pair[],
  rand: () => number = Math.random,
  tries = 500,
): Record<string, string> | null {
  const unique = [...new Set(ids)];
  if (unique.length < 2) return null;

  const banned = new Set<string>();
  for (const id of unique) banned.add(`${id}|${id}`);
  for (const e of cleanExclusions(unique, exclusions)) {
    banned.add(`${e.a}|${e.b}`);
    banned.add(`${e.b}|${e.a}`);
  }

  for (let t = 0; t < tries; t++) {
    const targets = [...unique];
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const swap = targets[i]!;
      targets[i] = targets[j]!;
      targets[j] = swap;
    }
    let ok = true;
    for (let i = 0; i < unique.length; i++) {
      if (banned.has(`${unique[i]}|${targets[i]}`)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const map: Record<string, string> = {};
    for (let i = 0; i < unique.length; i++) map[unique[i]!] = targets[i]!;
    return map;
  }
  return null;
}
