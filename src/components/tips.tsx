// Hover popups. Each element that explains itself has a data-tip key, for
// example "robot:4". The text lives here, not on the screen.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { BRANDS, CLASS_BASE, type GraspClass } from "@/sim/catalog";
import {
  autonomy,
  classData,
  classReliability,
  currentItem,
  fmtDur,
  newData,
  ordersPerHour,
  pilotWanted,
  robotName,
  robotTone,
  trainedPilotRate,
  type Order,
  type Sim,
  type Tone,
} from "@/sim/engine";
import type { View } from "./motion";
import { ICONS } from "./icons";
import { PilotBadge, STATUS_ICON } from "./glyphs";
import { C, TONE_COLOR, pct } from "./tokens";

export interface TipCtx {
  sim: Sim;
  view: View;
  paused: boolean;
}

interface TipBody {
  title: ReactNode;
  keys?: string;
  lines?: ReactNode[];
}

const STAGE_NAME: Record<Order["status"], string> = {
  queued: "Waiting",
  picking: "Picking",
  staged: "In a tote",
  packing: "Packing",
  conveyor: "Shipping",
};

function Swatch({ tone }: { tone: Tone }) {
  return <span className="swatch" style={{ background: TONE_COLOR[tone] }} />;
}

export function findOrder(c: TipCtx, id: number): Order | undefined {
  return c.sim.orders.get(id) ?? c.view.mailers.get(id)?.info;
}

function robotTip(c: TipCtx, i: number): TipBody {
  const s = c.sim;
  const r = s.robots[i];
  const tone = robotTone(r);
  const wait = fmtDur(s.t - r.since);
  const Icon = STATUS_ICON[r.phase];
  const status: Record<typeof r.phase, string> = {
    pack: "Packing",
    regrasp: `Grasp failed. Trying again alone. ${wait}`,
    idle: `No tote. Waiting for a picker. ${wait}`,
    pilot_wait: `Error handling item. Needs a pilot. ${wait}`,
    pilot: `Pilot P${r.pilot} in control. ${wait}`,
    fault: `Fault: ${r.steps[0]?.fault ?? ""}. An operator must fix it. ${wait}`,
  };
  const lines: ReactNode[] = [
    <span key="s" className="tip-row">
      {r.phase === "pilot" && r.pilot !== null ? (
        <PilotBadge id={r.pilot} busy size={18} />
      ) : Icon ? (
        <Icon size={16} color={TONE_COLOR[tone]} strokeWidth={2.25} />
      ) : (
        <Swatch tone={tone} />
      )}
      {status[r.phase]}
    </span>,
  ];
  const item = currentItem(s, r);
  const o = r.order !== null ? s.orders.get(r.order) : undefined;
  if (item && o) {
    const ItemIcon = ICONS[item.icon];
    lines.push(
      <span key="i" className="tip-row">
        <ItemIcon size={16} color={C.w70} />
        {item.name} · {CLASS_BASE[item.cls].label}
      </span>,
      `#${o.id} · ${BRANDS[o.brand].name} · item ${Math.min(o.packed + 1, o.items.length)} of ${o.items.length}`,
    );
  }
  if (r.queue.length > 0) lines.push(`${r.queue.length} ${r.queue.length === 1 ? "tote" : "totes"} in line`);
  return { title: robotName(i), lines };
}

function classTip(c: TipCtx, cls: GraspClass): TipBody {
  const s = c.sim;
  const now = classReliability(s, cls);
  const n = classData(s, cls);
  const fresh = n - s.trained[cls];
  const next = 1 - trainedPilotRate(cls, n);
  const lines: ReactNode[] = [`Reliability ${pct(now, 0)}: the robot packs it with no pilot.`];
  if (fresh > 0) lines.push(`Train now: ${pct(next, 0)}.`);
  lines.push(`${n} ${n === 1 ? "sample" : "samples"}${fresh > 0 ? `, ${fresh} new` : ""}.`);
  return { title: CLASS_BASE[cls].label, lines };
}

