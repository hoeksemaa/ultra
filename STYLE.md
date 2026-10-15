# Style guide: OP1 fleet console

This file sets the one visual style of the demo. Every screen follows it.

Source: ultra.tech, inspected 2026-10-13 (computed styles and Framer color tokens).

Feel: industrial, pragmatic, clear. Square corners, hairline grids, small uppercase mono type. Few colors, and each color has one meaning.

## The console explains itself
The console is a sim that the operator watches for hours. It is not an essay that the operator reads once.

- **No titles, section labels, or section numbers.** A rack looks like a rack. A robot looks like a robot. A toolbar is a toolbar.
- **No captions or explanations on the screen.** Put the explanation in a hover popup or in the help tour.
- **No duplicates.** Show each fact in one place, and each action in one place. If a fact has a home on the floor, do not repeat it in a panel or the top bar.
- **Icons for actions.** Buttons show standard icons, not words: pause, play (▶ ▶▶ ▶▶▶), reset, −, +, help.
- **Pips and tallies for small numbers.** Show a count or a level as squares, bars, or badges. Show a numeral only when the operator tracks the exact value (the clock, mailers shipped, orders per hour). Put all other numbers in hover popups.
- **Hover for detail.** Every object and control has a hover popup. The popup names the thing and gives its numbers.
- **Panels open on demand.** Lists and charts live in panels that the operator opens from the context bar.

## Do not copy their brand
- Do not use Ultra's logo, wordmark, or the robot mark.
- Do not load their font files. Saans (Displaay) and NB Architekt Pro (Neubau) are commercial fonts. Use the free substitutes below.
- Show one small note: `Unofficial demo · made by John`, bottom right, linked to https://github.com/hoeksemaa. Show no other credit or disclaimer on the page.
- The 3PL site is hypothetical. It matches Ultra's real business, but it carries no real company's name or branding.
- All brands, items, and numbers in the demo are fictional. Do not name real customers.

## Colors

### Base (Ultra's own tokens)
| Token | Hex | Use |
|---|---|---|
| `--charcoal` | `#1B1B1B` | Page background (dark first). Text on light and colored surfaces. |
| `--white` | `#FFFFFF` | Primary text on charcoal. The active toggle. |
| `--white-70` | `#FFFFFFB3` | Secondary text, item icons. |
| `--white-50` | `#FFFFFF80` | Tertiary text, idle states. |
| `--white-30` | `#FFFFFF4D` | Hairlines, rack frames, disabled. |
| `--white-04` | `#FFFFFF0A` | Raised panel fill on charcoal. |
| `--paper` | `#EEF1F5` | Mailers on the belt. |
| `--orange` | `#FF4F00` | Attention and action. See the rule below. |

### Status and people
| Token | Hex | Meaning |
|---|---|---|
| `--ok` | `#22C55E` | Good. No action. In the autonomy tally: the robot packed the order alone. |
| `--watch` | `#FACC15` | Not all good, not a problem yet. The robot recovers alone. Monitor it. |
| `--fault` | `#F43F5E` | Bad. A human must act: a pilot or an operator. |
| `--pilot` | `#60A5FA` | A remote pilot, and the robot that a pilot controls. In the autonomy tally: a pilot helped. |
| `--idle` | `#FFFFFF80` | No state, or paused. |

### One color, one meaning
- **Orange means "look here" or "act here".** Use it for a call to action (`+` when robots wait for a pilot, the train button), the selected order, a new-data dot, focus, and the tour. Orange is never a status.
- **Green, yellow, and red are status only.** Never use them for buttons, links, or decoration.
- **Blue is pilots only.** A blue robot has a pilot in control. Red now means only "waiting for a human".
- **White marks the active toggle** (the current speed, the open panel). It is quiet, so orange stays rare.
- **No brand colors.** The 10 brands get mono codes (`BRB`, `BLK`), not colors.
- **Never use color alone.** Each state also has its own shape: an icon, a badge, or a pip. Red and orange are close in hue (350° vs 19°), and some viewers cannot tell them apart.
- Put status colors on charcoal only. All pass 4.5:1 there (green 7.6, yellow 11.2, red 4.7, blue 6.8). On `--paper` they fail.
- Text on orange, red, or blue: use charcoal.

## Fleet console states

