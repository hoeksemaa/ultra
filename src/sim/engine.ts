// Discrete-time simulation of one 3PL site: human pickers fill totes,
// 20 OP1 robots pack each tote into a mailer, and remote pilots take over
// when a robot cannot finish a grasp. All times are in simulated seconds.

import { BRANDS, CLASS_BASE, GRASP_CLASSES, type GraspClass, type Item } from "./catalog";

// ---------- Layout (SVG units; 10 units = 1 m) ----------

export const VIEW_W = 1200;
export const VIEW_H = 860;

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

export const TECH_HOME = { x: 1110, y: FRONT_AISLE_Y };

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

export type Phase =
  | "idle"
  | "scan"
  | "pack"
  | "regrasp"
  | "pilot_wait"
  | "pilot"
  | "seal"
  | "place"
  | "fault_wait"
  | "fault_fix";

export type Light = "ok" | "watch" | "fault" | "idle";

export type OrderStatus = "queued" | "picking" | "staged" | "packing" | "conveyor";

export interface Order {
  id: number;
  brand: number;
  items: number[];
  status: OrderStatus;
  robot: number | null;
  created: number;
  assists: number;
}

interface Step {
  phase: "pack" | "regrasp" | "pilot_wait";
  dur: number;
}

export interface Robot {
  id: number;
  queue: number[];
  incoming: number;
  order: number | null;
  item: number;
  steps: Step[];
  phase: Phase;
  t: number;
  since: number;
  pilot: number | null;
  fault: string | null;
  resume: { phase: Phase; t: number } | null;
  itemsPacked: number;
  ordersPacked: number;
  assists: number;
  faults: number;
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
  since: number;
}

export interface Tech {
  x: number;
  y: number;
  path: Pt[];
  robot: number | null;
  task: "idle" | "walk" | "fix" | "return";
  t: number;
}

export interface Mailer {
  order: number;
  brand: number;
  x: number;
}

