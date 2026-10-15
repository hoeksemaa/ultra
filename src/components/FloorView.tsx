import { memo } from "react";
import { BRANDS, type GraspClass } from "@/sim/catalog";
import {
  AISLE_Y,
  RACK_COUNT,
  BIN_W,
  BIN_X,
  CELL_GAP,
  CELL_H,
  CELL_W,
  CONVEYOR_H,
  CONVEYOR_X0,
  CONVEYOR_Y,
  FLOOR_X0,
  LINE_X0,
  RACK_H,
  RACK_HEAD,
  RACK_ROWS,
  RACK_W,
  RACK_Y,
  ROBOT_H,
  ROBOT_W,
  ROBOT_Y,
  VIEW_H,
  VIEW_W,
  VIEW_Y0,
  cellPos,
  aisleX,
  ordersPerHour,
  rackX,
  robotName,
  robotProgress,
  robotTone,
  robotX,
  type Sim,
} from "@/sim/engine";
import { ICONS, type IconName } from "./icons";
import { CUBE, MAILER_H, MAILER_W, PACK_X, PACK_Y, TOTE_H, TOTE_W, cubeInTote, type View } from "./motion";
import Ring from "./Ring";
import { PilotMark, STATUS_ICON } from "./glyphs";
import { C, TONE_COLOR } from "./tokens";

const MONO = "var(--font-mono)";

const ICON = 24;
const BIN_TOP = ROBOT_Y - 106;
const BIN_BOTTOM = CONVEYOR_Y + CONVEYOR_H;
const BOX_TOP = BIN_TOP + 24; // the outbound box, under its open flaps
const VIEW_X0 = 16;

// Stock as 1 to 5 pips on the bin label, on a log scale. Alt shows the count.
function stockLevel(n: number) {
  return n <= 3 ? 1 : n <= 10 ? 2 : n <= 30 ? 3 : n <= 100 ? 4 : 5;
}

// What the side panels point at on the floor: a robot, or an item type.
export interface Focus {
  robot: number | null;
  cls: GraspClass | null;
}

// Icons never change, so they skip the 30 fps repaint.
const ItemIcon = memo(function ItemIcon({ name, x, y, color }: { name: IconName; x: number; y: number; color: string }) {
  const Icon = ICONS[name];
  return <Icon x={x} y={y} size={ICON} color={color} strokeWidth={1.75} />;
});

// Shelving for one brand: two uprights, a beam under each row of bins, and
// a sign with the brand code on top.
const RackFrame = memo(function RackFrame({ z }: { z: number }) {
  const rx = rackX(z);
  const top = RACK_Y + RACK_HEAD - 5;
  const bottom = RACK_Y + RACK_H;
  const plate = { x: rx + 20, y: RACK_Y + 6, w: RACK_W - 40, h: 24 };
  return (
    <g data-tip={`rack:${z}`} className="hint">
      <rect x={rx} y={RACK_Y} width={RACK_W} height={RACK_HEAD - 5} fill="transparent" />
      <line x1={rx + 32} x2={rx + 32} y1={plate.y + plate.h} y2={top} stroke={C.w30} />
      <line x1={rx + RACK_W - 32} x2={rx + RACK_W - 32} y1={plate.y + plate.h} y2={top} stroke={C.w30} />
      <rect x={plate.x} y={plate.y} width={plate.w} height={plate.h} fill={C.charcoal} stroke={C.w50} />
      <text x={rx + RACK_W / 2} y={plate.y + plate.h / 2} dy="0.36em" fontSize={16} fill={C.white} fontFamily={MONO} fontWeight={700} textAnchor="middle">
        {BRANDS[z].code}
      </text>
      <rect x={rx} y={top} width={3} height={bottom - top} fill={C.w30} />
      <rect x={rx + RACK_W - 3} y={top} width={3} height={bottom - top} fill={C.w30} />
      <rect x={rx} y={top} width={RACK_W} height={3} fill={C.w30} />
      {Array.from({ length: RACK_ROWS }, (_, r) => (
        <rect key={r} x={rx} y={RACK_Y + RACK_HEAD + r * (CELL_H + CELL_GAP) + CELL_H - 2} width={RACK_W} height={3} fill={C.w30} />
      ))}
    </g>
  );
});

