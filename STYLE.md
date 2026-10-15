# Style guide: OP1 fleet console

This file sets the one visual style of the demo. Every screen follows it.

It applies John's UI principles (signed off 2026-10-15) to this demo. Part A of the principles makes the UI easy to use. Part B makes it look like John's work.

The demo copies Ultra's look (ultra.tech, inspected 2026-10-13). Thus it uses Ultra's colors and free substitutes for Ultra's fonts. All other rules come from the principles.

Core rule: design for the 100th use, and teach the 1st use.

## Do not copy their brand
- Do not use Ultra's logo, wordmark, or the robot mark.
- Do not load their font files. Saans (Displaay) and NB Architekt Pro (Neubau) are commercial fonts. Use the free substitutes below.
- Put one small credit at the bottom right: "Unofficial demo · made by John", with a link to https://github.com/hoeksemaa.
- The 3PL site is hypothetical. It matches Ultra's real business, but it carries no real company's name or branding.
- All brands, items, and numbers in the demo are fictional. Do not name real customers. The first tip of the tutorial says this.

## The screen
- The floor is the one center: the pick floor at the top, the pack line under it, and the pilot seats at the bottom.
- The header holds the shift clock, two KPIs (`Orders/hr`, `Autonomy`), and the controls at the right.
- The side column holds the reliability panel, the inspector for the selected order, and the credit.
- No section titles and no section numbers. Each part shows what it is. A title has a maximum of 2 words.
- Show each fact once. A relation shows on the items themselves: a pilot's sign sits under the robot that it controls, and the selected order is orange on the floor. There is no action queue and no order table.
- Frame: the app fills the window, and the page does not scroll. The floor scales to fit, but never below 2/3. In a smaller window, the floor scrolls inside its panel.
- Phone (760 px wide or less): the side column goes under the floor. The floor starts scrolled to the robots. A selected order scrolls the inspector into view.

## Glossary: one item, one sign
Each item has one word, one sign, and one color only if it needs a color. Do not use a synonym.

| Item | Word | Sign | Color |
|---|---|---|---|
| Robot | robot | Robot body with its number, 1 to 20. Small form: a box with the number. | Status color |
| Pilot | pilot | Headset with the pilot's number, 1 to 10 | None |
| Order | order | Package icon and `#10570`. On the floor: its tote, then its mailer. | Orange when selected |
| Tote | tote | Open box, one cube for each item still in it | None |
| Mailer | mailer | Paper rectangle | None |
| Item | item | Its own Lucide icon | None |
| Item type | Rigid, Bottle, Pouch, Flat, Fragile, Apparel, Plush | The word only (see "Where the task wins") | None |
| Brand | brand | Three-letter code on its rack (`BLK`) | None |
| Picker | picker | Dot. It carries a tote while it picks. | None |
| Model | model | `Model v1` | None |
| Sample | sample | `128 new samples` | None |

| Robot state | Word | Sign |
|---|---|---|
| Packs an item | Packing | Neutral body, the ring moves |
| A pilot controls it | Pilot 2 | Neutral body, the pilot's sign under the robot |
| No tote for 10 s or more | No tote | Red tint |
| Tries a grasp again alone | Regrasp | Red tint |
| Waits for a pilot | Need pilot | Solid red with a headset |
| System fault | Fault | Solid red with a wrench |

The ring shows the progress of the current item: one full ring is one item. It stops during a regrasp, a pilot wait, or a fault.

## Colors
Ultra's colors, in the roles of the principle tokens.

| Token | Hex | Use |
|---|---|---|
| `--page` | `#1B1B1B` | Page background: Ultra charcoal |
| `--panel` | `#242424` | Panels, racks, tooltips, tips |
| `--body` | `#2C2C2C` | Robot body |
| `--ink` | `#FFFFFF` | Main text |
| `--ink-2` | white 70% | Secondary text |
| `--ink-3` | white 50% | Faint text, free pilot seats |
| `--line` | white 12% | Hairlines |
| `--line-2` | white 30% | Item outlines, control borders, the corner ticks |
| `--paper` | `#EEF1F5` | Mailers |
| `--orange` | `#FF4F00` | Primary: what the user can act on, and the selection |
| `--orange-text` | `#FF4F00` | Orange text and links (5.2:1 on charcoal) |
| `--red` | `#D92D4A` | Act: a human must act |
| `--red-tint` | `#5C2430` | Watch: not a problem yet |
| `--green` | `#22C55E` | Done: only `Shipped` in the inspector |

- Orange marks what the user can act on and what the user selected: the primary button, the active speed, the hover edge of a control, the selected order, focus rings, previews, and the tip ring. Orange is never a status. Text on orange is charcoal (5.2:1).
- Status is red. Normal is neutral. A red tint means "watch". Solid red with an icon means "act". There is no yellow, because it is too close to orange.
- Green shows only where the user waits for a result: a followed order that ships.
- Color shows meaning, not identity. Brands, robots, and pilots get no colors. Numbers tell them apart.
- Text on solid red is white (4.75:1).
- Not used: the sky and lilac area tints. No area needs a tint.

## Type
- Display and body: Geist (substitute for Saans). Numbers, codes, and keys: Geist Mono (substitute for NB Architekt Pro). Load both with `next/font/google`.
- Sentence case everywhere. No uppercase labels.
- Numbers use `font-variant-numeric: tabular-nums`, so they do not jump.
- Nothing is smaller than 12 px. Floor text is 18 SVG units or more: 12 px at the smallest floor scale (2/3).

