// Screen positions for the things that move on the pack line. The sim says
// where each tote, cube, and mailer belongs; the view slides it there, so
// nothing jumps, appears, or vanishes in place.
import { BIN_X, CONVEYOR_Y, DROP_Y, ROBOT_W, ROBOT_Y, robotX, type Sim } from "@/sim/engine";

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

const TAU = 0.1; // real seconds for a slide to cover 63% of the way
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

export interface MailerView extends Body {
  order: number;
  // pack: cubes still sliding into the robot (mailer not drawn yet)
  // drop: sliding out of the robot onto the belt
  // belt: follows the belt; gone: slides under the bin, then is removed
  stage: "pack" | "drop" | "belt" | "gone";
}

export interface View {
  fresh: boolean;
  totes: Map<number, ToteView>;
  cubes: Map<string, CubeView>; // packed cubes inside a robot
  mailers: Map<number, MailerView>;
}

export function createView(): View {
  return { fresh: true, totes: new Map(), cubes: new Map(), mailers: new Map() };
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
  // mailer. The mailer slides out onto the belt, then the belt carries it.
  const onBelt = new Set<number>();
  for (const m of s.mailers) {
    onBelt.add(m.order);
    const o = s.orders.get(m.order)!;
    let mv = v.mailers.get(m.order);
    if (!mv) {
      addCubes(o.id, o.robot!, o.items.length);
      mv = { order: m.order, x: m.x, y: ROBOT_Y + PACK_Y - 3, tx: m.x, ty: ROBOT_Y + PACK_Y - 3, stage: "pack" };
      v.mailers.set(m.order, mv);
    }
    if (mv.stage === "pack") {
      const cubes = [...v.cubes.entries()].filter(([, c]) => c.order === m.order);
      if (snap || cubes.every(([, c]) => c.x === c.tx && c.y === c.ty)) {
        for (const [key] of cubes) v.cubes.delete(key);
        mv.stage = "drop";
        mv.ty = CONVEYOR_Y + 5;
        if (snap) mv.y = mv.ty;
      }
    }
    if (mv.stage === "drop" && mv.y === mv.ty) mv.stage = "belt";
    // Follow the belt while dropping too, so the mailer curves onto it.
    if (mv.stage !== "pack") mv.tx = m.x;
  }
  for (const mv of v.mailers.values()) {
    if (!onBelt.has(mv.order) && mv.stage !== "gone") {
      for (const [key, c] of v.cubes) if (c.order === mv.order) v.cubes.delete(key);
      mv.stage = "gone";
      mv.tx = BIN_X + MAILER_W;
      mv.ty = CONVEYOR_Y + 5;
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
  let moving = false;
  for (const [id, t] of v.totes) {
    if (ease(t, k)) moving = true;
    else if (t.leaving) v.totes.delete(id);
  }
  for (const c of v.cubes.values()) if (ease(c, k)) moving = true;
  for (const [id, m] of v.mailers) {
    if (ease(m, k)) moving = true;
    // Under the bin now: the bin count already includes it.
    else if (m.stage === "gone") v.mailers.delete(id);
  }
  return moving;
}