| Robot state | Color | Icon under the robot |
|---|---|---|
| Packing (scan tote, pack items, seal mailer) | ok | none |
| Grasp failed, robot tries again alone | watch | Repeat (two arrows) |
| No tote in the infeed queue | watch | Inbox (empty tray) |
| Grasp failed, waiting for a remote pilot | fault | Hand (raised) |
| Remote pilot in control | pilot | The pilot badge with its number |
| System fault, an operator must fix it | fault | Wrench |

- Use one icon for each state, in every view: the floor, the alerts panel, popups, and the tour.
- The robot shows its color three times: the progress ring, the bar at its base, and the icon. A piloted robot also gets a blue outline and blue grippers.
- Each robot shows a progress ring for its current item: a hairline track, and an arc in the robot's color that runs clockwise from the top. Square line ends. One full ring is one item.
- The ring stops during REGRASP, NEED PILOT, and FAULT, and moves again when the robot recovers. It moves while a pilot works on the item.
- A tote shows one cube per item, left-aligned. Cubes leave from right to left.

## Pilots
- A pilot is a head with a headset and the pilot number in the middle. Solid: busy. Outline: free.
- The roster in the top bar shows every pilot. The same solid badge sits under the robot that the pilot controls.
- `−` and `+` change the team, 1 to 10. They are the only pilot controls. `+` turns orange when a robot has waited 30 s for a pilot.
- Hover a pilot badge: the popup names the pilot and its robot, and the robot gets a white outline.

## Layout
- **Top bar** (one row): time controls, clock, reset · autonomy tally · pilot roster, `−` `+`, help.
- **Floor** fills the rest. It crops to the racks, the pack line, and the belt.
- **Context bar** on the right edge: Alerts (bell), Orders (clipboard), Model (chart). A click opens that panel between the floor and the bar. A second click closes it. One panel at a time. No panel is open at the start.
- The open panel has no title. The lit icon in the context bar says which panel it is (white bar on its inner edge).
- Badges on the context bar: a red count of red robots on Alerts; an orange dot on Model when there is new data.
- Phone (900px and below): the floor on top, the context bar as a row of tabs, then the panel, then the credit.

### Floor objects
- **Rack:** two uprights, a beam under each row, and a sign plate on top with the brand code. Hover the sign for the brand name and description.
- **Bin:** an open hopper bin seen from the front, with the item icon inside and a label on the front. The label shows stock as 1 to 5 pips (log scale: up to 3, 10, 30, 100, more). Hold Alt to show the counts.
- **Tote:** a rim and the item cubes. **Mailer:** a parcel with a strip of tape.
- **Outbound:** an open shipping box with flaps. Large number: mailers shipped. Small number: orders per hour (`198/h`). No words.
- **Pickers:** dots that carry a small tote.
- A pick makes its bin glow once.

### Panels
- **Alerts:** one row per robot that needs attention. Red first, then yellow, oldest first. A robot with a pilot in control is handled, so it is not listed. Row: status icon, robot name, the item icon (or the fault icon), and a wait bar that fills over 2 minutes with a tick at each 30 s. No alerts: a green check.
- **Orders:** every active order, newest on top, and it scrolls. Row: brand code, item icons (packed items fade), 5 stage pips, robot name. No header row.
  - Stage pips: waiting, picking, in a tote, packing, shipping. Past stages are gray, the current stage is white, and later stages are outlines. While packing, the current pip takes the robot's color.
  - Hover a row and it turns orange. Click it to select the order: the floor marks the order in orange where it is now. Waiting: its shelf bins. Picking: the picker, the picker's tote, and the bins still to pick. At a robot: the tote and its cubes. Shipping: the mailer, filled solid orange and drawn on top of its neighbors. A second click clears it.
  - An order leaves the list when its mailer is under the outbound box.
- **Model:** one row per item type: its icon and a bar of 20 segments (5% each). White: reliability now. Gray: the gain if you train now. The orange train button (brain icon) and the model version (`v1`) sit below.
  - Reliability changes only when the operator presses the train button. The button is dim (35% opacity) when there is no new data.
  - Hover a row: the popup gives the exact numbers, and the floor outlines the bins of that item type and dims the rest.

| Item type | Icon |
|---|---|
| Rigid | Box |
| Bottle | Milk |
| Pouch | ShoppingBag |
| Flat | Book |
| Fragile | Wine |
| Apparel | Shirt |
| Plush | Rabbit |

