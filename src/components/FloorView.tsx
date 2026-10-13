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
  classAutonomy,
  robotLabel,
  robotLight,
  robotName,
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
const TOTE_H = 12;
const TOTE_PITCH = 16;

const BIN_TOP = 470;
const BIN_BOTTOM = CONVEYOR_Y + CONVEYOR_H;

const PILOT_Y = 714;
const LEARN_Y = 774;

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

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Warehouse floor and robot line">
      {/* ---------- Pick floor ---------- */}
      <Label x={32} y={26} fill={C.white}>
        01 · Pick floor
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
            {b.items.map((it, i) => {
              const x = r.x + 8 + (i % BIN_COLS) * (BIN_CELL_W + BIN_GAP);
              const y = r.y + 24 + Math.floor(i / BIN_COLS) * (BIN_CELL_H + BIN_GAP);
              const at = s.flash.get(it.sku);
              const age = at === undefined ? 99 : s.t - at;
              const glow = age < 6 ? 0.55 * (1 - age / 6) : 0;
              return (
                <rect
                  key={it.sku}
                  x={x}
                  y={y}
                  width={BIN_CELL_W}
                  height={BIN_CELL_H}
                  fill={glow > 0 ? `rgba(255,255,255,${glow.toFixed(3)})` : "transparent"}
                  stroke={C.w12}
                >
                  <title>{`${it.name} · ${it.lb} lb`}</title>
                </rect>
              );
            })}
          </g>
        );
      })}

      {/* ---------- Pack line ---------- */}
      <Label x={32} y={440} fill={C.white}>
        02 · Pack line
      </Label>

      {s.robots.map((r) => {
        const x = robotX(r.id);
        const color = LIGHT_COLOR[robotLight(r)];
        const sel = selected === r.id;
        const flashAge = s.t - r.flash;
        return (
          <g key={r.id} className="robot-hit" onClick={() => onSelect(r.id)}>
            <rect x={x - 4} y={452} width={ROBOT_W + 8} height={ROBOT_Y + ROBOT_H + 24 - 452} fill="transparent" />
            {r.queue.map((oid, k) => (
              <rect
                key={oid}
                x={x + (ROBOT_W - TOTE_W) / 2}
                y={ROBOT_Y - 6 - (k + 1) * TOTE_PITCH}
                width={TOTE_W}
                height={TOTE_H}
                fill={C.charcoal}
                stroke={C.w50}
              />
            ))}
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
            <rect x={x} y={ROBOT_Y + ROBOT_H - 4} width={ROBOT_W} height={4} fill={color} />
            <text x={x + ROBOT_W / 2} y={ROBOT_Y + 23} fontSize={10} fill={sel ? C.orange : C.white} fontFamily={MONO} fontWeight={700} textAnchor="middle">
              {robotName(r.id)}
            </text>
            <text x={x + ROBOT_W / 2} y={ROBOT_Y + ROBOT_H + 13} fontSize={6.8} fill={color} fontFamily={MONO} fontWeight={600} textAnchor="middle">
              {robotLabel(r)}
            </text>
          </g>
        );
      })}

      {/* Conveyor */}
      <rect x={CONVEYOR_X0} y={CONVEYOR_Y} width={BIN_X - CONVEYOR_X0} height={CONVEYOR_H} fill={C.w04} stroke={C.w30} />
      {Array.from({ length: Math.ceil((BIN_X - CONVEYOR_X0) / 12) }, (_, i) => {
        const lx = CONVEYOR_X0 + i * 12 + ((s.t * 8) % 12);
        if (lx >= BIN_X) return null;
        return <line key={i} x1={lx} x2={lx} y1={CONVEYOR_Y + 2} y2={CONVEYOR_Y + CONVEYOR_H - 2} stroke={C.w12} />;
      })}
      {s.mailers.map((m) => (
        <rect key={m.order} x={m.x} y={CONVEYOR_Y + 5} width={14} height={12} fill={C.paper} />
      ))}

      {/* Outbound bin */}
      <rect x={BIN_X} y={BIN_TOP} width={BIN_W} height={BIN_BOTTOM - BIN_TOP} fill={C.w04} stroke={C.w30} />
      <Label x={BIN_X + 8} y={BIN_TOP + 16} fill={C.white}>
        Outbound
      </Label>
      <text x={BIN_X + 8} y={BIN_TOP + 44} fontSize={24} fill={C.white} fontFamily={MONO} className="metric">
        {s.shipped}
      </text>
      <Label x={BIN_X + 8} y={BIN_TOP + 58} size={8.5} fill={C.w50}>
        Mailers
      </Label>

      {/* ---------- Remote pilots ---------- */}
      <Label x={32} y={PILOT_Y} fill={C.white}>
        03 · Remote pilots
      </Label>
      {s.pilots.map((p, i) => {
        const x = 32 + i * 92;
        const y = PILOT_Y + 10;
        const busy = p.robot !== null;
        return (
          <g key={p.id} className={busy ? "robot-hit" : undefined} onClick={busy ? () => onSelect(p.robot!) : undefined}>
            <rect x={x} y={y} width={86} height={24} fill={busy ? C.w12 : "transparent"} stroke={busy ? C.w70 : C.w30} />
            <text x={x + 8} y={y + 16} fontSize={10} fill={C.white} fontFamily={MONO} fontWeight={700}>
              P{p.id}
            </text>
            <text x={x + 34} y={y + 16} fontSize={9} fill={busy ? C.white : C.w50} fontFamily={MONO}>
              {busy ? `→ ${robotName(p.robot!)}` : "FREE"}
            </text>
          </g>
        );
      })}

      {/* ---------- Fleet learning ---------- */}
      <Label x={32} y={LEARN_Y} fill={C.white}>
        04 · Autonomy by item type
      </Label>
      <Label x={1168} y={LEARN_Y} anchor="end" fill={C.w50}>
        Each pilot assist trains the whole fleet
      </Label>
      {GRASP_CLASSES.map((c, i) => {
        const w = (1168 - 32) / GRASP_CLASSES.length;
        const x = 32 + i * w;
        const y = LEARN_Y + 10;
        const a = classAutonomy(s, c);
        const bw = w - 20;
        return (
          <g key={c}>
            <rect x={x} y={y} width={w - 4} height={44} fill={C.w04} stroke={C.w12} />
            <Label x={x + 8} y={y + 17} fill={C.w70}>
              {CLASS_BASE[c].label}
            </Label>
            <text x={x + w - 12} y={y + 18} fontSize={14} fill={C.white} fontFamily={MONO} textAnchor="end" className="metric">
              {pct(a, 0)}
            </text>
            <rect x={x + 8} y={y + 28} width={bw} height={6} fill={C.w12} />
            <rect x={x + 8} y={y + 28} width={bw * a} height={6} fill={C.white} />
          </g>
        );
      })}

      {/* ---------- Pickers ---------- */}
      {s.pickers.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r={4.5} fill={p.task === "idle" ? C.w30 : C.w70} />
          {p.task === "to_robot" && <rect x={p.x + 5} y={p.y - 9} width={10} height={6} fill={C.charcoal} stroke={C.w70} />}
        </g>
      ))}
    </svg>
  );
}
