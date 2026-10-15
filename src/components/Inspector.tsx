import { useEffect, useRef } from "react";
import { Check, MousePointerClick } from "lucide-react";
import { BRANDS, CLASS_BASE } from "@/sim/catalog";
import type { Order, Sim } from "@/sim/engine";
import type { View } from "./motion";
import { ICONS } from "./icons";
import { OrderIcon, RobotSign } from "./signs";
import type { TipBind } from "./Tooltip";

const STEPS = ["Picking", "In tote", "Packing", "Shipping", "Shipped"] as const;

const STEP_OF: Record<Order["status"], number> = {
  queued: -1,
  picking: 0,
  staged: 1,
  packing: 2,
  conveyor: 3,
};

// One inspector for the selected order. The order object stays the same
// while the sim changes it, so the panel follows it to the outbound bin.
export default function Inspector({ sim, view, order, tip }: { sim: Sim; view: View; order: Order | null; tip: TipBind }) {
  // On a phone the inspector is under the floor: bring it into view when the
  // user selects an order. On a desktop it is always in view.
  const ref = useRef<HTMLElement>(null);
  const id = order?.id;
  useEffect(() => {
    if (id !== undefined) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [id]);

  if (!order) {
    return (
      <section className="panel insp empty" aria-label="Order">
        <span className="hint" {...tip("insp-empty", { kind: "ui", title: "Click a tote to follow its order" }, true)}>
          <MousePointerClick size={32} strokeWidth={1.5} aria-hidden />
        </span>
      </section>
    );
  }
  const b = BRANDS[order.brand];
  const shipped = !sim.orders.has(order.id) && !view.mailers.has(order.id);
  const step = shipped ? 4 : STEP_OF[order.status];
  const robot = order.robot !== null ? sim.robots[order.robot] : null;

  return (
    <section className="panel insp" aria-label={`Order ${order.id}`} ref={ref}>
      <div className="insp-hd">
        <span className="hint ico" {...tip("insp-order", { kind: "ui", title: "Order" }, true)}>
          <OrderIcon size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="metric insp-id">#{order.id}</span>
        <span className="dim">
          <span className="metric">{b.code}</span> · {b.name}
        </span>
      </div>
      <ul className="insp-items">
        {order.items.map((i, k) => {
          const it = b.items[i];
          const Icon = ICONS[it.icon];
          const packed = k < order.packed;
          return (
            <li key={i} className={packed ? "packed" : undefined}>
              <Icon size={20} strokeWidth={1.75} aria-hidden />
              <span className="nm">{it.name}</span>
              <span className="dim metric">
                {CLASS_BASE[it.cls].label} · {it.lb} lb
              </span>
              <span className="tick">{packed && <Check size={16} strokeWidth={2.25} aria-label="Packed" />}</span>
            </li>
          );
        })}
      </ul>
      <ol className="steps">
        {STEPS.map((name, k) => {
          const done = k < step || (k === 4 && shipped);
          const now = k === step && !shipped;
          return (
            <li key={name} className={done ? (k === 4 ? "done ok" : "done") : now ? "now" : undefined}>
              <span className="mk">{done ? <Check size={16} strokeWidth={2.5} aria-hidden /> : <span className="dot" />}</span>
              <span>{name}</span>
              {(k === 1 || k === 2) && robot && now && (
                <span className="ref hint" {...tip(`insp-robot${k}`, { kind: "robot", id: robot.id }, true)}>
                  <RobotSign sim={sim} robot={robot} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