export function tipFor(key: string, c: TipCtx): TipBody | null {
  const s = c.sim;
  const [kind, a, b] = key.split(":");
  switch (kind) {
    case "ctl":
      switch (a) {
        case "pause":
          return c.paused ? { title: "Paused", keys: "Space", lines: ["Press play to go on."] } : { title: "Pause", keys: "Space" };
        case "speed": {
          const v = Number(b);
          return { title: `Play ${v}×`, keys: String([1, 10, 60].indexOf(v) + 1) };
        }
        case "reset":
          return { title: "Reset", lines: ["Start the shift again at 6:00 AM."] };
        case "clock":
          return { title: "Shift clock", lines: ["The shift starts at 6:00 AM."] };
        case "help":
          return { title: "Help", keys: "?", lines: ["Take the tour."] };
      }
      return null;
    case "kpi": {
      const auto = autonomy(s);
      return {
        title: auto === null ? "Autonomy" : `Autonomy ${pct(auto, 0)}`,
        lines: [
          "One bar for each recent order, newest on the right.",
          <span key="a" className="tip-row">
            <Swatch tone="ok" /> The robot packed it alone.
          </span>,
          <span key="p" className="tip-row">
            <Swatch tone="pilot" /> A pilot helped.
          </span>,
        ],
      };
    }
    case "pilot": {
      if (a === "add") {
        return pilotWanted(s)
          ? { title: "Add a pilot", lines: ["Robots wait for a pilot."] }
          : { title: "Add a pilot", lines: [`${s.pilotTarget} of 10 on shift.`] };
      }
      if (a === "remove") return { title: "Remove a pilot", lines: ["A busy pilot leaves after the current item."] };
      const p = s.pilots.find((x) => x.id === Number(a));
      if (!p) return null;
      if (p.robot === null) return { title: `Pilot P${p.id}`, lines: ["Free. Takes the next robot that needs a pilot."] };
      const r = s.robots[p.robot];
      return { title: `Pilot P${p.id}`, lines: [`In control of ${robotName(r.id)}. ${fmtDur(s.t - r.since)}`] };
    }
    case "robot":
      return robotTip(c, Number(a));
    case "rack": {
      const br = BRANDS[Number(a)];
      return { title: br.name, lines: [br.about] };
    }
    case "item": {
      const z = Number(a);
      const it = BRANDS[z].items[Number(b)];
      return { title: it.name, lines: [`${CLASS_BASE[it.cls].label} · ${it.lb} lb`, `${s.stock[z][Number(b)]} in stock`] };
    }
    case "bin": {
      const ph = ordersPerHour(s);
      return {
        title: "Outbound",
        lines: [`${s.shipped} mailers shipped.`, ph === null ? "Orders per hour shows after 2 minutes." : `${Math.round(ph)} orders per hour.`],
      };
    }
    case "tab":
      if (a === "alerts") return { title: "Alerts", lines: ["Robots that need a human, then robots to watch."] };
      if (a === "orders") return { title: "Orders", lines: ["Click an order to find it on the floor."] };
      if (a === "model") {
        const n = newData(s);
        return { title: `Model v${s.model}`, lines: [n > 0 ? `${n} new samples. Train to improve.` : "Up to date."] };
      }
      return null;
    case "train": {
      const n = newData(s);
      return n > 0
        ? { title: `Train model v${s.model + 1}`, lines: [`Learn from ${n} new ${n === 1 ? "sample" : "samples"}.`] }
        : { title: "Model up to date", lines: ["Each packed item logs a new sample."] };
    }
    case "ver":
      return { title: `Model v${s.model}`, lines: ["Running on every robot."] };
    case "class":
      return classTip(c, a as GraspClass);
    case "order": {
      const o = findOrder(c, Number(a));
      if (!o) return null;
      const br = BRANDS[o.brand];
      const lb = o.items.reduce((sum, i) => sum + br.items[i].lb, 0);
      const r = o.robot !== null && o.status !== "conveyor" ? robotName(o.robot) : null;
      return {
        title: `#${o.id} · ${br.name}`,
        lines: [
          `${STAGE_NAME[o.status]}${r ? ` · ${r}` : ""}`,
          o.items.map((i) => br.items[i].name).join(" · "),
          `${lb.toFixed(1)} lb`,
        ],
      };
    }
  }
  return null;
}

// The popup itself. It follows its anchor on every frame, flips above the
// anchor near the bottom edge, and stays inside the window.
export function TipLayer({ el, body }: { el: Element | null; body: TipBody | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || !el) return;
    if (!el.isConnected) {
      box.style.visibility = "hidden";
      return;
    }
    const a = el.getBoundingClientRect();
    const t = box.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;
    let x = a.left + a.width / 2 - t.width / 2;
    let y = a.bottom + gap;
    if (el.getAttribute("data-tip-side") === "left" && a.left - t.width - gap > 0) {
      x = a.left - t.width - gap;
      y = a.top + a.height / 2 - t.height / 2;
    } else if (y + t.height > vh - gap) {
      y = a.top - t.height - gap;
    }
    x = Math.max(gap, Math.min(x, vw - t.width - gap));
    y = Math.max(gap, Math.min(y, vh - t.height - gap));
    box.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    box.style.visibility = "visible";
  });
  if (!el || !body) return null;
  return (
    <div ref={ref} className="tip" role="tooltip">
      <div className="tip-hd">
        <span className="label">{body.title}</span>
        {body.keys && <kbd>{body.keys}</kbd>}
      </div>
      {body.lines?.map((l, i) => (
        <div key={i} className="tip-text">
          {l}
        </div>
      ))}
    </div>
  );
}
