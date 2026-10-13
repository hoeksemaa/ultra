import { BRANDS, CLASS_BASE, GRASP_CLASSES } from "@/sim/catalog";
import {
  BIN_W,
  BIN_X,
  CONVEYOR_H,
  CONVEYOR_X0,
  CONVEYOR_Y,
  CROSS_AISLE_Y,
  FRONT_AISLE_Y,
  ROBOT_H,
  ROBOT_W,
  ROBOT_Y,
  VIEW_H,
  VIEW_W,
  ZONE_H,
  ZONE_W,
  brandAutonomy,
  classAutonomy,
  fmtDur,
  robotLight,
  robotName,
  robotShortLabel,
  robotX,
  zoneRect,
  type Sim,
} from "@/sim/engine";
import { C, LIGHT_COLOR, pct } from "./tokens";

const MONO = "var(--font-mono)";
const SANS = "var(--font-sans)";

const BIN_COLS = 5;
const BIN_GAP = 4;
const BIN_CELL_W = (ZONE_W - 16 - (BIN_COLS - 1) * BIN_GAP) / BIN_COLS;
const BIN_CELL_H = 27;

const TOTE_W = 30;
const TOTE_H = 13;
const TOTE_PITCH = 17;
const QUEUE_SHOW = 5;

const BIN_TOP = 470;
const BIN_BOTTOM = CONVEYOR_Y + CONVEYOR_H;

const STRIP_Y = 696;
const SKILL_Y = 770;

interface Props {
  sim: Sim;
  selected: number | null;
  onSelect: (robot: number) => void;
}

function Label({
  x,
  y,
  size = 10,
  fill = C.w70,
  anchor = "start",
  children,
}: {
  x: number;
  y: number;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  children: React.ReactNode;
}) {
  return (
    <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontFamily={MONO} className="svg-label">
      {children}
    </text>
  );
}

