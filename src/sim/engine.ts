// Discrete-time simulation of one 3PL site: human pickers fill totes,
// 20 OP1 robots pack each tote into a mailer, and remote pilots take over
// when a robot cannot finish a grasp. All times are in simulated seconds.

import { BRANDS, CLASS_BASE, GRASP_CLASSES, type GraspClass, type Item } from "./catalog";

// ---------- Layout (SVG units; 10 units = 1 m) ----------

export const VIEW_W = 1200;

// Pick floor: one row of 10 racks, one per brand. An aisle runs on each
// side of every rack, so a picker reaches each container from the aisle
// next to its column. The front aisle connects the aisles to the pack line.
export const FLOOR_X0 = 32;
export const RACK_COUNT = 10;
export const RACK_W = 96;
export const AISLE_W = (1136 - RACK_COUNT * RACK_W) / (RACK_COUNT + 1);
export const RACK_PITCH = RACK_W + AISLE_W;
// Only the vertical distance from the front aisle to each container counts
// for the sim, so RACK_Y and RACK_HEAD change the picture, not the timing.
export const RACK_Y = 12;
export const RACK_HEAD = 30;
export const RACK_COLS = 2;
export const RACK_ROWS = 5;
export const CELL_W = 43;
export const CELL_H = 62;
export const CELL_GAP = 4;
export const RACK_H = RACK_HEAD + RACK_ROWS * CELL_H + (RACK_ROWS - 1) * CELL_GAP + 6;
export const AISLE_Y = RACK_Y + RACK_H + 22;

// The pack line spans the same x range as the racks.
export const LINE_X0 = FLOOR_X0 + AISLE_W;
export const LINE_X1 = FLOOR_X0 + 1136 - AISLE_W;

export const ROBOT_COUNT = 20;
export const ROBOT_W = 42;
export const BIN_W = 116;
export const BIN_X = LINE_X1 - BIN_W;
export const ROBOT_X0 = LINE_X0;
export const ROBOT_PITCH = (BIN_X - 20 - ROBOT_X0 - ROBOT_W) / (ROBOT_COUNT - 1);
export const DROP_Y = AISLE_Y + 56;
export const ROBOT_Y = DROP_Y + 128;
export const ROBOT_H = 64;
export const QUEUE_CAP = 6;

export const CONVEYOR_X0 = LINE_X0;
// The gap under each robot holds its pilot badge.
export const CONVEYOR_Y = ROBOT_Y + ROBOT_H + 32;
export const CONVEYOR_H = 22;

// Pilot seats, under the belt.
export const PILOT_Y = CONVEYOR_Y + CONVEYOR_H + 22;
export const SEAT_H = 32;
export const VIEW_H = PILOT_Y + SEAT_H + 12;

const WALK_SPEED = 15; // units/s (1.5 m/s)
export const CONVEYOR_SPEED = 8; // units/s (0.8 m/s)
export const STEP = 0.1; // fixed sim step, seconds

export interface Pt {
  x: number;
  y: number;
}

export function rackX(b: number) {
  return FLOOR_X0 + AISLE_W + b * RACK_PITCH;
}

// Center line of aisle i. Aisle b is left of rack b; aisle b + 1 is right of it.
export function aisleX(i: number) {
  return FLOOR_X0 + AISLE_W / 2 + i * RACK_PITCH;
}

export function cellPos(b: number, i: number): Pt {
  return {
    x: rackX(b) + 3 + (i % RACK_COLS) * (CELL_W + CELL_GAP),
    y: RACK_Y + RACK_HEAD + Math.floor(i / RACK_COLS) * (CELL_H + CELL_GAP),
  };
}

export function robotX(i: number) {
  return ROBOT_X0 + i * ROBOT_PITCH;
}

export function robotCx(i: number) {
  return robotX(i) + ROBOT_W / 2;
}

