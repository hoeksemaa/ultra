// Discrete-time simulation of one 3PL site: human pickers fill totes,
// 20 OP1 robots pack each tote into a mailer, and remote pilots take over
// when a robot cannot finish a grasp. All times are in simulated seconds.

import { BRANDS, CLASS_BASE, GRASP_CLASSES, type GraspClass, type Item } from "./catalog";

// ---------- Layout (SVG units; 10 units = 1 m) ----------

export const VIEW_W = 1200;
export const VIEW_H = 840;

export const ZONE_X0 = 32;
export const ZONE_W = 208;
export const ZONE_H = 150;
export const ZONE_GAP = 24;
export const ZONE_ROW_Y = [44, 234];
export const CROSS_AISLE_Y = 214;
export const FRONT_AISLE_Y = 404;

export const ROBOT_COUNT = 20;
export const ROBOT_X0 = 32;
export const ROBOT_PITCH = 50.4;
export const ROBOT_W = 40;
export const ROBOT_Y = 576;
export const ROBOT_H = 44;
export const DROP_Y = 452;
export const QUEUE_CAP = 6;

export const CONVEYOR_X0 = 24;
export const CONVEYOR_Y = 656;
export const CONVEYOR_H = 22;
export const BIN_X = 1052;
export const BIN_W = 116;

const WALK_SPEED = 15; // units/s (1.5 m/s)
const CONVEYOR_SPEED = 8; // units/s (0.8 m/s)
export const STEP = 0.1; // fixed sim step, seconds

export interface Pt {
  x: number;
  y: number;
}

export function zoneRect(z: number) {
  const row = z < 5 ? 0 : 1;
  const col = z % 5;
  return { x: ZONE_X0 + col * (ZONE_W + ZONE_GAP), y: ZONE_ROW_Y[row], row };
}

export function robotX(i: number) {
  return ROBOT_X0 + i * ROBOT_PITCH;
}

export function robotCx(i: number) {
  return robotX(i) + ROBOT_W / 2;
}

function zonePick(z: number, jitter: number): Pt {
  const r = zoneRect(z);
  return {
    x: r.x + ZONE_W / 2 + jitter,
    y: r.row === 0 ? CROSS_AISLE_Y : FRONT_AISLE_Y,
  };
}

function gapX(x: number) {
  const pitch = ZONE_W + ZONE_GAP;
  const c = Math.max(0, Math.min(5, Math.round((x - ZONE_X0 + ZONE_GAP / 2) / pitch)));
  return ZONE_X0 + c * pitch - ZONE_GAP / 2;
}

type Level = "A" | "B" | "C";
function level(p: Pt): Level {
  if (p.y <= CROSS_AISLE_Y + 1) return "A";
  if (p.y <= FRONT_AISLE_Y + 1) return "B";
  return "C";
}

// Walk along the aisles: cross aisle (A), front aisle (B), robot line (C).
function route(p: Pt, t: Pt): Pt[] {
  const lp = level(p);
  const lt = level(t);
  if (lp === "A" && lt === "A") return [{ x: t.x, y: t.y }];
  const out: Pt[] = [];
  if (lp === "A") {
    const gx = gapX(p.x);
    out.push({ x: gx, y: CROSS_AISLE_Y }, { x: gx, y: FRONT_AISLE_Y });
  } else if (lp === "C") {
    out.push({ x: p.x, y: FRONT_AISLE_Y });
  }
  if (lt === "A") {
    const gx = gapX(t.x);
    out.push({ x: gx, y: FRONT_AISLE_Y }, { x: gx, y: CROSS_AISLE_Y }, { x: t.x, y: CROSS_AISLE_Y });
  } else if (lt === "B") {
    out.push({ x: t.x, y: FRONT_AISLE_Y });
  } else {
    out.push({ x: t.x, y: FRONT_AISLE_Y }, { x: t.x, y: t.y });
  }
  return out;
}

