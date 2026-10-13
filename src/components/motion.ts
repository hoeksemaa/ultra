// Screen positions for the things that move on the pack line. The sim says
// where each tote, cube, and mailer belongs; the view slides it there, so
// nothing jumps, appears, or vanishes in place.
import { BIN_X, CONVEYOR_SPEED, CONVEYOR_Y, DROP_Y, ROBOT_W, ROBOT_Y, robotCx, robotX, type Order, type Sim } from "@/sim/engine";

export const TOTE_W = 30;
export const TOTE_H = 12;
export const TOTE_PITCH = 16;
export const CUBE = 6;
export const CUBE_GAP = 2;
export const MAILER_W = 14;
export const MAILER_H = 12;

// Pack area inside the robot body, where packed cubes wait for the mailer.
export const PACK_X = 6;
export const PACK_Y = 44;
const MAILER_UP = ROBOT_Y + PACK_Y - 3; // mailer top while it forms in the robot
const MAILER_DOWN = CONVEYOR_Y + 5; // mailer top on the belt

const TAU = 0.1; // real seconds for a slide to cover 63% of the way
const DEPOSIT = 0.35; // real seconds for the robot to set a mailer on the belt
const NEAR = 0.2; // snap when this close (SVG units)

interface Body {
  x: number;
  y: number;
  tx: number;
  ty: number;
}

export interface ToteView extends Body {
  order: number;
  active: boolean; // in work at the robot
  leaving: boolean; // empty, sliding into the robot's tote return
}

export interface CubeView extends Body {
  order: number;
}

export interface MailerView {
  order: number;
  info: Order; // kept so the order queue can list it until it is in the bin
  x: number;
  y: number;
  // pack: cubes still sliding into the robot (mailer not drawn yet)
  // drop: set straight down onto the belt
  // belt: carried at belt speed, then removed under the bin
  stage: "pack" | "drop" | "belt";
  drop: number; // 0..1 through the deposit
}

export interface View {
  fresh: boolean;
  t: number; // sim time at the last update
  totes: Map<number, ToteView>;
  cubes: Map<string, CubeView>; // packed cubes inside a robot
  mailers: Map<number, MailerView>;
}

export function createView(): View {
  return { fresh: true, t: 0, totes: new Map(), cubes: new Map(), mailers: new Map() };
}

export function toteX(robot: number) {
  return robotX(robot) + (ROBOT_W - TOTE_W) / 2;
}

// Slot 0 is the tote in work, next to the robot. Queued totes stack above it.
export function toteY(slot: number) {
  return ROBOT_Y - 6 - (slot + 1) * TOTE_PITCH;
}

// Cubes sit left-aligned in a tote. The first item packed is the rightmost
// cube, so cubes leave from right to left.
export function cubeSlot(n: number, item: number) {
  return n - 1 - item;
}

export function cubeInTote(tote: { x: number; y: number }, slot: number) {
  return { x: tote.x + 3 + slot * (CUBE + CUBE_GAP), y: tote.y + (TOTE_H - CUBE) / 2 };
}

function ease(b: Body, k: number): boolean {
  b.x += (b.tx - b.x) * k;
  b.y += (b.ty - b.y) * k;
  if (Math.abs(b.tx - b.x) < NEAR) b.x = b.tx;
  if (Math.abs(b.ty - b.y) < NEAR) b.y = b.ty;
  return b.x !== b.tx || b.y !== b.ty;
}

