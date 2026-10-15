// SVG copies of the CSS tokens in globals.css (STYLE.md: colors).
export const C = {
  page: "#1B1B1B",
  panel: "#242424", // opaque, so things can slide behind it
  body: "#2C2C2C", // robot body: a little brighter than a panel
  ink: "#FFFFFF",
  ink2: "rgba(255,255,255,0.70)",
  ink3: "rgba(255,255,255,0.50)",
  line: "rgba(255,255,255,0.12)",
  line2: "rgba(255,255,255,0.30)",
  paper: "#EEF1F5",
  orange: "#FF4F00",
  red: "#D92D4A",
  redTint: "#5C2430",
  green: "#22C55E",
} as const;

export function pct(x: number, digits = 1) {
  return `${(x * 100).toFixed(digits)}%`;
}