// In the same aisle, walk straight along it. Otherwise walk to the front
// aisle, along it, then up or down to the target.
function route(p: Pt, t: Pt): Pt[] {
  if (Math.abs(p.x - t.x) < 0.5) return [{ x: t.x, y: t.y }];
  return [
    { x: p.x, y: AISLE_Y },
    { x: t.x, y: AISLE_Y },
    { x: t.x, y: t.y },
  ];
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

// normal: no color. watch: red tint, not a problem yet. act: solid red, a
// human must act.
export type Status = "normal" | "watch" | "act";

export type OrderStatus = "queued" | "picking" | "staged" | "packing" | "conveyor";

export interface Order {
  id: number;
  brand: number;
  items: number[]; // indexes into the brand's items, all different
  packed: number; // items already in the mailer
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
  stepDur: number; // full length of the current step
  done: number; // ring weight finished on the current item
}

export interface Stop extends Pt {
  item: number; // index into the order's brand items
}

export interface Picker {
  id: number;
  x: number;
  y: number;
  path: Pt[];
  stops: Stop[];
  task: "idle" | "to_item" | "pick" | "to_robot";
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
  pilots: Pilot[]; // sorted by id; ids are 1 to 10
  pilotTarget: number;
  pilotQueue: number[];
  mailers: Mailer[];
  shipped: number;
  pilotRate: Record<GraspClass, number>; // chance that an item needs a pilot (from the model)
  data: Record<GraspClass, number>; // samples logged per class: +1 each time an item of it is packed
  trained: Record<GraspClass, number>; // samples per class in the deployed model
  model: number; // model version; +1 on each training
  recent: boolean[]; // last 100 packed orders: true = no pilot
  packTimes: number[]; // sim times of packed orders, last hour
  stock: number[][]; // units left, by brand and item
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
const PICK_TIME = 6; // seconds to take one item from a container

// A customer orders from one shop, so all items in an order come from one
// brand: 1 to 3 different items.
function newOrder(s: Sim, status: OrderStatus): Order {
  const brand = pickWeighted(s, BRANDS.map((b) => b.share));
  const r = rand(s);
  const n = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
  const items: number[] = [];
  while (items.length < n) {
    const i = Math.floor(rand(s) * BRANDS[brand].items.length);
    if (!items.includes(i)) items.push(i);
  }
  const o: Order = { id: s.nextId++, brand, items, packed: 0, status, robot: null, assists: 0 };
  s.orders.set(o.id, o);
  return o;
}

export function createSim(pilots = DEFAULT_PILOTS): Sim {
  const pilotRate = {} as Record<GraspClass, number>;
  const trained = {} as Record<GraspClass, number>;
  const data = {} as Record<GraspClass, number>;
  for (const c of GRASP_CLASSES) {
    pilotRate[c] = trainedPilotRate(c, 0);
    trained[c] = 0;
    data[c] = 0;
  }
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
    pilotQueue: [],
    mailers: [],
    shipped: 0,
    pilotRate,
    data,
    trained,
    model: 1,
    recent: [],
    packTimes: [],
    stock: [],
    flash: new Map(),
  };
  // Stock levels spread from a few units to a few hundred.
  s.stock = BRANDS.map((b) => b.items.map(() => Math.round(Math.exp(between(s, Math.log(2), Math.log(240))))));
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
      stepDur: 0,
      done: 0,
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
    s.pickers.push({ id: i + 1, x: 60 + i * (1080 / PICKERS), y: AISLE_Y, path: [], stops: [], task: "idle", order: null, robot: null, t: 0 });
  }
  setPilotTarget(s, pilots);
  s.nextArrival = -Math.log(1 - rand(s)) / ARRIVAL_RATE;
  return s;
}

// ---------- Controls ----------

export const MAX_PILOTS = 10;

// Each pilot has a fixed seat: a new pilot takes the lowest free number.
// When there are more pilots than the target, the pilots with the highest
// numbers leave: a free one at once, a busy one after its item.
export function setPilotTarget(s: Sim, n: number) {
  s.pilotTarget = Math.max(1, Math.min(MAX_PILOTS, n));
  while (s.pilots.length < s.pilotTarget) {
    let id = 1;
    while (s.pilots.some((p) => p.id === id)) id++;
    s.pilots.push({ id, robot: null });
    s.pilots.sort((a, b) => a.id - b.id);
  }
  for (let i = s.pilots.length - 1; i >= s.pilotTarget; i--) {
    if (s.pilots[i].robot === null) s.pilots.splice(i, 1);
  }
}