// Move along a path. Returns true when the path is done.
function walk(m: { x: number; y: number; path: Pt[] }, dt: number): boolean {
  let budget = WALK_SPEED * dt;
  while (budget > 0 && m.path.length > 0) {
    const n = m.path[0];
    const dx = n.x - m.x;
    const dy = n.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d <= budget) {
      m.x = n.x;
      m.y = n.y;
      m.path.shift();
      budget -= d;
    } else {
      m.x += (dx / d) * budget;
      m.y += (dy / d) * budget;
      budget = 0;
    }
  }
  return m.path.length === 0;
}

// ---------- State ----------

export type Phase = "idle" | "pack" | "regrasp" | "pilot_wait" | "pilot" | "fault";

export type Light = "ok" | "watch" | "fault";

export type OrderStatus = "queued" | "picking" | "staged" | "packing" | "conveyor";

export interface Order {
  id: number;
  brand: number;
  items: number[];
  status: OrderStatus;
  robot: number | null;
  assists: number;
}

interface Step {
  phase: "pack" | "regrasp" | "pilot_wait" | "fault";
  dur: number;
  item: number; // index into the order's items
  fault?: string;
}

export interface Robot {
  id: number;
  queue: number[];
  incoming: number;
  order: number | null;
  steps: Step[];
  phase: Phase;
  t: number;
  since: number;
  pilot: number | null;
  flash: number;
}

export interface Picker {
  id: number;
  x: number;
  y: number;
  path: Pt[];
  task: "idle" | "to_zone" | "pick" | "to_robot";
  order: number | null;
  robot: number | null;
  t: number;
}

export interface Pilot {
  id: number;
  robot: number | null;
}

export interface Mailer {
  order: number;
  x: number;
}

export interface Sim {
  t: number;
  rng: number;
  orders: Map<number, Order>;
  backlog: number[];
  nextId: number;
  nextArrival: number;
  robots: Robot[];
  pickers: Picker[];
  pilots: Pilot[];
  pilotTarget: number;
  nextPilotId: number;
  pilotQueue: number[];
  mailers: Mailer[];
  shipped: number;
  pilotRate: Record<GraspClass, number>; // chance that an item needs a pilot
  recent: boolean[]; // last 100 packed orders: true = no pilot
  packTimes: number[]; // sim times of packed orders, last hour
  flash: Map<string, number>; // sku -> sim time of last pick
}

// ---------- Random numbers (seeded, so every run is the same) ----------

function rand(s: Sim): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let x = s.rng;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

function between(s: Sim, a: number, b: number) {
  return a + (b - a) * rand(s);
}