// Move the view one frame toward the sim. Returns true while anything slides.
export function updateView(v: View, s: Sim, dt: number): boolean {
  const snap = v.fresh;
  v.fresh = false;
  const simDt = snap ? 0 : s.t - v.t; // 0 while paused
  v.t = s.t;

  // Totes at a robot: in work (slot 0) or queued (slot 1 and up).
  const atRobot = new Set<number>();
  for (const r of s.robots) {
    const slots = [r.order, ...r.queue];
    slots.forEach((id, slot) => {
      if (id === null) return;
      atRobot.add(id);
      const tx = toteX(r.id);
      const ty = toteY(slot);
      let t = v.totes.get(id);
      if (!t) {
        // A new tote comes from the picker at the drop point and slides down.
        t = { order: id, x: tx, y: snap ? ty : DROP_Y - TOTE_H / 2, tx, ty, active: false, leaving: false };
        v.totes.set(id, t);
      }
      t.tx = tx;
      t.ty = ty;
      t.active = slot === 0 && r.order === id;
    });
  }

  // Packed cubes slide from the tote into the robot's pack area.
  const addCubes = (orderId: number, robot: number, upTo: number) => {
    const o = s.orders.get(orderId)!;
    const tote = v.totes.get(orderId);
    for (let i = 0; i < upTo; i++) {
      const key = `${orderId}:${i}`;
      if (v.cubes.has(key)) continue;
      const tx = robotX(robot) + PACK_X + i * (CUBE + CUBE_GAP);
      const ty = ROBOT_Y + PACK_Y;
      const from = !snap && tote ? cubeInTote(tote, cubeSlot(o.items.length, i)) : { x: tx, y: ty };
      v.cubes.set(key, { order: orderId, x: from.x, y: from.y, tx, ty });
    }
  };
  for (const r of s.robots) {
    if (r.order !== null) addCubes(r.order, r.id, s.orders.get(r.order)!.packed);
  }

  // A finished order: when its last cube is in the robot, the cubes become a
  // mailer. The robot sets it straight down on the belt, and the belt carries
  // it at belt speed into the bin. After it forms, the mailer moves on its
  // own clock, so it never has to catch up with the sim.
  for (const m of s.mailers) {
    if (v.mailers.has(m.order)) continue;
    const o = s.orders.get(m.order)!;
    addCubes(o.id, o.robot!, o.items.length);
    v.mailers.set(m.order, { order: m.order, info: o, x: robotCx(o.robot!) - MAILER_W / 2, y: MAILER_UP, stage: "pack", drop: 0 });
  }
  let moving = false;
  for (const [id, mv] of v.mailers) {
    if (mv.stage === "pack") {
      const cubes = [...v.cubes.entries()].filter(([, c]) => c.order === id);
      if (snap || cubes.every(([, c]) => c.x === c.tx && c.y === c.ty)) {
        for (const [key] of cubes) v.cubes.delete(key);
        mv.stage = "drop";
      }
    }
    if (mv.stage === "drop") {
      mv.drop = snap ? 1 : Math.min(1, mv.drop + dt / DEPOSIT);
      const e = mv.drop * mv.drop * (3 - 2 * mv.drop); // ease in and out
      mv.y = MAILER_UP + (MAILER_DOWN - MAILER_UP) * e;
      moving = true;
      if (mv.drop >= 1) mv.stage = "belt";
    } else if (mv.stage === "belt") {
      mv.x += CONVEYOR_SPEED * simDt;
      // The bin covers the mailer now; the sim already counted it.
      if (mv.x >= BIN_X) v.mailers.delete(id);
    }
  }

  // An empty tote slides down into the robot's tote return, behind the body.
  for (const t of v.totes.values()) {
    if (!atRobot.has(t.order) && !t.leaving) {
      t.leaving = true;
      t.active = false;
      t.ty = ROBOT_Y + 14;
    }
  }

  const k = 1 - Math.exp(-dt / TAU);
  for (const [id, t] of v.totes) {
    if (ease(t, k)) moving = true;
    else if (t.leaving) v.totes.delete(id);
  }
  for (const [key, c] of v.cubes) {
    // An order can finish and ship between two frames at 60x; drop its cubes.
    if (!s.orders.has(c.order) && !v.mailers.has(c.order)) v.cubes.delete(key);
    else if (ease(c, k)) moving = true;
  }
  return moving;
}