// True for a pilot that leaves after its item.
export function pilotLeaving(s: Sim, p: Pilot) {
  return s.pilots.indexOf(p) >= s.pilotTarget;
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
      // The wait step holds the expected pilot time; the ring uses it as a weight.
      const pilot = 15 + CLASS_BASE[cls].time * 1.9;
      steps.push({ phase: "pack", dur: d / 2, item: i }, { phase: "pilot_wait", dur: pilot, item: i });
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
  // Scan the tote first. Seal the mailer last, as part of the last item.
  steps[0].dur += between(s, 12, 18);
  steps.push({ phase: "pack", dur: between(s, 18, 26), item: o.items.length - 1 });
  if (rand(s) < FAULT_RATE) {
    const at = Math.floor(rand(s) * steps.length);
    const fault = FAULTS[Math.floor(rand(s) * FAULTS.length)];
    steps.splice(at, 0, { phase: "fault", dur: between(s, 90, 240), item: steps[at].item, fault });
  }
  return steps;
}

// Ring weight of a step. A fault or a regrasp counts as 0, so the ring
// stops while the robot is red and does not jump after.
function work(st: Step) {
  return st.phase === "fault" || st.phase === "regrasp" ? 0 : st.dur;
}

function enterStep(s: Sim, r: Robot) {
  const st = r.steps[0];
  r.phase = st.phase;
  r.t = st.dur;
  r.stepDur = st.dur;
  r.since = s.t;
  if (st.phase === "pilot_wait") s.pilotQueue.push(r.id);
}

function nextStep(s: Sim, r: Robot) {
  const o = s.orders.get(r.order!)!;
  const st = r.steps.shift()!;
  if (r.steps.length > 0 && r.steps[0].item === st.item) {
    r.done += work(st);
  } else {
    // The item is in the mailer: its cube leaves the tote, the ring starts
    // again for the next item, and the fleet logs one sample of its class.
    o.packed++;
    s.data[BRANDS[o.brand].items[o.items[st.item]].cls]++;
    r.done = 0;
  }
  if (r.steps.length > 0) {
    enterStep(s, r);
    return;
  }
  // All items are packed: the tote leaves and the mailer ships.
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
    r.done = 0;
    enterStep(s, r);
    return;
  }
  if (r.phase === "pilot_wait") return; // a pilot takes over in dispatchPilots
  r.t -= dt;
  if (r.t > 0) return;
  if (r.phase === "pilot") finishPilot(s, r);
  nextStep(s, r);
}

// The model does not change on its own: samples pile up until someone trains.
function finishPilot(s: Sim, r: Robot) {
  s.orders.get(r.order!)!.assists++;
  const p = s.pilots.find((x) => x.robot === r.id)!;
  if (pilotLeaving(s, p)) s.pilots.splice(s.pilots.indexOf(p), 1);
  p.robot = null;
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
    r.stepDur = r.t;
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

// One stop per item, in the aisle next to the item's container.
function pickStops(p: Picker, o: Order): Stop[] {
  const lane = ((p.id % 3) - 1) * 4; // spread pickers across the aisle
  const stops = o.items.map((item) => ({
    x: aisleX(o.brand + (item % RACK_COLS)) + lane,
    y: cellPos(o.brand, item).y + CELL_H / 2,
    item,
  }));
  // Nearer aisle first. In each aisle, start at the front.
  return stops.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x) || b.y - a.y);
}

function stepPicker(s: Sim, p: Picker, dt: number) {
  switch (p.task) {
    case "idle": {
      if (s.backlog.length === 0) return;
      const o = s.orders.get(s.backlog.shift()!)!;
      o.status = "picking";
      p.order = o.id;
      p.stops = pickStops(p, o);
      p.path = route(p, p.stops[0]);
      p.task = "to_item";
      return;
    }
    case "to_item":
      if (walk(p, dt)) {
        const o = s.orders.get(p.order!)!;
        const i = p.stops[0].item;
        s.flash.set(BRANDS[o.brand].items[i].sku, s.t);
        // A stocker refills a slot when the last unit is picked.
        if (--s.stock[o.brand][i] <= 0) s.stock[o.brand][i] = Math.round(between(s, 40, 200));
        p.task = "pick";
        p.t = PICK_TIME;
      }
      return;
    case "pick": {
      p.t -= dt;
      if (p.t > 0) return;
      if (p.stops.length > 1) {
        p.stops.shift();
        p.path = route(p, p.stops[0]);
        p.task = "to_item";
        return;
      }
      const r = chooseRobot(s, p.x);
      if (!r) {
        p.t = 2;
        return;
      }
      p.stops = [];
      r.incoming++;
      p.robot = r.id;
      p.path = route(p, { x: robotCx(r.id) + ((p.id % 3) - 1) * 6, y: DROP_Y });
      p.task = "to_robot";
      return;
    }
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
    // The bin covers the mailer before it leaves the belt.
    if (m.x >= BIN_X) {
      s.mailers.splice(i, 1);
      s.orders.delete(m.order);
      s.shipped++;
    }
  }

  while (s.packTimes.length > 0 && s.packTimes[0] < s.t - 3600) s.packTimes.shift();
}