// One shelf bin, seen from the front: an open hopper with the item inside,
// and a label on the front with the stock.
function Bin({
  x,
  y,
  icon,
  stock,
  glow,
  hi,
  focus,
  dim,
  detail,
}: {
  x: number;
  y: number;
  icon: IconName;
  stock: number;
  glow: number;
  hi: boolean;
  focus: boolean;
  dim: boolean;
  detail: boolean;
}) {
  const stroke = hi ? C.orange : focus ? C.white : C.w20;
  const level = stockLevel(stock);
  const lip = y + 38;
  const base = y + CELL_H - 2;
  return (
    <>
      <path
        d={`M${x + 2} ${base} V${lip} L${x + 5} ${y + 8} H${x + CELL_W - 5} L${x + CELL_W - 2} ${lip} V${base} Z`}
        fill={glow > 0 ? `rgba(255,255,255,${glow.toFixed(3)})` : C.w04}
        stroke={stroke}
        strokeWidth={hi || focus ? 2 : 1}
      />
      <ItemIcon name={icon} x={x + (CELL_W - ICON) / 2} y={y + 12} color={dim ? C.w12 : C.w70} />
      <rect x={x + 2} y={lip} width={CELL_W - 4} height={base - lip} fill={C.panel} stroke={stroke} strokeWidth={hi || focus ? 2 : 1} />
      {detail ? (
        <text x={x + CELL_W / 2} y={lip + 11} dy="0.36em" fontSize={11} fill={C.w70} fontFamily={MONO} textAnchor="middle" className="metric">
          {stock}
        </text>
      ) : (
        Array.from({ length: 5 }, (_, k) => (
          <rect key={k} x={x + 9.5 + k * 5} y={lip + 9.5} width={3} height={3} fill={k < level ? C.w50 : C.w12} />
        ))
      )}
    </>
  );
}

// A tote seen from above: a rim, and one cube for each item still in it.
function Tote({ x, y, cubes, active, hi }: { x: number; y: number; cubes: number; active: boolean; hi: boolean }) {
  const stroke = hi ? C.orange : active ? C.white : C.w50;
  return (
    <g>
      <rect x={x} y={y} width={TOTE_W} height={TOTE_H} fill={C.charcoal} stroke={stroke} strokeWidth={hi ? 2 : active ? 1.5 : 1} />
      <rect x={x + 1.5} y={y + 1.5} width={TOTE_W - 3} height={TOTE_H - 3} fill="none" stroke={hi ? C.orange : C.w12} strokeWidth={0.75} />
      {Array.from({ length: cubes }, (_, slot) => {
        const c = cubeInTote({ x, y }, slot);
        return <rect key={slot} x={c.x} y={c.y} width={CUBE} height={CUBE} fill={hi ? C.orange : C.w70} />;
      })}
    </g>
  );
}

// A mailer: a small parcel with a strip of tape across it.
function Mailer({ x, y, hi }: { x: number; y: number; hi: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={MAILER_W} height={MAILER_H} fill={hi ? C.orange : C.paper} />
      <rect x={x + MAILER_W / 2 - 1.5} y={y} width={3} height={MAILER_H} fill="rgba(27,27,27,0.22)" />
    </g>
  );
}

interface Props {
  sim: Sim;
  view: View;
  selectedOrder: number | null;
  focus: Focus;
  detail: boolean;
}