## Shapes
- Corners: 8 px on panels, tooltips, and tips. 6 px on controls. Floor items use 2 to 8 units.
- Spacing is on an 8 px grid.
- Floating layers (tooltips, tips, the undo toast) get one soft shadow: `0 8px 24px rgba(0,0,0,0.45)`.
- Decoration: one motif. Four small square ticks sit just outside the corners of each panel, in the gutters where panels meet. Never put decoration in the data.

## Controls
Each frequent action has one control and one shortcut. There are no hidden modes.

| Action | Control | Key |
|---|---|---|
| Pause or play | Pause / play icon | Space |
| Speed 1×, 10×, 60× | ▶ ▶▶ ▶▶▶ | 1, 2, 3 |
| Reset the shift | Reset icon. "New shift · Undo" shows at the button for 8 s. | R (undo: Cmd/Ctrl+Z) |
| Help | ? icon | ? |
| Add or remove a pilot | + and − at the left of the pilot seats | + and - |
| Train the model | `Train model` (orange) | T |
| Follow an order | Click its tote, its picker, or its mailer. Click it again, or click the empty floor, to stop. | Esc stops |

- Reset has undo, not "Are you sure?".
- A control that cannot act is dim (35%). It never moves and never hides.
- Each button that is an icon has a tooltip with its name and its key.

## Floor
- Racks show only the brand code. The brand name and its one sentence are in the tooltip.
- A container shows only its item icon. The name, type, weight, and stock are in the tooltip. A container glows for a moment after a pick.
- Robots show their number, the ring or the act icon, and the pack area. Status is the body color.
- Pilot seats have fixed places, by number. A new pilot takes the lowest free number. When there are more pilots than the target, the pilots with the highest numbers leave: a free pilot at once, a busy pilot after its item (white dashed edge).
- Previews: point to + and an orange dashed seat shows where the new pilot sits. Point to − and an orange dashed edge marks the pilot that will leave.
- The outbound bin shows `Shipped` and the count.

## Side column
- Reliability: one row for each item type, with a bar on one shared scale (0 to 100%) and the percent. The header shows the model version.
- Point to or focus `Train model` and an orange part of each bar shows the gain. The percent shows the new value in orange. After training, the bars grow (250 ms).
- `Train model` is dim when there are no new samples. The count of new samples is next to it.
- Inspector: the selected order. It shows the number, the brand, the items (packed items get a check), and the steps Picking, In tote, Packing, Shipping, Shipped. The current step has an orange dot and the robot's sign. `Shipped` is green. With no order, it shows a pointer icon.

## Tooltips
- A tooltip opens when the pointer rests on an item for 0.5 s.
- Only an item with something useful to say has a tooltip.
- All tooltips use one layout: a title, then short lines.
- A click or a tap on an info item (robot, container, rack, seat, KPI, reliability row) opens the same tooltip and keeps it open. The next press closes it.
- When a tooltip refers to an item, it shows the item's sign.

## Tutorial
- The help button opens 6 short tips: the demo, following an order, robot status, pilots, training, and the controls. Each tip points at its item with an orange ring.
- On the first visit, each tip shows once, when the user can first use its item. Robot status waits for the first red robot. Pilots wait for the first pilot need. Training waits for 10 new samples.
- `Got it` goes to the next tip. The × stops the tips. The browser stores the seen tips (`op1-tips-seen`), if it can.
- Write all text in Simplified Technical English: short sentences, active voice, only "can", "must", and "will".

## Motion
- Short and plain: 150 to 250 ms, ease-out, no bounce. Motion only shows a change.
- Status colors change in 200 ms. Pilot seats and pilot signs fade in and out. Tooltips and tips fade in.
- Object permanence. Totes, cubes, and mailers slide between places with an ease-out (time constant 0.08 s, 95% in 0.24 s). Nothing appears or vanishes in place:
  - A new tote slides down from the picker drop point into its queue slot.
  - A packed cube slides from the tote into the robot's pack area.
  - The mailer forms in the pack area. The robot sets it straight down on the belt (0.25 s, ease-out). The belt carries it at belt speed under the outbound bin. It never moves sideways while it drops, and it never catches up.
  - An empty tote slides down into the robot's tote return, behind the robot body.
- Surfaces that things slide behind (robot bodies, the outbound bin) are opaque.
- The belt is the only thing that moves all the time.

## Where the task wins over a rule
- Colors and fonts: the demo copies Ultra's look, so it uses Ultra's dark colors and Geist, not the light principle palette and DM Sans.
- Reset is on the surface, not deepest. It is one of the standard sim controls (play, pause, reset, speed), and undo makes it safe.
- Item types have words, but no icons. Their icons would look like the 100 item icons on the shelves.
- The floor scrolls inside its panel on a small screen. At phone width, the whole floor cannot show 12 px text.
- No overlays. The floor has no dense data that needs one.

## Copy voice
- Short, plain, declarative. Ultra: "Industrial AI robots that work."
- Labels name the thing: `Orders/hr`, `Autonomy`, `Shipped`. No marketing words in the UI.

## CSS tokens

```css
:root {
  --page: #1b1b1b;
  --panel: #242424;
  --body: #2c2c2c;
  --ink: #ffffff;
  --ink-2: rgba(255, 255, 255, 0.7);
  --ink-3: rgba(255, 255, 255, 0.5);
  --line: rgba(255, 255, 255, 0.12);
  --line-2: rgba(255, 255, 255, 0.3);
  --paper: #eef1f5;
  --orange: #ff4f00;
  --orange-text: #ff4f00;
  --red: #d92d4a;
  --red-tint: #5c2430;
  --green: #22c55e;

  --font-sans: var(--font-geist-sans), "Inter", system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), "JetBrains Mono", ui-monospace, monospace;

  --r-panel: 8px;
  --r-ctl: 6px;
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  --ease: 200ms ease-out;
}
```