// ---------- Read-only views for the UI ----------

// A pilot at work is normal: a human already acts. A robot between two
// totes is idle for one step, so "No tote" is a watch only after 10 s.
export function robotStatus(s: Sim, r: Robot): Status {
  switch (r.phase) {
    case "pack":
    case "pilot":
      return "normal";
    case "idle":
      return s.t - r.since >= 10 ? "watch" : "normal";
    case "regrasp":
      return "watch";
    default:
      return "act";
  }
}

// Share of the current item that is done, or null with no order. One full
// ring is one item. The ring stops during a regrasp, a pilot wait, or a
// fault, and moves while the robot or a pilot works on the item.
export function robotProgress(r: Robot): number | null {
  if (r.order === null || r.steps.length === 0) return null;
  const st = r.steps[0];
  let rest = 0;
  for (const x of r.steps) {
    if (x.item !== st.item) break;
    rest += work(x);
  }
  const moving = r.phase === "pack" || r.phase === "pilot";
  const now = moving && r.stepDur > 0 ? work(st) * (1 - Math.max(0, r.t) / r.stepDur) : 0;
  const total = r.done + rest;
  return total > 0 ? Math.min(1, (r.done + now) / total) : 0;
}

export function robotLabel(r: Robot): string {
  switch (r.phase) {
    case "idle":
      return "No tote";
    case "pack":
      return "Packing";
    case "regrasp":
      return "Regrasp";
    case "pilot_wait":
      return "Need pilot";
    case "pilot":
      return `Pilot ${r.pilot}`;
    case "fault":
      return "Fault";
  }
}

// The fault text of a robot in a fault, or null.
export function robotFault(r: Robot): string | null {
  return r.phase === "fault" ? (r.steps[0]?.fault ?? null) : null;
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

// ---------- Model ----------

// Pilot rate after training on `samples` of a class. An S-shaped learning
// curve: a few samples help a little, the big gain comes over the next 10 to
// 20, then returns flatten. At `learn` samples the base pilot rate halves.
export function trainedPilotRate(c: GraspClass, samples: number): number {
  const base = 1 - CLASS_BASE[c].reliability;
  return Math.max(0.01, base / (1 + Math.pow(samples / CLASS_BASE[c].learn, 1.5))); // at most 99%
}

// Reliability of the deployed model: chance to pack an item with no pilot.
export function classReliability(s: Sim, c: GraspClass): number {
  return 1 - s.pilotRate[c];
}

// Samples logged for a class so far.
export function classData(s: Sim, c: GraspClass): number {
  return s.data[c];
}

// Samples logged since the last training, all classes.
export function newData(s: Sim): number {
  return GRASP_CLASSES.reduce((n, c) => n + classData(s, c) - s.trained[c], 0);
}

// Train on all samples so far and deploy to every robot at once.
export function train(s: Sim) {
  for (const c of GRASP_CLASSES) {
    const n = classData(s, c);
    s.trained[c] = n;
    s.pilotRate[c] = trainedPilotRate(c, n);
  }
  s.model++;
}

export function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  return `${m}:${String(ss).padStart(2, "0")}`;
}

// 12-hour clock, for example "6:00 AM". The shift starts at 6:00 AM.
export function fmtClock(sec: number): string {
  const t = Math.floor(6 * 3600 + sec);
  const h = Math.floor(t / 3600) % 24;
  const m = Math.floor((t % 3600) / 60);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Robots are numbered 1 to 20 on the floor.
export function robotNumber(i: number) {
  return i + 1;
}
