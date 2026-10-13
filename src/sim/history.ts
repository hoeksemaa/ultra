// Snapshots of the sim, so the console can rewind.
import type { Sim } from "./engine";

const EVERY = 10; // sim seconds between snapshots
const KEEP = 360; // one sim hour

export function record(h: Sim[], s: Sim) {
  if (h.length > 0 && s.t - h[h.length - 1].t < EVERY) return;
  h.push(structuredClone(s));
  if (h.length > KEEP) h.shift();
}

// Go back to the last snapshot at or before time `to` (or the oldest one).
// Snapshots after it are dropped: the sim runs a new future from there.
export function rewind(h: Sim[], to: number): Sim | null {
  if (h.length === 0) return null;
  let i = h.length - 1;
  while (i > 0 && h[i].t > to + 0.5) i--;
  h.length = i + 1;
  return structuredClone(h[i]);
}