export default function FloorView({ sim, selected, onSelect }: Props) {
  const s = sim;
  const pilotWaiting = s.pilotQueue.length;
  const pickersBusy = s.pickers.filter((p) => p.task !== "idle").length;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Warehouse floor and robot line">
      {/* ---------- Pick floor ---------- */}
      <Label x={32} y={26} fill={C.white}>
        01 · Pick floor
      </Label>
      <Label x={140} y={26} fill={C.w50}>
        10 brands · 200 SKUs · humans pick each order into one tote
      </Label>
      <Label x={1168} y={26} anchor="end" fill={C.w70}>
        Pickers {pickersBusy}/{s.pickers.length} busy · WMS backlog {s.backlog.length}
      </Label>

      {[CROSS_AISLE_Y, FRONT_AISLE_Y].map((y) => (
        <line key={y} x1={20} x2={1180} y1={y} y2={y} stroke={C.w12} strokeDasharray="2 6" />
      ))}

      {BRANDS.map((b, z) => {
        const r = zoneRect(z);
        return (
          <g key={b.code}>
            <rect x={r.x} y={r.y} width={ZONE_W} height={ZONE_H} fill={C.w04} stroke={C.w30} />
            <text x={r.x + 8} y={r.y + 15} fontSize={10} fill={C.white} fontFamily={MONO} fontWeight={700}>
              {b.code}
            </text>
            <text x={r.x + 36} y={r.y + 15} fontSize={10.5} fill={C.w70} fontFamily={SANS}>
              {b.name}
            </text>
            <text x={r.x + ZONE_W - 8} y={r.y + 15} fontSize={9} fill={C.w50} fontFamily={MONO} textAnchor="end">
              AUTO {pct(brandAutonomy(s, z), 0)}
            </text>
            {b.items.map((it, i) => {
              const col = i % BIN_COLS;
              const row = Math.floor(i / BIN_COLS);
              const x = r.x + 8 + col * (BIN_CELL_W + BIN_GAP);
              const y = r.y + 24 + row * (BIN_CELL_H + BIN_GAP);
              const at = s.flash.get(it.sku);
              const age = at === undefined ? 99 : s.t - at;
              const glow = age < 6 ? 0.55 * (1 - age / 6) : 0;
              return (
                <g key={it.sku}>
                  <title>{`${it.sku} · ${it.name} · ${it.lb} lb · ${CLASS_BASE[it.cls].label}`}</title>
                  <rect
                    x={x}
                    y={y}
                    width={BIN_CELL_W}
                    height={BIN_CELL_H}
                    fill={glow > 0 ? `rgba(255,255,255,${glow.toFixed(3)})` : "transparent"}
                    stroke={C.w12}
                  />
                  <text x={x + 3} y={y + 9} fontSize={6.5} fill={C.w30} fontFamily={MONO}>
                    {it.sku.slice(4)}
                  </text>
                  <text x={x + BIN_CELL_W - 3} y={y + BIN_CELL_H - 4} fontSize={6.5} fill={C.w30} fontFamily={MONO} textAnchor="end">
                    {it.lb}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* ---------- Robot line ---------- */}
      <Label x={32} y={440} fill={C.white}>
        02 · Pack line
      </Label>
      <Label x={130} y={440} fill={C.w50}>
        20 × OP1 · order packaging · tote → mailer → conveyor
      </Label>

      {s.robots.map((r) => {
        const x = robotX(r.id);
        const light = robotLight(r);
        const color = LIGHT_COLOR[light];
        const sel = selected === r.id;
        const order = r.order !== null ? s.orders.get(r.order) : undefined;
        const flashAge = s.t - r.flash;
        const shown = r.queue.slice(0, QUEUE_SHOW);
        return (
          <g key={r.id} className="robot-hit" onClick={() => onSelect(r.id)}>
            <rect x={x - 4} y={452} width={ROBOT_W + 8} height={ROBOT_Y + ROBOT_H + 24 - 452} fill="transparent" />
            {shown.map((oid, k) => {
              const o = s.orders.get(oid);
              const ty = ROBOT_Y - 6 - (k + 1) * TOTE_PITCH + (TOTE_PITCH - TOTE_H);
              return (
                <g key={oid}>
                  <rect x={x + (ROBOT_W - TOTE_W) / 2} y={ty} width={TOTE_W} height={TOTE_H} fill={C.charcoal} stroke={C.w50} />
                  <text x={x + ROBOT_W / 2} y={ty + 9.5} fontSize={7.5} fill={C.w70} fontFamily={MONO} textAnchor="middle">
                    {o ? BRANDS[o.brand].code : ""}
                  </text>
                </g>
              );
            })}
            {r.queue.length > QUEUE_SHOW && (
              <text x={x + ROBOT_W / 2} y={ROBOT_Y - 8 - QUEUE_SHOW * TOTE_PITCH} fontSize={8} fill={C.w50} fontFamily={MONO} textAnchor="middle">
                +{r.queue.length - QUEUE_SHOW}
              </text>
            )}

            {flashAge < 2.5 && (
              <rect
                x={x - 3}
                y={ROBOT_Y - 3}
                width={ROBOT_W + 6}
                height={ROBOT_H + 6}
                fill="none"
                stroke={color}
                strokeOpacity={1 - flashAge / 2.5}
                strokeWidth={2}
              />
            )}
            <rect
              x={x}
              y={ROBOT_Y}
              width={ROBOT_W}
              height={ROBOT_H}
              fill={sel ? "rgba(255,79,0,0.10)" : C.w04}
              stroke={sel ? C.orange : C.w50}
              strokeWidth={sel ? 2 : 1}
            />
            <rect x={x} y={ROBOT_Y + ROBOT_H - 3} width={ROBOT_W} height={3} fill={color} />
            <circle cx={x + ROBOT_W - 7} cy={ROBOT_Y + 7} r={3.5} fill={color} />
            <text x={x + 5} y={ROBOT_Y + 17} fontSize={8.5} fill={C.white} fontFamily={MONO} fontWeight={700}>
              {order ? BRANDS[order.brand].code : "—"}
            </text>
            <text x={x + 5} y={ROBOT_Y + 31} fontSize={8} fill={C.w70} fontFamily={MONO}>
              {order ? `${Math.min(r.item + 1, order.items.length)}/${order.items.length}` : ""}
            </text>
            <text x={x + ROBOT_W / 2} y={ROBOT_Y + ROBOT_H + 12} fontSize={9} fill={sel ? C.orange : C.white} fontFamily={MONO} fontWeight={700} textAnchor="middle">
              {robotName(r.id)}
            </text>
            <text x={x + ROBOT_W / 2} y={ROBOT_Y + ROBOT_H + 22} fontSize={6.8} fill={color} fontFamily={MONO} textAnchor="middle">
              {robotShortLabel(r)}
            </text>
          </g>
        );
      })}

      {/* Conveyor */}
      <rect x={CONVEYOR_X0} y={CONVEYOR_Y} width={BIN_X - CONVEYOR_X0} height={CONVEYOR_H} fill={C.w04} stroke={C.w30} />
      {Array.from({ length: Math.ceil((BIN_X - CONVEYOR_X0) / 12) }, (_, i) => {
        const off = (s.t * 8) % 12;
        const lx = CONVEYOR_X0 + i * 12 + off;
        if (lx >= BIN_X) return null;
        return <line key={i} x1={lx} x2={lx} y1={CONVEYOR_Y + 2} y2={CONVEYOR_Y + CONVEYOR_H - 2} stroke={C.w12} />;
      })}
      {s.mailers.map((m) => (
        <rect key={m.order} x={m.x} y={CONVEYOR_Y + 5} width={14} height={12} fill={C.paper} />
      ))}

      {/* Outbound bin */}
      <rect x={BIN_X} y={BIN_TOP} width={BIN_W} height={BIN_BOTTOM - BIN_TOP} fill={C.w04} stroke={C.w30} />
      <rect
        x={BIN_X + 1}
        y={BIN_BOTTOM - (s.bin.count / s.bin.cap) * (BIN_BOTTOM - BIN_TOP - 70)}
        width={BIN_W - 2}
        height={(s.bin.count / s.bin.cap) * (BIN_BOTTOM - BIN_TOP - 70)}
        fill={C.w12}
      />
      <Label x={BIN_X + 8} y={BIN_TOP + 16} fill={C.white}>
        Outbound bin
      </Label>
      <text x={BIN_X + 8} y={BIN_TOP + 42} fontSize={22} fill={C.white} fontFamily={MONO} className="metric">
        {s.bin.count}
      </text>
      <Label x={BIN_X + 8} y={BIN_TOP + 56} size={8.5} fill={C.w50}>
        / {s.bin.cap} mailers
      </Label>
      <Label x={BIN_X + 8} y={BIN_TOP + 68} size={8.5} fill={s.t - s.bin.truckAt < 120 ? C.white : C.w50}>
        {s.t - s.bin.truckAt < 120 ? `Truck ${s.bin.trucks} loaded` : `Trucks out ${s.bin.trucks}`}
      </Label>

      <Label x={CONVEYOR_X0} y={CONVEYOR_Y + CONVEYOR_H + 12} size={8.5} fill={C.w50}>
        Conveyor →  outbound bin  ·  carrier pickup when full
      </Label>

      {/* ---------- Remote pilots and floor tech ---------- */}
      <Label x={32} y={STRIP_Y + 18} fill={C.white}>
        03 · Remote pilots
      </Label>
      <Label x={160} y={STRIP_Y + 18} fill={C.w50}>
        Teleop · {(20 / Math.max(1, s.pilots.length)).toFixed(1)} robots per pilot
      </Label>
      {s.pilots.map((p, i) => {
        const x = 32 + i * 104;
        const y = STRIP_Y + 28;
        const busy = p.robot !== null;
        return (
          <g key={p.id} className={busy ? "robot-hit" : undefined} onClick={busy ? () => onSelect(p.robot!) : undefined}>
            <rect x={x} y={y} width={98} height={24} fill={busy ? C.w12 : "transparent"} stroke={busy ? C.w70 : C.w30} />
            <text x={x + 8} y={y + 16} fontSize={10} fill={C.white} fontFamily={MONO} fontWeight={700}>
              P{p.id}
            </text>
            <text x={x + 32} y={y + 16} fontSize={9} fill={busy ? C.white : C.w50} fontFamily={MONO}>
              {busy ? `→ ${robotName(p.robot!)} ${fmtDur(s.t - p.since)}` : "FREE"}
            </text>
          </g>
        );
      })}
      <g>
        <circle cx={32 + s.pilots.length * 104 + 10} cy={STRIP_Y + 40} r={4} fill={pilotWaiting > 0 ? C.fault : C.ok} />
        <text x={32 + s.pilots.length * 104 + 20} y={STRIP_Y + 43.5} fontSize={9} fill={C.w70} fontFamily={MONO} className="svg-label">
          {pilotWaiting > 0
            ? `${pilotWaiting} WAITING: ${s.pilotQueue.map(robotName).join(" ")}`
            : "NO ROBOT WAITS FOR A PILOT"}
        </text>
      </g>
      <Label x={1168} y={STRIP_Y + 18} anchor="end" fill={C.w50}>
        Floor tech: {s.tech.robot !== null ? `${s.tech.task === "fix" ? "fixing" : "to"} ${robotName(s.tech.robot)}` : "free"}
        {s.faultQueue.length > 0 ? ` · ${s.faultQueue.length} faults wait` : ""}
      </Label>

      {/* ---------- Policy skill by item class ---------- */}
      <Label x={32} y={SKILL_Y} fill={C.white}>
        04 · Policy autonomy by item class
      </Label>
      <Label x={290} y={SKILL_Y} fill={C.w50}>
        Fleet-wide · each pilot episode adds training data
      </Label>
      {GRASP_CLASSES.map((c, i) => {
        const w = (1168 - 32) / GRASP_CLASSES.length;
        const x = 32 + i * w;
        const y = SKILL_Y + 10;
        const a = classAutonomy(s, c);
        const a0 = 1 - s.skill[c].pilot0;
        const lo = 0.7;
        const bw = w - 20;
        const fx = (v: number) => x + 8 + bw * Math.max(0, Math.min(1, (v - lo) / (1 - lo)));
        return (
          <g key={c}>
            <rect x={x} y={y} width={w - 4} height={66} fill={C.w04} stroke={C.w12} />
            <Label x={x + 8} y={y + 16} fill={C.w70}>
              {CLASS_BASE[c].label}
            </Label>
            <text x={x + w - 12} y={y + 18} fontSize={15} fill={C.white} fontFamily={MONO} textAnchor="end" className="metric">
              {pct(a)}
            </text>
            <rect x={x + 8} y={y + 30} width={bw} height={6} fill={C.w12} />
            <rect x={x + 8} y={y + 30} width={fx(a) - x - 8} height={6} fill={C.white} />
            <line x1={fx(a0)} x2={fx(a0)} y1={y + 26} y2={y + 40} stroke={C.w50} />
            <Label x={x + 8} y={y + 56} size={8} fill={C.w50}>
              Start {pct(a0, 0)} · +{s.skill[c].episodes} episodes
            </Label>
          </g>
        );
      })}

      {/* ---------- People ---------- */}
      {s.pickers.map((p) => (
        <g key={`p${p.id}`}>
          <circle cx={p.x} cy={p.y} r={4.5} fill={p.task === "idle" ? C.w30 : C.w70} />
          {p.task === "to_robot" && <rect x={p.x + 5} y={p.y - 9} width={10} height={6} fill={C.charcoal} stroke={C.w70} />}
        </g>
      ))}
      <g>
        <circle cx={s.tech.x} cy={s.tech.y} r={6} fill={C.charcoal} stroke={C.white} strokeWidth={1.5} />
        <text x={s.tech.x} y={s.tech.y + 3} fontSize={7} fill={C.white} fontFamily={MONO} fontWeight={700} textAnchor="middle">
          T
        </text>
      </g>
    </svg>
  );
}
