import { memo, useState } from "react";
import { BRANDS } from "@/sim/catalog";
import {
  AISLE_Y,
  RACK_COUNT,
  BIN_W,
  BIN_X,
  CELL_H,
  CELL_W,
  CONVEYOR_H,
  CONVEYOR_X0,
  CONVEYOR_Y,
  DROP_Y,
  PILOT_Y,
  RACK_H,
  RACK_HEAD,
  RACK_W,
  RACK_Y,
  ROBOT_H,
  ROBOT_W,
  ROBOT_Y,
  VIEW_H,
  VIEW_W,
  cellPos,
  aisleX,
  rackX,
  robotLabel,
  robotLight,
  robotName,
  robotProgress,
  robotX,
  type Sim,
} from "@/sim/engine";
import { ICONS, type IconName } from "./icons";
import { CUBE, MAILER_H, MAILER_W, PACK_X, PACK_Y, TOTE_H, TOTE_W, cubeInTote, type View } from "./motion";
import Ring from "./Ring";
import { C, LIGHT_COLOR } from "./tokens";

const MONO = "var(--font-mono)";
const SANS = "var(--font-sans)";

const ICON = 20;


const BIN_TOP = ROBOT_Y - 106;
const BIN_BOTTOM = CONVEYOR_Y + CONVEYOR_H;

const TIP_W = 230;

interface Tip {
  x: number;
  y: number;
  title: string;
  text: string;
}

// Icons never change, so they skip the 20 fps repaint.
const ItemIcon = memo(function ItemIcon({ name, x, y }: { name: IconName; x: number; y: number }) {
  const Icon = ICONS[name];
  return <Icon x={x} y={y} size={ICON} color={C.w70} strokeWidth={1.75} />;
});

// A tote with one cube for each item still in it, left-aligned.
function Tote({ x, y, cubes, active }: { x: number; y: number; cubes: number; active: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={TOTE_W} height={TOTE_H} fill={C.charcoal} stroke={active ? C.white : C.w50} strokeWidth={active ? 1.5 : 1} />
      {Array.from({ length: cubes }, (_, slot) => {
        const c = cubeInTote({ x, y }, slot);
        return <rect key={slot} x={c.x} y={c.y} width={CUBE} height={CUBE} fill={C.w70} />;
      })}
    </g>
  );
}

