import { BRANDS } from "@/sim/catalog";
import {
  actions,
  autonomy,
  fmtDur,
  ordersPerHour,
  robotLabel,
  robotLight,
  robotName,
  robotProgress,
  type Order,
  type Sim,
} from "@/sim/engine";
import { ICONS } from "./icons";
import Ring from "./Ring";
import { LIGHT_COLOR, pct } from "./tokens";

interface Props {
  sim: Sim;
  selected: number | null;
  onSelect: (robot: number) => void;
  onAddPilot: () => void;
}

function Head({ n, title }: { n: string; title: string }) {
  return (
    <div className="panel-hd">
      <span className="label">
        <span className="num">{n}</span>
        {title}
      </span>
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

const ORDER_STATUS: Record<Order["status"], string> = {
  queued: "WAITING",
  picking: "PICKING",
  staged: "IN TOTE",
  packing: "PACKING",
  conveyor: "SHIPPING",
};

export default function SidePanel({ sim, selected, onSelect, onAddPilot }: Props) {
  const s = sim;
  const perHour = ordersPerHour(s);
  const auto = autonomy(s);
  const busy = s.pilots.filter((p) => p.robot !== null).length;
  const acts = actions(s);
  const orders = [...s.orders.values()].slice(0, 60);

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
              <div key={a.key} className={`act ${selected === a.robot ? "sel" : ""}`} onClick={() => onSelect(a.robot!)}>
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
            <span>STATUS</span>
            <span>ROBOT</span>
          </div>
          {orders.map((o) => {
            const r = o.robot !== null ? s.robots[o.robot] : null;
            const light = o.status === "packing" && r ? robotLight(r) : null;
            const status = light === "fault" ? robotLabel(r!) : ORDER_STATUS[o.status];
            return (
              <div key={o.id} className={`row ord ${r && selected === r.id && o.status !== "conveyor" ? "sel" : ""}`}>
                <span>#{o.id}</span>
                <span>{BRANDS[o.brand].code}</span>
                <span className="items" title={o.items.map((i) => BRANDS[o.brand].items[i].name).join(" · ")}>
                  {/* Same order as the cubes in the tote: the first item packed is on
                      the right, so packed items fade from right to left. */}
                  {o.items
                    .map((i, k) => ({ i, packed: k < o.packed }))
                    .reverse()
                    .map(({ i, packed }) => {
                      const Icon = ICONS[BRANDS[o.brand].items[i].icon];
                      return <Icon key={i} size={12} strokeWidth={2} color={packed ? "var(--white-30)" : "var(--white)"} />;
                    })}
                </span>
                <span className={light === "fault" ? "t-fault" : o.status === "queued" ? "faint" : undefined}>{status}</span>
                <span className="dim">{r && o.status !== "conveyor" ? robotName(r.id) : ""}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" style={{ flex: "1 1 0" }}>
        <Head n="04" title="Robots" />
        <div className="panel-body">
          {s.robots.map((r) => {
            const light = robotLight(r);
            return (
              <div key={r.id} className={`row rob ${selected === r.id ? "sel" : ""}`} onClick={() => onSelect(r.id)}>
                <span style={selected === r.id ? { color: "var(--orange)" } : undefined}>{robotName(r.id)}</span>
                <span className="st">
                  <span className={`dot ${light}`} />
                  <span className={`t-${light}`}>{robotLabel(r)}</span>
                </span>
                <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
                  <Ring cx={7} cy={7} r={5} width={2} value={robotProgress(r)} color={LIGHT_COLOR[light]} />
                </svg>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
