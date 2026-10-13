# Style guide: OP1 fleet console

This file sets the one visual style of the demo. Every screen follows it.

Source: ultra.tech, inspected 2026-10-13 (computed styles and Framer color tokens).

Feel: industrial, pragmatic, clear. Square corners, hairline grids, big tight headlines, small uppercase mono labels. Few colors, and each color has one meaning.

## Do not copy their brand
- Do not use Ultra's logo, wordmark, or the robot mark.
- Do not load their font files. Saans (Displaay) and NB Architekt Pro (Neubau) are commercial fonts. Use the free substitutes below.
- Show "Unofficial demo by John Hoeksema" in the header or footer.
- The 3PL site is hypothetical. It matches Ultra's real business, but it carries no real company's name or branding.
- All brands, items, and numbers in the demo are fictional. Do not name real customers.

## Colors

### Base (Ultra's own tokens)
| Token | Hex | Use |
|---|---|---|
| `--charcoal` | `#1B1B1B` | Page background (dark first). Text on light surfaces. |
| `--white` | `#FFFFFF` | Primary text on charcoal. |
| `--white-70` | `#FFFFFFB3` | Secondary text. |
| `--white-50` | `#FFFFFF80` | Tertiary text, idle states. |
| `--white-30` | `#FFFFFF4D` | Hairlines, dividers, disabled. |
| `--white-04` | `#FFFFFF0A` | Raised panel fill on charcoal. |
| `--paper` | `#EEF1F5` | Light surface. Use rarely (mailers on the conveyor). |
| `--orange` | `#FF4F00` | Attention and action. See the rule below. |

### Status
| Token | Hex | Meaning |
|---|---|---|
| `--ok` | `#22C55E` | Good. No action. |
| `--watch` | `#FACC15` | Not all good, not a problem yet. The robot recovers alone. Monitor it. |
| `--fault` | `#F43F5E` | Bad. A human must act: a pilot or an operator. |
| `--idle` | `#FFFFFF80` | No state, or paused. |

### One color, one meaning
- **Orange means "look here" or "act here".** Use it for the primary button, the selected robot or row, focus, eyebrow labels, and the active list number. Orange is never a status.
- **Green, yellow, and red are status only.** Never use them for buttons, links, or decoration.
- **No brand colors.** The 10 brands get mono codes (`BRB`, `BLK`), not colors.
- Always show status as a dot plus a label (`● PACKING`, `● REGRASP`, `● NEED PILOT`). Never use color alone. Red and orange are close in hue (350° vs 19°), and some viewers cannot tell them apart.
- Put status colors on charcoal only. All four pass 4.5:1 there (green 7.6, yellow 11.2, red 4.7). On `--paper` they fail.
- Text on orange: use charcoal (5.2:1). Use white on orange only for text that is 18px or larger and bold.

## Fleet console states

| Robot state | Status | Label |
|---|---|---|
| Packing (scan tote, pack items, seal mailer) | ok | `● PACKING` |
| Grasp failed, robot tries again alone | watch | `● REGRASP` |
| No tote in the infeed queue | watch | `● NO TOTE` |
| Grasp failed, waiting for a remote pilot | fault | `● NEED PILOT` |
| Remote pilot in control | fault | `● PILOT P2` |
| System fault, an operator must fix it | fault | `● FAULT` |

- Use one label for each state, in every view.
- Each robot shows a progress ring for its current item: a hairline track, and an arc in the status color that runs clockwise from the top. Square line ends. One full ring is one item.
- The ring stops during REGRASP, NEED PILOT, and FAULT, and moves again when the robot recovers. It moves while a pilot works on the item.
- A tote shows one cube per item, left-aligned. Cubes leave from right to left.
- The selected robot gets an orange outline in every view.
- The action queue lists red robots first, then yellow robots, oldest first.
- A recommendation that the operator can act on gets one orange button (`+1 PILOT`).