interface Props {
  sim: Sim;
  view: View;
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

export default function FloorView({ sim, view, selected, onSelect }: Props) {
  const s = sim;
  const [tip, setTip] = useState<Tip | null>(null);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMin meet" role="img" aria-label="Warehouse floor and robot line">
      {/* ---------- Pick floor ---------- */}
      <Label x={32} y={26} fill={C.white}>
        01 · Pick floor
      </Label>

      {/* Aisle center lines: one beside each rack, and the front aisle. */}
      {Array.from({ length: RACK_COUNT + 1 }, (_, i) => (
        <line key={i} x1={aisleX(i)} x2={aisleX(i)} y1={RACK_Y + RACK_HEAD} y2={AISLE_Y} stroke={C.w12} strokeDasharray="2 6" />
      ))}
      <line x1={20} x2={1180} y1={AISLE_Y} y2={AISLE_Y} stroke={C.w12} strokeDasharray="2 6" />

      {BRANDS.map((b, z) => {
        const rx = rackX(z);
        return (
          <g key={b.code}>
            <rect x={rx} y={RACK_Y} width={RACK_W} height={RACK_H} fill={C.w04} stroke={C.w30} />
            <g
              className="hint"
              onMouseEnter={() => setTip({ x: rx, y: RACK_Y + RACK_HEAD - 2, title: b.name, text: b.about })}
              onMouseLeave={() => setTip(null)}
            >
              <rect x={rx} y={RACK_Y} width={RACK_W} height={RACK_HEAD - 4} fill="transparent" />
              <text x={rx + 5} y={RACK_Y + 14} fontSize={10} fill={C.white} fontFamily={MONO} fontWeight={700}>
                {b.code}
              </text>
              <text x={rx + 5} y={RACK_Y + 27} fontSize={9.5} fill={C.w70} fontFamily={SANS}>
                {b.name}
              </text>
            </g>
            {b.items.map((it, i) => {
              const { x, y } = cellPos(z, i);
              const at = s.flash.get(it.sku);
              const age = at === undefined ? 99 : s.t - at;
              const glow = age < 6 ? 0.3 * (1 - age / 6) : 0;
              return (
                <g
                  key={it.sku}
                  className="hint"
                  onMouseEnter={() => setTip({ x, y: y + CELL_H + 2, title: it.name, text: `${it.lb} lb` })}
                  onMouseLeave={() => setTip(null)}
                >
                  <rect
                    x={x}
                    y={y}
                    width={CELL_W}
                    height={CELL_H}
                    fill={glow > 0 ? `rgba(255,255,255,${glow.toFixed(3)})` : "transparent"}
                    stroke={C.w12}
                  />
                  <ItemIcon name={it.icon} x={x + (CELL_W - ICON) / 2} y={y + 8} />
                  <text x={x + CELL_W / 2} y={y + 42} fontSize={9.5} fill={C.w50} fontFamily={MONO} textAnchor="middle" className="metric">
                    ×{s.stock[z][i]}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* ---------- Pack line ---------- */}
      <Label x={32} y={AISLE_Y + 32} fill={C.white}>
        02 · Pack line
      </Label>

      {/* Totes first, so an empty tote can slide down behind its robot. */}
      {[...view.totes.values()].map((t) => {
        const o = s.orders.get(t.order);
        return <Tote key={t.order} x={t.x} y={t.y} cubes={o ? o.items.length - o.packed : 0} active={t.active} />;
      })}

      {s.robots.map((r) => {
        const x = robotX(r.id);
        const color = LIGHT_COLOR[robotLight(r)];
        const sel = selected === r.id;
        const flashAge = s.t - r.flash;
        return (
          <g key={r.id} className="robot-hit" onClick={() => onSelect(r.id)}>
            <rect x={x - 4} y={DROP_Y} width={ROBOT_W + 8} height={ROBOT_Y + ROBOT_H + 24 - DROP_Y} fill="transparent" />
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
              fill={sel ? C.selFill : C.panel}
              stroke={sel ? C.orange : C.w50}
              strokeWidth={sel ? 2 : 1}
            />
            <rect x={x} y={ROBOT_Y + ROBOT_H - 4} width={ROBOT_W} height={4} fill={color} />
            <text x={x + ROBOT_W / 2} y={ROBOT_Y + 13} fontSize={10} fill={sel ? C.orange : C.white} fontFamily={MONO} fontWeight={700} textAnchor="middle">
              {robotName(r.id)}
            </text>
            <Ring cx={x + ROBOT_W / 2} cy={ROBOT_Y + 29} r={8} width={3} value={robotProgress(r)} color={color} />
            {/* Pack area: packed cubes wait here for the mailer. */}
            <rect x={x + PACK_X - 2} y={ROBOT_Y + PACK_Y - 2} width={ROBOT_W - 2 * (PACK_X - 2)} height={CUBE + 4} fill="none" stroke={C.w12} />
            <text x={x + ROBOT_W / 2} y={ROBOT_Y + ROBOT_H + 13} fontSize={6.8} fill={color} fontFamily={MONO} fontWeight={600} textAnchor="middle">
              {robotLabel(r)}
            </text>
          </g>
        );
      })}

      {/* Packed cubes, on top of the robots they slide into. */}
      {[...view.cubes.entries()].map(([key, c]) => (
        <rect key={key} x={c.x} y={c.y} width={CUBE} height={CUBE} fill={C.w70} />
      ))}

      {/* Conveyor */}
      <rect x={CONVEYOR_X0} y={CONVEYOR_Y} width={BIN_X - CONVEYOR_X0} height={CONVEYOR_H} fill={C.w04} stroke={C.w30} />
      {Array.from({ length: Math.ceil((BIN_X - CONVEYOR_X0) / 12) }, (_, i) => {
        const lx = CONVEYOR_X0 + i * 12 + ((s.t * 8) % 12);
        if (lx >= BIN_X) return null;
        return <line key={i} x1={lx} x2={lx} y1={CONVEYOR_Y + 2} y2={CONVEYOR_Y + CONVEYOR_H - 2} stroke={C.w12} />;
      })}
      {[...view.mailers.values()].map((m) =>
        m.stage === "pack" ? null : <rect key={m.order} x={m.x} y={m.y} width={MAILER_W} height={MAILER_H} fill={C.paper} />,
      )}

      {/* Outbound bin */}
      <rect x={BIN_X} y={BIN_TOP} width={BIN_W} height={BIN_BOTTOM - BIN_TOP} fill={C.panel} stroke={C.w30} />
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

      {/* ---------- Pickers ---------- */}
      {s.pickers.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r={4.5} fill={p.task === "idle" ? C.w30 : C.w70} />
          {p.order !== null && <rect x={p.x + 5} y={p.y - 9} width={10} height={6} fill={C.charcoal} stroke={C.w70} />}
        </g>
      ))}

      {tip && (
        <foreignObject x={Math.min(tip.x, VIEW_W - TIP_W - 8)} y={tip.y} width={TIP_W} height={120} pointerEvents="none">
          <div className="tip">
            <div className="label">{tip.title}</div>
            <div className="tip-text">{tip.text}</div>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
