// The context bar and the panels it opens. A panel has no title: the lit
// icon in the bar says which panel is open.
import { memo } from "react";
import { Bell, BrainCircuit, ChartNoAxesColumn, CircleCheck, ClipboardList, type LucideIcon } from "lucide-react";
import { BRANDS, GRASP_CLASSES } from "@/sim/catalog";
import {
  actions,
  classData,
  classReliability,
  newData,
  robotName,
  robotTone,
  trainedPilotRate,
  type Order,
  type Sim,
  type Tone,
} from "@/sim/engine";
import type { View } from "./motion";
import { ICONS } from "./icons";
import { CLASS_ICON, FAULT_ICON, STATUS_ICON } from "./glyphs";
import { C, TONE_COLOR } from "./tokens";

export type PanelId = "alerts" | "orders" | "model";

const TABS: { id: PanelId; icon: LucideIcon; label: string }[] = [
  { id: "alerts", icon: Bell, label: "Alerts" },
  { id: "orders", icon: ClipboardList, label: "Orders" },
  { id: "model", icon: ChartNoAxesColumn, label: "Model" },
];

export function ContextBar({ sim, open, onToggle }: { sim: Sim; open: PanelId | null; onToggle: (id: PanelId) => void }) {
  const red = actions(sim).filter((a) => a.level === "fault").length;
  const fresh = newData(sim) > 0;
  return (
    <nav className="ctxbar" aria-label="Panels">
      <div className="ctx-tabs" data-tour="tabs">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`ctx ${open === id ? "on" : ""}`}
            onClick={() => onToggle(id)}
            aria-label={label}
            aria-pressed={open === id}
            data-tip={`tab:${id}`}
            data-tip-side="left"
            data-tour={`tab-${id}`}
          >
            <span className="ctx-ico">
              <Icon size={22} strokeWidth={1.75} />
              {id === "alerts" && red > 0 && <span className="badge">{red}</span>}
              {id === "model" && fresh && <span className="badge-dot" />}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ---------- Alerts ----------

// A wait bar fills over 2 minutes; a tick marks each 30 s.
const WAIT_FULL = 120;

export function AlertsPanel({ sim }: { sim: Sim }) {
  const acts = actions(sim);
  if (acts.length === 0) {
    return (
      <div className="pnl-empty">
        <CircleCheck size={32} color={C.ok} strokeWidth={1.75} aria-label="No action needed" />
      </div>
    );
  }
  return (
    <div className="pnl-list">
      {acts.map((a) => {
        const r = sim.robots[a.robot];
        const tone = robotTone(r);
        const Status = STATUS_ICON[r.phase];
        const Detail = a.fault ? FAULT_ICON[a.fault] : a.item ? ICONS[a.item.icon] : null;
        return (
          <div key={a.robot} className="arow" data-tip={`robot:${a.robot}`}>
            {Status ? <Status size={18} color={TONE_COLOR[tone]} strokeWidth={2.25} /> : <span />}
            <span className="rid metric">{robotName(a.robot)}</span>
            {Detail ? <Detail size={18} color={C.w70} strokeWidth={1.75} /> : <span />}
            <span className="wait">
              <span style={{ width: `${Math.min(1, a.wait / WAIT_FULL) * 100}%`, background: TONE_COLOR[tone] }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Orders ----------

// The stages of an order, in order. One pip each.
const STAGES: Order["status"][] = ["queued", "picking", "staged", "packing", "conveyor"];

// One order row. It only redraws when its own values change, so a long
// list stays cheap at 30 fps.
const OrderRow = memo(function OrderRow({
  id,
  brand,
  items,
  packed,
  stage,
  tone,
  robot,
  selected,
  onSelect,
}: {
  id: number;
  brand: number;
  items: number[];
  packed: number;
  stage: number;
  tone: Tone | null;
  robot: string;
  selected: boolean;
  onSelect: (order: number) => void;
}) {
  const b = BRANDS[brand];
  return (
    <div
      className={`orow ${selected ? "sel" : ""}`}
      onClick={() => onSelect(id)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Order ${id}`}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(id);
      }}
      data-tip={`order:${id}`}
    >
      <span className="code">{b.code}</span>
      <span className="items">
        {/* Same order as the cubes in the tote: the first item packed is on
            the right, so packed items fade from right to left. */}
        {items
          .map((i, k) => ({ i, done: k < packed }))
          .reverse()
          .map(({ i, done }) => {
            const Icon = ICONS[b.items[i].icon];
            return <Icon key={i} size={16} strokeWidth={2} className={done ? "packed" : undefined} />;
          })}
      </span>
      {/* Stage pips: waiting, picking, in a tote, packing, shipping. */}
      <span className="stages">
        {STAGES.map((_, k) => (
          <i
            key={k}
            className={k < stage ? "done" : k === stage ? "now" : undefined}
            style={k === stage && tone ? { background: TONE_COLOR[tone], borderColor: TONE_COLOR[tone] } : undefined}
          />
        ))}
      </span>
      <span className="rid">{robot}</span>
    </div>
  );
});

export function OrdersPanel({
  sim,
  view,
  selectedOrder,
  onSelectOrder,
}: {
  sim: Sim;
  view: View;
  selectedOrder: number | null;
  onSelectOrder: (order: number) => void;
}) {
  const s = sim;
  // Every active order, newest on top; the panel scrolls. An order leaves the
  // list when its mailer is under the outbound bin, not when the sim counts it.
  const orders = [...s.orders.values()];
  for (const m of view.mailers.values()) if (!s.orders.has(m.order)) orders.push(m.info);
  orders.sort((a, b) => b.id - a.id);
  return (
    <div className="pnl-list">
      {orders.map((o) => {
        const r = o.robot !== null ? s.robots[o.robot] : null;
        return (
          <OrderRow
            key={o.id}
            id={o.id}
            brand={o.brand}
            items={o.items}
            packed={o.packed}
            stage={STAGES.indexOf(o.status)}
            tone={o.status === "packing" && r ? robotTone(r) : null}
            robot={r && o.status !== "conveyor" ? robotName(r.id) : ""}
            selected={selectedOrder === o.id}
            onSelect={onSelectOrder}
          />
        );
      })}
    </div>
  );
}

// ---------- Model ----------

// Reliability per item type, in 5% segments. White: the model on the robots
// now. Gray: the gain if you train on the new data.
const SEGS = 20;

export function ModelPanel({ sim, onTrain }: { sim: Sim; onTrain: () => void }) {
  const s = sim;
  const pending = newData(s);
  return (
    <div className="pnl-model" data-tour="model">
      {GRASP_CLASSES.map((c) => {
        const Icon = CLASS_ICON[c];
        const now = Math.round(classReliability(s, c) * SEGS);
        const next = Math.round((1 - trainedPilotRate(c, classData(s, c))) * SEGS);
        return (
          <div key={c} className="mrow" data-tip={`class:${c}`}>
            <Icon size={20} color={C.w70} strokeWidth={1.75} />
            <span className="segs">
              {Array.from({ length: SEGS }, (_, k) => (
                <i key={k} className={k < now ? "on" : k < next ? "gain" : undefined} />
              ))}
            </span>
          </div>
        );
      })}
      <div className="train">
        <button className="btn-primary" onClick={onTrain} disabled={pending === 0} aria-label="Train model" data-tip="train">
          <BrainCircuit size={22} strokeWidth={2} />
        </button>
        <span className="ver metric" data-tip="ver">
          v{s.model}
        </span>
      </div>
    </div>
  );
}