export default function FloorView({ sim, view, selectedOrder, focus, detail }: Props) {
  const s = sim;
  // The selected order, marked in orange where it is now: its items on the
  // shelves (waiting or still to pick), the picker, its tote and cubes, or
  // its mailer.
  const so = selectedOrder;
  const order = so !== null ? s.orders.get(so) : undefined;
  const picker = so !== null ? s.pickers.find((p) => p.order === so) : undefined;
  const onShelf = new Set<string>();
  if (order?.status === "queued") for (const i of order.items) onShelf.add(BRANDS[order.brand].items[i].sku);
  if (order && picker) for (const st of picker.stops) onShelf.add(BRANDS[order.brand].items[st.item].sku);
  const perHour = ordersPerHour(s);

  return (
    <svg
      viewBox={`${VIEW_X0} ${VIEW_Y0} ${VIEW_W - 2 * VIEW_X0} ${VIEW_H - VIEW_Y0}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Warehouse floor: pick racks, packing robots, and the belt to the outbound box"
    >
      {/* Tour targets */}
      <rect data-tour="racks" x={FLOOR_X0} y={RACK_Y} width={1136} height={RACK_H} fill="none" pointerEvents="none" />
      <rect data-tour="robots" x={LINE_X0 - 6} y={ROBOT_Y - 118} width={BIN_X - LINE_X0 - 6} height={ROBOT_H + 148} fill="none" pointerEvents="none" />

      {/* Aisle center lines: one beside each rack, and the front aisle. */}
      {Array.from({ length: RACK_COUNT + 1 }, (_, i) => (
        <line key={i} x1={aisleX(i)} x2={aisleX(i)} y1={RACK_Y + RACK_HEAD} y2={AISLE_Y} stroke={C.w12} strokeDasharray="2 6" />
      ))}
      <line x1={20} x2={1180} y1={AISLE_Y} y2={AISLE_Y} stroke={C.w12} strokeDasharray="2 6" />

      {/* ---------- Pick floor ---------- */}
      {BRANDS.map((b, z) => (
        <g key={b.code}>
          <RackFrame z={z} />
          {b.items.map((it, i) => {
            const { x, y } = cellPos(z, i);
            const at = s.flash.get(it.sku);
            const age = at === undefined ? 99 : s.t - at;
            const glow = age < 6 ? 0.3 * (1 - age / 6) : 0;
            const match = focus.cls === it.cls;
            return (
              <g key={it.sku} className="hint" data-tip={`item:${z}:${i}`}>
                <rect x={x} y={y} width={CELL_W} height={CELL_H} fill="transparent" />
                <Bin
                  x={x}
                  y={y}
                  icon={it.icon}
                  stock={s.stock[z][i]}
                  glow={glow}
                  hi={onShelf.has(it.sku)}
                  focus={match}
                  dim={focus.cls !== null && !match}
                  detail={detail}
                />
              </g>
            );
          })}
        </g>
      ))}

      {/* ---------- Pack line ---------- */}
      {/* Totes first, so an empty tote can slide down behind its robot. */}
      {[...view.totes.values()].map((t) => {
        const o = s.orders.get(t.order);
        return <Tote key={t.order} x={t.x} y={t.y} cubes={o ? o.items.length - o.packed : 0} active={t.active} hi={t.order === so} />;
      })}

      {s.robots.map((r) => {
        const x = robotX(r.id);
        const tone = robotTone(r);
        const color = TONE_COLOR[tone];
        const piloted = tone === "pilot";
        const flashAge = s.t - r.flash;
        const focused = focus.robot === r.id;
        const Status = STATUS_ICON[r.phase];
        const cx = x + ROBOT_W / 2;
        const below = ROBOT_Y + ROBOT_H + 5;
        const arm = piloted ? C.pilot : C.w50;
        return (
          <g key={r.id} data-tip={`robot:${r.id}`} className="hint">
            <rect x={x - 4} y={ROBOT_Y - 8} width={ROBOT_W + 8} height={ROBOT_H + 36} fill="transparent" />
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
            {focused && <rect x={x - 5} y={ROBOT_Y - 9} width={ROBOT_W + 10} height={ROBOT_H + 36} fill="none" stroke={C.white} strokeWidth={1.5} />}
            {/* Two grippers reach up to the tote in work. */}
            <path d={`M${x + 8} ${ROBOT_Y} V${ROBOT_Y - 6} M${x + 14} ${ROBOT_Y} V${ROBOT_Y - 6}`} stroke={arm} strokeWidth={2} />
            <path d={`M${x + ROBOT_W - 14} ${ROBOT_Y} V${ROBOT_Y - 6} M${x + ROBOT_W - 8} ${ROBOT_Y} V${ROBOT_Y - 6}`} stroke={arm} strokeWidth={2} />
            <rect x={x} y={ROBOT_Y} width={ROBOT_W} height={ROBOT_H} fill={C.panel} stroke={piloted ? C.pilot : C.w50} strokeWidth={piloted ? 1.5 : 1} />
            <rect x={x} y={ROBOT_Y + ROBOT_H - 4} width={ROBOT_W} height={4} fill={color} />
            <text x={cx} y={ROBOT_Y + 14} fontSize={12} fill={focused ? C.white : C.w70} fontFamily={MONO} fontWeight={600} textAnchor="middle">
              {robotName(r.id)}
            </text>
            <Ring cx={cx} cy={ROBOT_Y + 30} r={8.5} width={3.5} value={robotProgress(r)} color={color} />
            {/* Pack area: packed cubes wait here for the mailer. */}
            <rect x={x + PACK_X - 2} y={ROBOT_Y + PACK_Y - 2} width={ROBOT_W - 2 * (PACK_X - 2)} height={CUBE + 4} fill="none" stroke={C.w12} />
            {/* Below the robot: who is in control, or why it stopped. */}
            {piloted && r.pilot !== null ? (
              <g transform={`translate(${cx - 11} ${below}) scale(${22 / 24})`}>
                <PilotMark id={r.pilot} busy />
              </g>
            ) : (
              Status && <Status x={cx - 9} y={below + 2} size={18} color={color} strokeWidth={2.25} />
            )}
          </g>
        );
      })}

      {/* Packed cubes, on top of the robots they slide into. */}
      {[...view.cubes.entries()].map(([key, c]) => (
        <rect key={key} x={c.x} y={c.y} width={CUBE} height={CUBE} fill={c.order === so ? C.orange : C.w70} />
      ))}

      {/* Conveyor */}
      <rect x={CONVEYOR_X0} y={CONVEYOR_Y} width={BIN_X - CONVEYOR_X0} height={CONVEYOR_H} fill={C.w04} stroke={C.w30} />
      {Array.from({ length: Math.ceil((BIN_X - CONVEYOR_X0) / 12) }, (_, i) => {
        const lx = CONVEYOR_X0 + i * 12 + ((s.t * 8) % 12);
        if (lx >= BIN_X) return null;
        return <line key={i} x1={lx} x2={lx} y1={CONVEYOR_Y + 2} y2={CONVEYOR_Y + CONVEYOR_H - 2} stroke={C.w12} />;
      })}
      {/* The selected order's mailer is solid orange and drawn last, on top. */}
      {[...view.mailers.values()]
        .filter((m) => m.stage !== "pack")
        .sort((a, b) => Number(a.order === so) - Number(b.order === so))
        .map((m) => (
          <Mailer key={m.order} x={m.x} y={m.y} hi={m.order === so} />
        ))}

      {/* Outbound: an open shipping box. Big number: mailers shipped. Small: orders per hour. */}
      <g data-tip="bin" data-tour="bin" className="hint">
        <path d={`M${BIN_X} ${BOX_TOP} L${BIN_X - 8} ${BIN_TOP} H${BIN_X + 38} L${BIN_X + 46} ${BOX_TOP} Z`} fill={C.panel} stroke={C.w30} />
        <path
          d={`M${BIN_X + BIN_W} ${BOX_TOP} L${BIN_X + BIN_W + 8} ${BIN_TOP} H${BIN_X + BIN_W - 38} L${BIN_X + BIN_W - 46} ${BOX_TOP} Z`}
          fill={C.panel}
          stroke={C.w30}
        />
        <rect x={BIN_X} y={BOX_TOP} width={BIN_W} height={BIN_BOTTOM - BOX_TOP} fill={C.panel} stroke={C.w50} />
        <rect x={BIN_X} y={BOX_TOP} width={BIN_W} height={10} fill={C.w12} />
        <rect x={BIN_X} y={CONVEYOR_Y} width={10} height={CONVEYOR_H} fill={C.charcoal} stroke={C.w30} />
        <text x={BIN_X + BIN_W / 2} y={BOX_TOP + 92} fontSize={36} fill={C.white} fontFamily={MONO} fontWeight={600} textAnchor="middle" className="metric">
          {s.shipped}
        </text>
        {perHour !== null && (
          <text x={BIN_X + BIN_W / 2} y={BOX_TOP + 118} fontSize={14} fill={C.w50} fontFamily={MONO} textAnchor="middle" className="metric">
            {Math.round(perHour)}/h
          </text>
        )}
      </g>

      {/* ---------- Pickers ---------- */}
      {s.pickers.map((p) => (
        <g key={p.id} pointerEvents="none">
          {p === picker && <circle cx={p.x} cy={p.y} r={10} fill="none" stroke={C.orange} strokeWidth={2} />}
          <circle cx={p.x} cy={p.y} r={5.5} fill={p === picker ? C.orange : p.task === "idle" ? C.w30 : C.w70} />
          {p.order !== null && <rect x={p.x + 6} y={p.y - 12} width={12} height={8} fill={C.charcoal} stroke={p === picker ? C.orange : C.w70} />}
        </g>
      ))}
    </svg>
  );
}