### Selection and hover
- Only orders can be selected. Robots, pilots, and alert rows show popups and outlines on hover, but a click does nothing.
- One hover popup at a time. A click hides it until the pointer leaves.

## Help and keys
- The `?` button opens a guided tour: 9 short steps. Each step lights one part of the screen and opens the panel it talks about. The sim keeps running under it.
- The `?` button has an orange dot until the viewer opens help once.
- Keys: `Space` pause, `1` `2` `3` speeds, `?` help, `Esc` close the panel or the tour, `←` `→` step the tour, hold `Alt` for stock counts.

## Type

| Role | Ultra uses | Demo uses (free) | Style |
|---|---|---|---|
| Body (popups, tour) | Saans Medium | Geist Sans 500 | 15–16px / 1.35–1.4. Sentence case. |
| Labels, codes, popup titles | NB Architekt Pro Bold | Geist Mono 600–700 | UPPERCASE, 12–16px, letter-spacing +0.02em. |
| Numbers | — | Geist Mono, `font-variant-numeric: tabular-nums` | Numbers do not jump when they update. |

Next.js: load Geist and Geist Mono with `next/font/google`.

Sizes (SVG units on the floor, about 1.1 px each at 1440 × 900 with no panel open):
- Rack codes 16 · robot names 12 · outbound count 36 · orders per hour 14.
- Top bar: clock 22 · icon buttons 38px square · pilot badges 28px.
- Panels: rows 15 · icons 16–22 · nothing below 12.

Spacing: 8px grid. 16px panel padding.

## Shapes
- **Corners: square.** `border-radius: 0` everywhere. Circles only for people on the floor map (pickers and pilot heads) and progress rings.
- **Hairline grid.** 1px `--white-30` lines between areas, `--white-12` between list rows.
- **Icon buttons:** square, 1px `--white-30` outline, icon in `--white-70`. Active toggle: solid white with a charcoal icon. Call to action: solid orange with a charcoal icon.
- **Primary button** (train): solid orange, 4 small square ticks (4×4px, white) at the corners.
- **Badges:** square. A count on red, or an 8px orange dot.
- **Hover popup:** charcoal fill, 1px `--white-70` border, square corners. Mono uppercase title, an optional key hint (`Space`), then sans lines in `--white-70`.
- **Item icons:** Lucide line icons (`lucide-react`), 1.75 stroke, `--white-70`. One icon per item, and each icon matches its brand. No emoji. Item icons stay gray; color is for status and pilots.

## Motion
- Short and mechanical: 150–200ms, ease-out. No bounce.
- A status change can flash once. Nothing loops except the conveyor.
- **Object permanence.** Totes, cubes, and mailers slide between places (ease-out, 0.1 s time constant). Nothing appears or vanishes in place:
  - A new tote slides down from the picker drop point into its queue slot.
  - A packed cube slides from the tote into the robot's pack area.
  - The mailer forms in the pack area. The robot sets it straight down on the belt (ease in and out, 0.35 s). The belt carries it at belt speed into the outbound box. It never moves sideways while it drops, and it never catches up.
  - An empty tote slides down into the robot's tote return, behind the robot body.
- Surfaces that things slide behind (robot bodies, the outbound box) are opaque.

## Copy voice
- Most of the screen has no words. Words live in popups and the tour.
- Short, plain, declarative. Ultra: "Industrial AI robots that work." "Roll it up, plug it in, turn it on."
- No marketing words in the UI.

## CSS tokens

```css
:root {
  --charcoal: #1B1B1B;
  --white: #FFFFFF;
  --white-70: rgba(255, 255, 255, 0.70);
  --white-50: rgba(255, 255, 255, 0.50);
  --white-30: rgba(255, 255, 255, 0.30);
  --white-12: rgba(255, 255, 255, 0.12);
  --white-04: rgba(255, 255, 255, 0.04);
  --panel: #242424;
  --paper: #EEF1F5;
  --orange: #FF4F00;   /* attention + action only */

  --ok: #22C55E;       /* good, no action */
  --watch: #FACC15;    /* monitor */
  --fault: #F43F5E;    /* human must act */
  --pilot: #60A5FA;    /* a remote pilot and its robot */
  --idle: rgba(255, 255, 255, 0.50);

  --font-sans: var(--font-geist-sans), "Inter", system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), "JetBrains Mono", ui-monospace, monospace;

  --radius: 0;
  --hairline: 1px solid var(--white-30);
}
```