function pickWeighted(s: Sim, weights: number[]) {
  let r = rand(s) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// ---------- Setup ----------

export const SEED = 20261013;
export const DEFAULT_PILOTS = 2;
const PICKERS = 16;
const ARRIVAL_RATE = 0.175; // orders per second (630 per hour)
const BACKLOG_CAP = 150;
const FAULT_RATE = 0.01; // chance of a system fault per order

function newOrder(s: Sim, status: OrderStatus): Order {
  const brand = pickWeighted(s, BRANDS.map((b) => b.share));
  const r = rand(s);
  const n = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
  const items: number[] = [];
  while (items.length < n) {
    const i = Math.floor(rand(s) * BRANDS[brand].items.length);
    if (!items.includes(i)) items.push(i);
  }
  const o: Order = { id: s.nextId++, brand, items, status, robot: null, assists: 0 };
  s.orders.set(o.id, o);
  return o;
}

export function createSim(pilots = DEFAULT_PILOTS): Sim {
  const pilotRate = {} as Record<GraspClass, number>;
  for (const c of GRASP_CLASSES) pilotRate[c] = CLASS_BASE[c].pilot;
  const s: Sim = {
    t: 0,
    rng: SEED,
    orders: new Map(),
    backlog: [],
    nextId: 10401,
    nextArrival: 0,
    robots: [],
    pickers: [],
    pilots: [],
    pilotTarget: pilots,
    nextPilotId: 1,
    pilotQueue: [],
    mailers: [],
    shipped: 0,
    pilotRate,
    recent: [],
    packTimes: [],
    flash: new Map(),
  };
  for (let i = 0; i < ROBOT_COUNT; i++) {
    const r: Robot = {
      id: i,
      queue: [],
      incoming: 0,
      order: null,
      steps: [],
      phase: "idle",
      t: 0,
      since: 0,
      pilot: null,
      flash: -1e9,
    };
    for (let k = 0; k < 2; k++) {
      const o = newOrder(s, "staged");
      o.robot = i;
      r.queue.push(o.id);
    }
    s.robots.push(r);
  }
  for (let i = 0; i < 40; i++) s.backlog.push(newOrder(s, "queued").id);
  for (let i = 0; i < PICKERS; i++) {
    s.pickers.push({ id: i + 1, x: 60 + i * (980 / PICKERS), y: FRONT_AISLE_Y, path: [], task: "idle", order: null, robot: null, t: 0 });
  }
  for (let i = 0; i < pilots; i++) s.pilots.push({ id: s.nextPilotId++, robot: null });
  s.nextArrival = -Math.log(1 - rand(s)) / ARRIVAL_RATE;
  return s;
}

// ---------- Controls ----------

export function setPilotTarget(s: Sim, n: number) {
  s.pilotTarget = Math.max(1, Math.min(10, n));
  while (s.pilots.length < s.pilotTarget) s.pilots.push({ id: s.nextPilotId++, robot: null });
  // Remove free pilots now; busy pilots leave when they finish.
  for (let i = s.pilots.length - 1; i >= 0 && s.pilots.length > s.pilotTarget; i--) {
    if (s.pilots[i].robot === null) s.pilots.splice(i, 1);
  }
}

// ---------- Robots ----------

export function currentItem(s: Sim, r: Robot): Item | null {
  if (r.order === null || r.steps.length === 0) return null;
  const o = s.orders.get(r.order)!;
  return BRANDS[o.brand].items[o.items[r.steps[0].item]];
}

const FAULTS = ["Gripper torque", "Wrist camera offline", "Mailer feed jam", "Label printer jam"];

// Decide at the start of an order what happens to each item.
function planOrder(s: Sim, o: Order): Step[] {
  const steps: Step[] = [];
  o.items.forEach((idx, i) => {
    const cls = BRANDS[o.brand].items[idx].cls;
    const d = CLASS_BASE[cls].time * between(s, 0.85, 1.15);
    const x = rand(s);
    if (x < s.pilotRate[cls]) {
      steps.push({ phase: "pack", dur: d / 2, item: i }, { phase: "pilot_wait", dur: 0, item: i });
    } else if (x < s.pilotRate[cls] + CLASS_BASE[cls].regrasp) {
      steps.push(
        { phase: "pack", dur: d / 2, item: i },
        { phase: "regrasp", dur: between(s, 12, 22), item: i },
        { phase: "pack", dur: d / 2, item: i },
      );
    } else {
      steps.push({ phase: "pack", dur: d, item: i });
    }
  });
  // Scan the tote first. Seal the mailer last.
  steps[0].dur += between(s, 12, 18);
  steps.push({ phase: "pack", dur: between(s, 18, 26), item: o.items.length - 1 });
  if (rand(s) < FAULT_RATE) {
    const at = Math.floor(rand(s) * steps.length);
    const fault = FAULTS[Math.floor(rand(s) * FAULTS.length)];
    steps.splice(at, 0, { phase: "fault", dur: between(s, 90, 240), item: steps[at].item, fault });
  }
  return steps;
}

function enterStep(s: Sim, r: Robot) {
  const st = r.steps[0];
  r.phase = st.phase;
  r.t = st.dur;
  r.since = s.t;
  if (st.phase !== "pack") r.flash = s.t;
  if (st.phase === "pilot_wait") s.pilotQueue.push(r.id);
}

function nextStep(s: Sim, r: Robot) {
  r.steps.shift();
  if (r.steps.length > 0) {
    enterStep(s, r);
    return;
  }
  // Order done: the mailer goes onto the conveyor.
  const o = s.orders.get(r.order!)!;
  o.status = "conveyor";
  s.mailers.push({ order: o.id, x: robotCx(r.id) - 7 });
  s.recent.push(o.assists === 0);
  if (s.recent.length > 100) s.recent.shift();
  s.packTimes.push(s.t);
  r.order = null;
  r.phase = "idle";
  r.since = s.t;
}

function stepRobot(s: Sim, r: Robot, dt: number) {
  if (r.phase === "idle") {
    if (r.queue.length === 0) return;
    const o = s.orders.get(r.queue.shift()!)!;
    o.status = "packing";
    r.order = o.id;
    r.steps = planOrder(s, o);
    enterStep(s, r);
    return;
  }
  if (r.phase === "pilot_wait") return; // a pilot takes over in dispatchPilots
  r.t -= dt;
  if (r.t > 0) return;
  if (r.phase === "pilot") finishPilot(s, r);
  nextStep(s, r);
}

function finishPilot(s: Sim, r: Robot) {
  // Each pilot episode adds training data. The shared policy gets a little
  // better at this item class on every robot in the fleet.
  const cls = currentItem(s, r)!.cls;
  s.pilotRate[cls] = Math.max(0.01, s.pilotRate[cls] * 0.975);
  s.orders.get(r.order!)!.assists++;
  const p = s.pilots.find((x) => x.robot === r.id)!;
  p.robot = null;
  if (s.pilots.length > s.pilotTarget) s.pilots.splice(s.pilots.indexOf(p), 1);
  r.pilot = null;
}

function dispatchPilots(s: Sim) {
  while (s.pilotQueue.length > 0) {
    const p = s.pilots.find((x) => x.robot === null);
    if (!p) return;
    const r = s.robots[s.pilotQueue.shift()!];
    p.robot = r.id;
    r.pilot = p.id;
    r.phase = "pilot";
    r.since = s.t;
    r.t = between(s, 10, 20) + CLASS_BASE[currentItem(s, r)!.cls].time * between(s, 1.2, 2.6);
  }
}

// ---------- Pickers ----------

function chooseRobot(s: Sim, x: number): Robot | null {
  let best: Robot | null = null;
  let bestScore = Infinity;
  for (const r of s.robots) {
    const load = r.queue.length + r.incoming;
    if (load >= QUEUE_CAP) continue;
    const score = load + (r.order !== null ? 1 : 0) + Math.abs(robotCx(r.id) - x) / 2000;
    if (score < bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

function stepPicker(s: Sim, p: Picker, dt: number) {
  switch (p.task) {
    case "idle": {
      if (s.backlog.length === 0) return;
      const o = s.orders.get(s.backlog.shift()!)!;
      o.status = "picking";
      p.order = o.id;
      p.path = route(p, zonePick(o.brand, ((p.id % 5) - 2) * 9));
      p.task = "to_zone";
      return;
    }
    case "to_zone":
      if (walk(p, dt)) {
        const o = s.orders.get(p.order!)!;
        p.task = "pick";
        p.t = 5 + 6 * o.items.length;
        for (const i of o.items) s.flash.set(BRANDS[o.brand].items[i].sku, s.t);
      }
      return;
    case "pick":
      p.t -= dt;
      if (p.t <= 0) {
        const r = chooseRobot(s, p.x);
        if (!r) {
          p.t = 2;
          return;
        }
        r.incoming++;
        p.robot = r.id;
        p.path = route(p, { x: robotCx(r.id) + ((p.id % 3) - 1) * 6, y: DROP_Y });
        p.task = "to_robot";
      }
      return;
    case "to_robot":
      if (walk(p, dt)) {
        const r = s.robots[p.robot!];
        const o = s.orders.get(p.order!)!;
        r.incoming--;
        r.queue.push(o.id);
        o.status = "staged";
        o.robot = r.id;
        p.order = null;
        p.robot = null;
        p.task = "idle";
      }
      return;
  }
}

// ---------- Main step ----------

export function step(s: Sim, dt: number) {
  s.t += dt;

  // New orders arrive from the WMS.
  while (s.t >= s.nextArrival) {
    if (s.backlog.length < BACKLOG_CAP) s.backlog.push(newOrder(s, "queued").id);
    s.nextArrival += -Math.log(1 - rand(s)) / ARRIVAL_RATE;
  }

  for (const p of s.pickers) stepPicker(s, p, dt);
  for (const r of s.robots) stepRobot(s, r, dt);
  dispatchPilots(s);

  // Conveyor to the outbound bin.
  for (let i = s.mailers.length - 1; i >= 0; i--) {
    const m = s.mailers[i];
    m.x += CONVEYOR_SPEED * dt;
    if (m.x >= BIN_X - 4) {
      s.mailers.splice(i, 1);
      s.orders.delete(m.order);
      s.shipped++;
    }
  }

  while (s.packTimes.length > 0 && s.packTimes[0] < s.t - 3600) s.packTimes.shift();
}

// ---------- Read-only views for the UI ----------

export function robotLight(r: Robot): Light {
  switch (r.phase) {
    case "pack":
      return "ok";
    case "regrasp":
    case "idle":
      return "watch";
    default:
      return "fault";
  }
}

export function robotLabel(r: Robot): string {
  switch (r.phase) {
    case "idle":
      return "NO TOTE";
    case "pack":
      return "PACKING";
    case "regrasp":
      return "REGRASP";
    case "pilot_wait":
      return "NEED PILOT";
    case "pilot":
      return `PILOT P${r.pilot}`;
    case "fault":
      return "FAULT";
  }
}

export function ordersPerHour(s: Sim): number | null {
  const window = Math.min(s.t, 3600);
  if (window < 120) return null;
  return (s.packTimes.length * 3600) / window;
}

export function autonomy(s: Sim): number | null {
  if (s.recent.length < 10) return null;
  return s.recent.filter(Boolean).length / s.recent.length;
}

export function classAutonomy(s: Sim, c: GraspClass): number {
  return 1 - s.pilotRate[c];
}

export interface Action {
  key: string;
  level: "fault" | "watch" | "rec";
  robot: number | null;
  title: string;
  detail: string;
  wait: number;
}

// Robots that need attention: red first, then yellow, oldest first.
// A recommendation goes on top.
export function actions(s: Sim): Action[] {
  const rows: Action[] = [];
  for (const r of s.robots) {
    const light = robotLight(r);
    const wait = s.t - r.since;
    if (light === "ok" || (r.phase === "idle" && wait < 10)) continue;
    const st = r.steps[0];
    rows.push({
      key: `r${r.id}`,
      level: light,
      robot: r.id,
      title: robotLabel(r),
      detail: r.phase === "fault" ? st.fault! : (currentItem(s, r)?.name ?? ""),
      wait,
    });
  }
  const rank = { rec: 0, fault: 1, watch: 2 };
  rows.sort((a, b) => rank[a.level] - rank[b.level] || b.wait - a.wait);

  const stuck = s.robots.some((r) => r.phase === "pilot_wait" && s.t - r.since > 30);
  if (stuck && s.pilots.length < 10) {
    rows.unshift({ key: "rec-pilot", level: "rec", robot: null, title: "Add a pilot", detail: "Robots wait for a pilot", wait: 0 });
  }
  return rows;
}

export function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export function fmtClock(sec: number): string {
  const t = Math.floor(6 * 3600 + sec); // shift starts 06:00
  const h = Math.floor(t / 3600) % 24;
  const m = Math.floor((t % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function robotName(i: number) {
  return `R${String(i + 1).padStart(2, "0")}`;
}
