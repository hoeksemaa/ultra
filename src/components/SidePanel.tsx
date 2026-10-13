import { BRANDS } from "@/sim/catalog";
import {
  ROBOT_COUNT,
  actions,
  autonomy,
  avgWait,
  fmtDur,
  ordersPerHour,
  robotLabel,
  robotLight,
  robotName,
  type Order,
  type Sim,
} from "@/sim/engine";
import { pct } from "./tokens";

type Cmd = "pilot+" | "pilot-" | "picker+";

interface Props {
  sim: Sim;
  selected: number | null;
  onSelect: (robot: number) => void;
  onCmd: (cmd: Cmd) => void;
}

const ORDER_STATUS: Record<Order["status"], string> = {
  queued: "IN WMS",
  picking: "PICKING",
  staged: "TOTE AT",
  packing: "PACKING",
  conveyor: "CONVEYOR",
};

function Head({ n, title, right }: { n: string; title: string; right?: React.ReactNode }) {
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

export default function SidePanel({ sim, selected, onSelect, onCmd }: Props) {
  const s = sim;
  const auto = autonomy(s);
  const wait = avgWait(s);
  const busy = s.pilots.filter((p) => p.robot !== null).length;
  const acts = actions(s);
  const reds = acts.filter((a) => a.level === "fault").length;
  const yellows = acts.filter((a) => a.level === "watch").length;

  const orders = [...s.orders.values()];
  const count = (st: Order["status"]) => orders.filter((o) => o.status === st).length;
  const shownOrders = orders.slice(0, 60);
  const piloted = new Set(s.robots.filter((r) => r.phase === "pilot" || r.phase === "pilot_wait").map((r) => r.order));

  return (
    <aside className="side">
      {/* KPIs */}
      <section className="panel" style={{ flex: "none" }}>
        <Head n="01" title="Fleet" right={`${ROBOT_COUNT} robots · site BK-01`} />
        <div className="kpis">
          <div className="kpi">
            <div className="label faint">Orders / hr</div>
            <div className="v metric">{s.t < 120 ? "—" : Math.round(ordersPerHour(s))}</div>
            <div className="s label faint">last hour</div>
          </div>
          <div className="kpi">
            <div className="label faint">Autonomy</div>
            <div className="v metric">{auto === null ? "—" : pct(auto)}</div>
            <div className="s label faint">orders, no pilot</div>
          </div>
          <div className="kpi">
            <div className="label faint">Pilot assists</div>
            <div className="v metric">{s.stats.assists}</div>
            <div className="s label faint">this shift</div>
          </div>
          <div className="kpi">
            <div className="label faint">Pilots busy</div>
            <div className="v metric">
              {busy}/{s.pilots.length}
            </div>
            <div className="s label faint">{Math.round(s.pilotUse * 100)}% use</div>
          </div>
          <div className="kpi">
            <div className="label faint">Pilot wait</div>
            <div className="v metric">{wait === null ? "—" : fmtDur(wait)}</div>
            <div className="s label faint">avg, last 20</div>
          </div>
          <div className="kpi">
            <div className="label faint">Packed</div>
            <div className="v metric">{s.stats.orders}</div>
            <div className="s label faint">{s.stats.items} items</div>
          </div>
        </div>
      </section>

      {/* Action queue */}
      <section className="panel" style={{ flex: "1 1 0" }}>
        <Head
          n="02"
          title="Action queue"
          right={
            <span className="st">
              <span className="dot fault" /> {reds} <span className="dot watch" style={{ marginLeft: 6 }} /> {yellows}
            </span>
          }
        />
        <div className="panel-body">
          {acts.length === 0 && <div className="empty label">No action needed</div>}
          {acts.map((a) =>
            a.level === "rec" ? (
              <div key={a.key} className="act rec">
                <span className="arrow label">▲</span>
                <span className="ttl label">{a.title}</span>
                {a.button && (
                  <button className="btn-primary" onClick={() => onCmd(a.button!.cmd)}>
                    {a.button.label}
                  </button>
                )}
                <span className="det">{a.detail}</span>
              </div>
            ) : (
              <div
                key={a.key}
                className={`act ${selected === a.robot ? "sel" : ""}`}
                onClick={() => a.robot !== null && onSelect(a.robot)}
              >
                <span className={`dot ${a.level}`} />
                <span className="ttl label">
                  <span className="rid">{robotName(a.robot!)}</span>
                  <span className={`t-${a.level}`}>{a.title}</span>
                </span>
                <span className="label metric dim">{fmtDur(a.wait ?? 0)}</span>
                <span className="det">{a.detail}</span>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Order queue */}
      <section className="panel" style={{ flex: "1.3 1 0" }}>
        <Head n="03" title="Order queue" right={`${orders.length} open`} />
        <div className="pipe">
          {(
            [
              ["queued", "WMS"],
              ["picking", "Pick"],
              ["staged", "Tote"],
              ["packing", "Pack"],
              ["conveyor", "Belt"],
            ] as const
          ).map(([st, name]) => (
            <div key={st}>
              <div className="label faint">{name}</div>
              <div className="v metric">{count(st)}</div>
            </div>
          ))}
        </div>
        <div className="panel-body">
          <div className="row ord head">
            <span>ORDER</span>
            <span>BRAND</span>
            <span>QTY</span>
            <span>STATUS</span>
            <span style={{ textAlign: "right" }}>AGE</span>
          </div>
          {shownOrders.map((o) => {
            const pilot = piloted.has(o.id);
            const status =
              o.status === "staged" || o.status === "packing"
                ? `${ORDER_STATUS[o.status]} ${robotName(o.robot!)}`
                : ORDER_STATUS[o.status];
            return (
              <div
                key={o.id}
                className={`row ord ${o.robot !== null && selected === o.robot && o.status !== "conveyor" ? "sel" : ""}`}
              >
                <span>#{o.id}</span>
                <span>{BRANDS[o.brand].code}</span>
                <span className="dim">×{o.items.length}</span>
                <span className={pilot ? "t-fault" : o.status === "queued" ? "faint" : undefined}>
                  {pilot ? `PILOT · ${robotName(o.robot!)}` : status}
                </span>
                <span className="dim" style={{ textAlign: "right" }}>
                  {fmtDur(s.t - o.created)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Robot status list */}
      <section className="panel" style={{ flex: "1 1 0" }}>
        <Head n="04" title="Robots" right="items · assists" />
        <div className="panel-body">
          {s.robots.map((r) => {
            const light = robotLight(r);
            const o = r.order !== null ? s.orders.get(r.order) : undefined;
            return (
              <div key={r.id} className={`row rob ${selected === r.id ? "sel" : ""}`} onClick={() => onSelect(r.id)}>
                <span style={selected === r.id ? { color: "var(--orange)" } : undefined}>{robotName(r.id)}</span>
                <span className="st">
                  <span className={`dot ${light}`} />
                  <span className={`t-${light}`}>{robotLabel(r)}</span>
                </span>
                <span className="dim">{o ? `#${o.id} ${BRANDS[o.brand].code}` : `queue ${r.queue.length}`}</span>
                <span style={{ textAlign: "right" }}>{r.itemsPacked}</span>
                <span style={{ textAlign: "right" }} className={r.assists > 0 ? undefined : "faint"}>
                  {r.assists}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