export interface Skill {
  regrasp: number;
  pilot: number;
  pilot0: number;
  episodes: number;
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
  pickerTarget: number;
  nextPickerId: number;
  pilots: Pilot[];
  pilotTarget: number;
  nextPilotId: number;
  pilotQueue: number[];
  pilotUse: number; // moving average of pilot utilization (0..1)
  tech: Tech;
  faultQueue: number[];
  mailers: Mailer[];
  bin: { count: number; cap: number; shipped: number; trucks: number; truckAt: number };
  skill: Record<GraspClass, Skill>;
  recent: boolean[]; // last 200 packed orders: true = no pilot assist
  packTimes: number[]; // sim times of packed orders, last hour
  waits: number[]; // last 20 pilot waits, seconds
  flash: Map<string, number>; // sku -> sim time of last pick
  stats: { items: number; orders: number; assists: number; faults: number; regrasps: number };
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
export const DEFAULT_PICKERS = 16;
const ARRIVAL_RATE = 0.175; // orders per second (630 per hour)
const BACKLOG_CAP = 150;

function newOrder(s: Sim, status: OrderStatus): Order {
  const brand = pickWeighted(s, BRANDS.map((b) => b.share));
  const r = rand(s);
  const n = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
  const items: number[] = [];
  while (items.length < n) {
    const i = Math.floor(rand(s) * BRANDS[brand].items.length);
    if (!items.includes(i)) items.push(i);
  }
  const o: Order = { id: s.nextId++, brand, items, status, robot: null, created: s.t, assists: 0 };
  s.orders.set(o.id, o);
  return o;
}

function newPicker(s: Sim, x: number): Picker {
  return { id: s.nextPickerId++, x, y: FRONT_AISLE_Y, path: [], task: "idle", order: null, robot: null, t: 0 };
}

export function createSim(pilots = DEFAULT_PILOTS, pickers = DEFAULT_PICKERS): Sim {
  const skill = {} as Record<GraspClass, Skill>;
  for (const c of GRASP_CLASSES) {
    const b = CLASS_BASE[c];
    skill[c] = { regrasp: b.regrasp, pilot: b.pilot, pilot0: b.pilot, episodes: 0 };
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
    pickerTarget: pickers,
    nextPickerId: 1,
    pilots: [],
    pilotTarget: pilots,
    nextPilotId: 1,
    pilotQueue: [],
    pilotUse: 0.5,
    tech: { ...TECH_HOME, path: [], robot: null, task: "idle", t: 0 },
    faultQueue: [],
    mailers: [],
    bin: { count: 0, cap: 150, shipped: 0, trucks: 0, truckAt: -1e9 },
    skill,
    recent: [],
    packTimes: [],
    waits: [],
    flash: new Map(),
    stats: { items: 0, orders: 0, assists: 0, faults: 0, regrasps: 0 },
  };
  for (let i = 0; i < ROBOT_COUNT; i++) {
    const r: Robot = {
      id: i,
      queue: [],
      incoming: 0,
      order: null,
      item: 0,
      steps: [],
      phase: "idle",
      t: 0,
      since: 0,
      pilot: null,
      fault: null,
      resume: null,
      itemsPacked: 0,
      ordersPacked: 0,
      assists: 0,
      faults: 0,
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
  for (let i = 0; i < pickers; i++) s.pickers.push(newPicker(s, 60 + i * (980 / pickers)));
  for (let i = 0; i < pilots; i++) s.pilots.push({ id: s.nextPilotId++, robot: null, since: 0 });
  s.nextArrival = -Math.log(1 - rand(s)) / ARRIVAL_RATE;
  return s;
}

// ---------- Controls ----------

export function setPilotTarget(s: Sim, n: number) {
  s.pilotTarget = Math.max(1, Math.min(10, n));
  while (s.pilots.length < s.pilotTarget) s.pilots.push({ id: s.nextPilotId++, robot: null, since: s.t });
  // Remove free pilots now; busy pilots leave when they finish.
  for (let i = s.pilots.length - 1; i >= 0 && s.pilots.length > s.pilotTarget; i--) {
    if (s.pilots[i].robot === null) s.pilots.splice(i, 1);
  }
}

export function setPickerTarget(s: Sim, n: number) {
  s.pickerTarget = Math.max(4, Math.min(30, n));
  while (s.pickers.length < s.pickerTarget) s.pickers.push(newPicker(s, TECH_HOME.x - 40));
  for (let i = s.pickers.length - 1; i >= 0 && s.pickers.length > s.pickerTarget; i--) {
    if (s.pickers[i].task === "idle") s.pickers.splice(i, 1);
  }
}

// ---------- Robots ----------

export function currentItem(s: Sim, r: Robot): Item | null {
  if (r.order === null) return null;
  const o = s.orders.get(r.order);
  if (!o || r.item >= o.items.length) return null;
  return BRANDS[o.brand].items[o.items[r.item]];
}

const FAULTS_PACK = ["GRIPPER L TORQUE", "GRIPPER R TORQUE", "WRIST CAM NO FRAMES", "MAILER FEED JAM"];

function fault(s: Sim, r: Robot, msg: string) {
  const q = s.pilotQueue.indexOf(r.id);
  if (q >= 0) s.pilotQueue.splice(q, 1);
  r.resume = { phase: r.phase, t: r.t };
  r.phase = "fault_wait";
  r.fault = msg;
  r.since = s.t;
  r.flash = s.t;
  r.faults++;
  s.stats.faults++;
  s.faultQueue.push(r.id);
}

function setPhase(s: Sim, r: Robot, phase: Phase, t: number) {
  r.phase = phase;
  r.t = t;
  r.since = s.t;
}

function startItem(s: Sim, r: Robot) {
  const o = s.orders.get(r.order!)!;
  if (r.item >= o.items.length) {
    setPhase(s, r, "seal", between(s, 15, 22));
    if (rand(s) < 0.004) fault(s, r, "LABEL PRINTER JAM");
    return;
  }
  const item = BRANDS[o.brand].items[o.items[r.item]];
  const k = s.skill[item.cls];
  const d = CLASS_BASE[item.cls].time * between(s, 0.85, 1.15);
  const x = rand(s);
  if (x < k.pilot) {
    r.steps = rand(s) < 0.6
      ? [
          { phase: "pack", dur: d * 0.5 },
          { phase: "regrasp", dur: between(s, 12, 22) },
          { phase: "pack", dur: d * 0.3 },
          { phase: "pilot_wait", dur: 0 },
        ]
      : [
          { phase: "pack", dur: d * 0.5 },
          { phase: "pilot_wait", dur: 0 },
        ];
  } else if (x < k.pilot + k.regrasp) {
    r.steps = [
      { phase: "pack", dur: d * 0.5 },
      { phase: "regrasp", dur: between(s, 12, 22) },
      { phase: "pack", dur: d * 0.5 },
    ];
  } else {
    r.steps = [{ phase: "pack", dur: d }];
  }
  enterStep(s, r);
  if (rand(s) < 0.002) fault(s, r, FAULTS_PACK[Math.floor(rand(s) * FAULTS_PACK.length)]);
}

function enterStep(s: Sim, r: Robot) {
  const st = r.steps[0];
  setPhase(s, r, st.phase, st.dur);
  if (st.phase === "regrasp") {
    r.flash = s.t;
    s.stats.regrasps++;
  }
  if (st.phase === "pilot_wait") {
    r.flash = s.t;
    s.pilotQueue.push(r.id);
  }
}

function itemDone(s: Sim, r: Robot) {
  r.itemsPacked++;
  s.stats.items++;
  r.item++;
  r.steps = [];
  startItem(s, r);
}

function stepRobot(s: Sim, r: Robot, dt: number) {
  switch (r.phase) {
    case "idle": {
      if (r.queue.length === 0) return;
      const id = r.queue.shift()!;
      const o = s.orders.get(id)!;
      o.status = "packing";
      r.order = id;
      r.item = 0;
      setPhase(s, r, "scan", between(s, 12, 18));
      if (rand(s) < 0.003) fault(s, r, "TOTE SCAN FAILED 3×");
      return;
    }
    case "scan":
      r.t -= dt;
      if (r.t <= 0) startItem(s, r);
      return;
    case "pack":
    case "regrasp":
      r.t -= dt;
      if (r.t <= 0) {
        r.steps.shift();
        if (r.steps.length === 0) itemDone(s, r);
        else enterStep(s, r);
      }
      return;
    case "pilot":
      r.t -= dt;
      if (r.t <= 0) finishPilot(s, r);
      return;
    case "seal":
      r.t -= dt;
      if (r.t <= 0) setPhase(s, r, "place", 4);
      return;
    case "place":
      r.t -= dt;
      if (r.t <= 0) {
        const o = s.orders.get(r.order!)!;
        o.status = "conveyor";
        s.mailers.push({ order: o.id, brand: o.brand, x: robotCx(r.id) - 7 });
        r.ordersPacked++;
        s.stats.orders++;
        s.recent.push(o.assists === 0);
        if (s.recent.length > 200) s.recent.shift();
        s.packTimes.push(s.t);
        r.order = null;
        setPhase(s, r, "idle", 0);
      }
      return;
    default:
      // pilot_wait, fault_wait, fault_fix: a human moves the robot on.
      return;
  }
}

function finishPilot(s: Sim, r: Robot) {
  const item = currentItem(s, r);
  if (item) {
    // Each pilot episode adds training data. The shared policy gets a little
    // better at this item class on every robot in the fleet.
    const k = s.skill[item.cls];
    k.pilot = Math.max(0.01, k.pilot * 0.975);
    k.regrasp = Math.max(0.02, k.regrasp * 0.99);
    k.episodes++;
  }
  const o = s.orders.get(r.order!)!;
  o.assists++;
  r.assists++;
  s.stats.assists++;
  const p = s.pilots.find((x) => x.id === r.pilot);
  if (p) {
    p.robot = null;
    p.since = s.t;
    if (s.pilots.length > s.pilotTarget) s.pilots.splice(s.pilots.indexOf(p), 1);
  }
  r.pilot = null;
  itemDone(s, r);
}

function dispatchPilots(s: Sim) {
  while (s.pilotQueue.length > 0) {
    const p = s.pilots.find((x) => x.robot === null);
    if (!p) return;
    const r = s.robots[s.pilotQueue.shift()!];
    const item = currentItem(s, r);
    const base = item ? CLASS_BASE[item.cls].time : 45;
    p.robot = r.id;
    p.since = s.t;
    r.pilot = p.id;
    s.waits.push(s.t - r.since);
    if (s.waits.length > 20) s.waits.shift();
    setPhase(s, r, "pilot", between(s, 10, 20) + base * between(s, 1.2, 2.6));
  }
}

// ---------- Floor tech ----------

function stepTech(s: Sim, dt: number) {
  const k = s.tech;
  if (k.task === "idle" || k.task === "return") {
    if (s.faultQueue.length > 0) {
      const r = s.robots[s.faultQueue.shift()!];
      k.robot = r.id;
      k.path = route(k, { x: robotCx(r.id) + 14, y: DROP_Y + 10 });
      k.task = "walk";
    } else if (k.task === "return" && walk(k, dt)) {
      k.task = "idle";
    }
    return;
  }
  if (k.task === "walk") {
    if (walk(k, dt)) {
      k.task = "fix";
      k.t = between(s, 90, 240);
      const r = s.robots[k.robot!];
      setPhase(s, r, "fault_fix", 0);
    }
    return;
  }
  if (k.task === "fix") {
    k.t -= dt;
    if (k.t <= 0) {
      const r = s.robots[k.robot!];
      const back = r.resume ?? { phase: "idle" as Phase, t: 0 };
      r.fault = null;
      r.resume = null;
      setPhase(s, r, back.phase, back.t);
      if (back.phase === "pilot_wait") s.pilotQueue.push(r.id);
      k.robot = null;
      k.task = "return";
      k.path = route(k, TECH_HOME);
    }
  }
}

// ---------- Pickers ----------

function chooseRobot(s: Sim, x: number): Robot | null {
  let best: Robot | null = null;
  let bestScore = Infinity;
  for (const r of s.robots) {
    const load = r.queue.length + r.incoming;
    if (load >= QUEUE_CAP) continue;
    const down = r.phase === "fault_wait" || r.phase === "fault_fix" ? 3 : 0;
    const score = load + (r.order !== null ? 1 : 0) + down + Math.abs(robotCx(r.id) - x) / 2000;
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
      if (s.pickers.length > s.pickerTarget) {
        s.pickers.splice(s.pickers.indexOf(p), 1);
        return;
      }
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

  for (const p of [...s.pickers]) stepPicker(s, p, dt);
  for (const r of s.robots) stepRobot(s, r, dt);
  dispatchPilots(s);
  stepTech(s, dt);

  // Conveyor to the outbound bin.
  for (let i = s.mailers.length - 1; i >= 0; i--) {
    const m = s.mailers[i];
    m.x += CONVEYOR_SPEED * dt;
    if (m.x >= BIN_X - 4) {
      s.mailers.splice(i, 1);
      s.orders.delete(m.order);
      s.bin.count++;
      if (s.bin.count >= s.bin.cap) {
        s.bin.shipped += s.bin.count;
        s.bin.count = 0;
        s.bin.trucks++;
        s.bin.truckAt = s.t;
      }
    }
  }

  const busy = s.pilots.filter((p) => p.robot !== null).length / Math.max(1, s.pilots.length);
  s.pilotUse += (busy - s.pilotUse) * (dt / 600);

  while (s.packTimes.length > 0 && s.packTimes[0] < s.t - 3600) s.packTimes.shift();
}

// ---------- Read-only views for the UI ----------

export function robotLight(r: Robot): Light {
  switch (r.phase) {
    case "scan":
    case "pack":
    case "seal":
    case "place":
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
    case "scan":
      return "SCANNING";
    case "pack":
      return "PACKING";
    case "regrasp":
      return "REGRASP";
    case "pilot_wait":
      return "PILOT NEEDED";
    case "pilot":
      return `PILOT P${r.pilot}`;
    case "seal":
      return "SEALING";
    case "place":
      return "TO CONVEYOR";
    case "fault_wait":
      return "FAULT";
    case "fault_fix":
      return "TECH FIXING";
  }
}

export function robotShortLabel(r: Robot): string {
  switch (r.phase) {
    case "idle":
      return "NO TOTE";
    case "scan":
      return "SCAN";
    case "pack":
      return "PACK";
    case "regrasp":
      return "REGRASP";
    case "pilot_wait":
      return "NEED PILOT";
    case "pilot":
      return `PILOT P${r.pilot}`;
    case "seal":
      return "SEAL";
    case "place":
      return "PLACE";
    case "fault_wait":
      return "FAULT";
    case "fault_fix":
      return "FIXING";
  }
}

export function ordersPerHour(s: Sim): number {
  const window = Math.min(s.t, 3600);
  if (window < 120) return 0;
  return (s.packTimes.length * 3600) / window;
}

export function autonomy(s: Sim): number | null {
  if (s.recent.length < 10) return null;
  return s.recent.filter(Boolean).length / s.recent.length;
}

export function avgWait(s: Sim): number | null {
  if (s.waits.length === 0) return null;
  return s.waits.reduce((a, b) => a + b, 0) / s.waits.length;
}

export function classAutonomy(s: Sim, c: GraspClass): number {
  return 1 - s.skill[c].pilot;
}

export function brandAutonomy(s: Sim, b: number): number {
  const items = BRANDS[b].items;
  return items.reduce((a, it) => a + (1 - s.skill[it.cls].pilot), 0) / items.length;
}

export interface Action {
  key: string;
  level: "fault" | "watch" | "rec";
  robot: number | null;
  title: string;
  detail: string;
  wait: number | null;
  button?: { label: string; cmd: "pilot+" | "pilot-" | "picker+" };
}

export function actions(s: Sim): Action[] {
  const out: Action[] = [];
  const waiting = s.robots.filter((r) => r.phase === "pilot_wait");
  const starved = s.robots.filter((r) => r.phase === "idle" && s.t - r.since > 20);
  const w = avgWait(s);

  if (waiting.length >= 2 && (w ?? 0) > 40 && s.pilots.length < 10) {
    out.push({
      key: "rec-pilot",
      level: "rec",
      robot: null,
      title: "ADD A PILOT",
      detail: `${waiting.length} robots wait for a pilot · avg wait ${fmtDur(w ?? 0)}`,
      wait: null,
      button: { label: "+1 PILOT", cmd: "pilot+" },
    });
  } else if (s.t > 900 && s.pilotUse < 0.35 && s.pilots.length > 1 && waiting.length === 0) {
    out.push({
      key: "rec-pilot-less",
      level: "rec",
      robot: null,
      title: "PILOTS UNDERUSED",
      detail: `Pilot use ${Math.round(s.pilotUse * 100)}% (10 min avg) · ${(ROBOT_COUNT / Math.max(1, s.pilots.length - 1)).toFixed(1)} robots per pilot with one less`,
      wait: null,
      button: { label: "−1 PILOT", cmd: "pilot-" },
    });
  }
  if (starved.length >= 3 && s.pickers.length < 30) {
    out.push({
      key: "rec-picker",
      level: "rec",
      robot: null,
      title: "PICKERS BEHIND",
      detail: `${starved.length} robots have no tote · ${s.backlog.length} orders wait in the WMS`,
      wait: null,
      button: { label: "+2 PICKERS", cmd: "picker+" },
    });
  }

  const robotRows: Action[] = [];
  for (const r of s.robots) {
    const item = currentItem(s, r);
    const itemText = item ? `${item.name} · ${CLASS_BASE[item.cls].label.toLowerCase()}` : "";
    const wait = s.t - r.since;
    if (r.phase === "pilot_wait") {
      const pos = s.pilotQueue.indexOf(r.id) + 1;
      robotRows.push({
        key: `r${r.id}`,
        level: "fault",
        robot: r.id,
        title: "PILOT NEEDED",
        detail: `${itemText} · grasp failed · queue #${pos}`,
        wait,
      });
    } else if (r.phase === "pilot") {
      robotRows.push({
        key: `r${r.id}`,
        level: "fault",
        robot: r.id,
        title: `PILOT P${r.pilot} IN CONTROL`,
        detail: `${itemText} · teleop · new training data`,
        wait,
      });
    } else if (r.phase === "fault_wait") {
      robotRows.push({
        key: `r${r.id}`,
        level: "fault",
        robot: r.id,
        title: "FAULT",
        detail: `${r.fault} · floor tech ${s.tech.robot === r.id ? "on the way" : `queue #${s.faultQueue.indexOf(r.id) + 1}`}`,
        wait,
      });
    } else if (r.phase === "fault_fix") {
      robotRows.push({
        key: `r${r.id}`,
        level: "fault",
        robot: r.id,
        title: "TECH FIXING",
        detail: `${r.fault} · floor tech on site`,
        wait,
      });
    } else if (r.phase === "regrasp") {
      robotRows.push({
        key: `r${r.id}`,
        level: "watch",
        robot: r.id,
        title: "REGRASP",
        detail: `${itemText} · robot tries again alone`,
        wait,
      });
    } else if (r.phase === "idle" && wait > 5) {
      robotRows.push({
        key: `r${r.id}`,
        level: "watch",
        robot: r.id,
        title: "NO TOTE",
        detail: `Infeed queue empty · ${r.incoming > 0 ? "picker on the way" : "no picker assigned"}`,
        wait,
      });
    }
  }
  // Humans must act on the oldest red first. A robot that waits for a human
  // comes before a robot that a human already works on.
  const rank = (a: Action) =>
    a.level === "fault" ? (a.title === "PILOT NEEDED" || a.title === "FAULT" ? 0 : 1) : 2;
  robotRows.sort((a, b) => rank(a) - rank(b) || (b.wait ?? 0) - (a.wait ?? 0));
  return [...out, ...robotRows];
}

export function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export function fmtClock(sec: number): string {
  const start = 6 * 3600; // shift starts 06:00
  const t = Math.floor(start + sec);
  const h = Math.floor(t / 3600) % 24;
  const m = Math.floor((t % 3600) / 60);
  const ss = t % 60;
  return [h, m, ss].map((v) => String(v).padStart(2, "0")).join(":");
}

export function robotName(i: number) {
  return `R${String(i + 1).padStart(2, "0")}`;
}
