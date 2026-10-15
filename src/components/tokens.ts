import type { Tone } from "@/sim/engine";

// SVG copies of the CSS tokens in globals.css (STYLE.md).
export const C = {
  charcoal: "#1B1B1B",
  white: "#FFFFFF",
  w70: "rgba(255,255,255,0.70)",
  w50: "rgba(255,255,255,0.50)",
  w30: "rgba(255,255,255,0.30)",
  w20: "rgba(255,255,255,0.20)",
  w12: "rgba(255,255,255,0.12)",
  w04: "rgba(255,255,255,0.04)",
  paper: "#EEF1F5",
  panel: "#242424", // --white-04 on charcoal, opaque, so things can slide behind it
  orange: "#FF4F00",
  ok: "#22C55E",
  watch: "#FACC15",
  fault: "#F43F5E",
  pilot: "#60A5FA", // a remote pilot, and a robot that a pilot controls
  idle: "rgba(255,255,255,0.50)",
} as const;

export const TONE_COLOR: Record<Tone, string> = {
  ok: C.ok,
  watch: C.watch,
  fault: C.fault,
  pilot: C.pilot,
};

export function pct(x: number, digits = 1) {
  return `${(x * 100).toFixed(digits)}%`;
}
