import { memo } from "react";
import { BRANDS, CLASS_BASE, GRASP_CLASSES } from "@/sim/catalog";
import {
  actions,
  autonomy,
  classData,
  classReliability,
  newData,
  fmtDur,
  ordersPerHour,
  robotLabel,
  robotLight,
  robotName,
  type Order,
  type Sim,
} from "@/sim/engine";
import type { View } from "./motion";
import { ICONS } from "./icons";
import { pct } from "./tokens";

interface Props {
  sim: Sim;
  view: View;
  selectedOrder: number | null;
  onSelectOrder: (order: number) => void;
  onAddPilot: () => void;
  onTrain: () => void;
}

function Head({ n, title, right }: { n: string; title: string; right?: string }) {
  return (
    <div className="panel-hd">
      <span className="label">
        <span className="num">{n}</span>
        {title}
      </span>
      {right && <span className="label faint">{right}</span>}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="label faint">{label}</div>
      <div className="v metric">{value}</div>
    </div>
  );
}

// One order row. It only redraws when its own values change, so a long
// list stays cheap at 30 fps.
const OrderRow = memo(function OrderRow({
  id,
  brand,
  items,
  packed,
  status,
  tone,
  robot,
  selected,
  onSelect,
}: {
  id: number;
  brand: number;
  items: number[];
  packed: number;
  status: string;
  tone: string;
  robot: string;
  selected: boolean;
  onSelect: (order: number) => void;
}) {
  const b = BRANDS[brand];
  const lb = items.reduce((sum, i) => sum + b.items[i].lb, 0);
  return (
    <div className={`row ord pick ${selected ? "sel" : ""}`} onClick={() => onSelect(id)}>
      <span>#{id}</span>
      <span>{b.code}</span>
      <span className="items" title={items.map((i) => b.items[i].name).join(" · ")}>
        {/* Same order as the cubes in the tote: the first item packed is on
            the right, so packed items fade from right to left. */}
        {items
          .map((i, k) => ({ i, done: k < packed }))
          .reverse()
          .map(({ i, done }) => {
            const Icon = ICONS[b.items[i].icon];
            return <Icon key={i} size={12} strokeWidth={2} className={done ? "packed" : undefined} />;
          })}
      </span>
      <span className="dim num-r">{lb.toFixed(1)} lb</span>
      <span className={tone || undefined}>{status}</span>
      <span className="dim">{robot}</span>
    </div>
  );
});

const ORDER_STATUS: Record<Order["status"], string> = {
  queued: "WAITING",
  picking: "PICKING",
  staged: "IN TOTE",
  packing: "PACKING",
  conveyor: "SHIPPING",
};

export default function SidePanel({ sim, view, selectedOrder, onSelectOrder, onAddPilot, onTrain }: Props) {
  const s = sim;
  const perHour = ordersPerHour(s);
  const auto = autonomy(s);
  const busy = s.pilots.filter((p) => p.robot !== null).length;
  const acts = actions(s);
  const pending = newData(s);
  // Every active order, newest on top; the panel scrolls. An order leaves the
  // list when its mailer is under the outbound bin, not when the sim counts it.
  const orders = [...s.orders.values()];
  for (const m of view.mailers.values()) if (!s.orders.has(m.order)) orders.push(m.info);
  orders.sort((a, b) => b.id - a.id);

  return (
    <aside className="side">
      <section className="panel" style={{ flex: "none" }}>
        <Head n="01" title="Fleet" />
        <div className="kpis">
          <Kpi label="Orders / hr" value={perHour === null ? "—" : String(Math.round(perHour))} />
          <Kpi label="Autonomy" value={auto === null ? "—" : pct(auto, 0)} />
          <Kpi label="Pilots busy" value={`${busy}/${s.pilots.length}`} />
        </div>
      </section>

      <section className="panel" style={{ flex: "1 1 0" }}>
        <Head n="02" title="Action queue" />
        <div className="panel-body">
          {acts.length === 0 && <div className="empty label">No action needed</div>}
          {acts.map((a) =>
            a.level === "rec" ? (
              <div key={a.key} className="act rec">
                <span className="arrow label">▲</span>
                <span className="ttl label">{a.title}</span>
                <button className="btn-primary" onClick={onAddPilot}>
                  +1 Pilot
                </button>
                <span className="det">{a.detail}</span>
              </div>
            ) : (
              <div key={a.key} className="act">
                <span className={`dot ${a.level}`} />
                <span className="ttl label">
                  <span className="rid">{robotName(a.robot!)}</span>
                  <span className={`t-${a.level}`}>{a.title}</span>
                </span>
                <span className="label metric dim">{fmtDur(a.wait)}</span>
                {a.detail && <span className="det">{a.detail}</span>}
              </div>
            ),
          )}
        </div>
      </section>

      <section className="panel" style={{ flex: "1.2 1 0" }}>
        <Head n="03" title="Order queue" />
        <div className="panel-body">
          <div className="row ord head">
            <span>ORDER</span>
            <span>BRAND</span>
            <span>ITEMS</span>
            <span className="num-r">WEIGHT</span>
            <span>STATUS</span>
            <span>ROBOT</span>
          </div>
          {orders.map((o) => {
            const r = o.robot !== null ? s.robots[o.robot] : null;
            const light = o.status === "packing" && r ? robotLight(r) : null;
            return (
              <OrderRow
                key={o.id}
                id={o.id}
                brand={o.brand}
                items={o.items}
                packed={o.packed}
                status={light === "fault" ? robotLabel(r!) : ORDER_STATUS[o.status]}
                tone={light === "fault" ? "t-fault" : o.status === "queued" ? "faint" : ""}
                robot={r && o.status !== "conveyor" ? robotName(r.id) : ""}
                selected={selectedOrder === o.id}
                onSelect={onSelectOrder}
              />
            );
          })}
        </div>
      </section>

      <section className="panel" style={{ flex: "none" }}>
        <Head n="04" title="Reliability by item type" right={`Model v${s.model}`} />
        <div className="learn">
          <div className="learn-row head label faint">
            <span>Type</span>
            <span>Reliability</span>
            <span />
            <span className="num-r">Data</span>
          </div>
          {GRASP_CLASSES.map((c) => {
            const a = classReliability(s, c);
            const n = classData(s, c);
            const fresh = n - s.trained[c];
            return (
              <div key={c} className="learn-row">
                <span className="label dim">{CLASS_BASE[c].label}</span>
                <span className="bar">
                  <span style={{ width: `${a * 100}%` }} />
                </span>
                <span className="metric">{pct(a, 0)}</span>
                <span className="metric num-r">
                  {n}
                  {fresh > 0 && <span className="faint"> +{fresh}</span>}
                </span>
              </div>
            );
          })}
        </div>
        <div className="train">
          <button className="btn-primary" onClick={onTrain} disabled={pending === 0}>
            Train model
          </button>
          <span className="label faint">{pending > 0 ? `${pending} new ${pending === 1 ? "sample" : "samples"}` : "Up to date"}</span>
        </div>
      </section>
    </aside>
  );
}