## Keep it quiet
- Show a number only when the operator acts on it or tracks it. The console has 3 KPIs: `ORDERS / HR`, `AUTONOMY`, `PILOTS BUSY`.
- Do not put captions or subtitles under section headings. The section name is enough.
- Put item names, weights, and brand descriptions in hover popups, not on the map.
- A pick container shows only its icon and its stock count (`×3`, `×123`).

## Type

| Role | Ultra uses | Demo uses (free) | Style |
|---|---|---|---|
| Display and headings | Saans Bold | Geist Sans 700 | Tight: letter-spacing −0.04em at 40px+, −0.02em at 20–32px. Line-height 1.0–1.1. Sentence case. |
| Body | Saans Medium | Geist Sans 500 | 16px / 1.4. Sentence case. |
| Labels, nav, buttons, chips, numbers | NB Architekt Pro Bold | Geist Mono 500–700 | UPPERCASE, 11–14px, letter-spacing +0.02em. |
| Metrics | — | Geist Mono, `font-variant-numeric: tabular-nums` | Numbers do not jump when they update. |

Next.js: load Geist and Geist Mono with `next/font/google`.

Scale for an app screen: H1 40 · H2 24 · H3 18 · Body 16 · Small 14 · Label 12 (mono, uppercase). Dense panels can go to 11.

## Shapes and layout
- **Corners: square.** `border-radius: 0` everywhere. Circles only for status dots and people on the floor map.
- **Hairline grid.** 1px `--white-30` lines between cells and list rows. Panels sit edge to edge.
- **Numbered rows.** `01  Order packaging`. The number is mono. The active row number is orange, with a short orange bar at the left edge.
- **Eyebrow label** above a heading: mono, uppercase, orange or `--white-70`.
- **Key-value labels** for metadata: `SITE: BK-01`, `SHIFT: 1 OF 3`.
- **Chips and tabs:** square, 1px white outline, mono uppercase. Active chip = solid orange fill with charcoal text.
- **Buttons:**
  - Primary: solid orange, mono uppercase, 4 small square ticks (4×4px, white) at the corners.
  - Secondary: transparent, 1px white outline.
- **Hover popup:** charcoal fill, 1px `--white-70` border, square corners. Mono uppercase title, then one sans sentence in `--white-70`.
- **Item icons:** Lucide line icons (`lucide-react`), 1.75 stroke, `--white-70`. One icon per item, and each icon matches its brand. No emoji and no color.
- Spacing: 8px grid.

## Motion
- Short and mechanical: 150–200ms, ease-out. No bounce.
- A status change can flash once. Nothing loops except a live "running" indicator and the conveyor.
- **Object permanence.** Totes, cubes, and mailers slide between places (ease-out, 0.1 s time constant). Nothing appears or vanishes in place:
  - A new tote slides down from the picker drop point into its queue slot.
  - A packed cube slides from the tote into the robot's pack area.
  - The mailer forms in the pack area, slides out onto the belt, and slides under the outbound bin.
  - An empty tote slides down into the robot's tote return, behind the robot body.
- Surfaces that things slide behind (robot bodies, the outbound bin) are opaque.

## Copy voice
- Short, plain, declarative. Ultra: "Industrial AI robots that work." "Roll it up, plug it in, turn it on."
- Labels name the thing: `ORDERS / HR`, `AUTONOMY`, `PILOTS BUSY`. No marketing words in the UI.

## CSS tokens

```css
:root {
  --charcoal: #1B1B1B;
  --white: #FFFFFF;
  --white-70: rgba(255, 255, 255, 0.70);
  --white-50: rgba(255, 255, 255, 0.50);
  --white-30: rgba(255, 255, 255, 0.30);
  --white-04: rgba(255, 255, 255, 0.04);
  --paper: #EEF1F5;
  --orange: #FF4F00;   /* attention + action only */

  --ok: #22C55E;       /* good, no action */
  --watch: #FACC15;    /* monitor */
  --fault: #F43F5E;    /* human must act */
  --idle: rgba(255, 255, 255, 0.50);

  --font-sans: var(--font-geist-sans), "Inter", system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), "JetBrains Mono", ui-monospace, monospace;

  --radius: 0;
  --hairline: 1px solid var(--white-30);
}
```
