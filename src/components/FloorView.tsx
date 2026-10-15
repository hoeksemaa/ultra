import { memo, useState } from "react";
import { BRANDS } from "@/sim/catalog";
import {
  AISLE_Y,
  BIN_W,
  BIN_X,
  CELL_H,
  CELL_W,
  CONVEYOR_H,
  CONVEYOR_X0,
  CONVEYOR_Y,
  LINE_X0,
  MAX_PILOTS,
  PILOT_Y,
  RACK_COUNT,
  RACK_H,
  RACK_HEAD,
  RACK_W,
  RACK_Y,
  ROBOT_H,
  ROBOT_W,
  ROBOT_Y,
  SEAT_H,
  VIEW_H,
  VIEW_W,
  aisleX,
  cellPos,
  pilotLeaving,
  rackX,
  robotNumber,
  robotProgress,
  robotStatus,
  robotX,
  type Sim,
} from "@/sim/engine";
import { ICONS, type IconName } from "./icons";
import { CUBE, MAILER_H, MAILER_W, PACK_X, PACK_Y, TOTE_H, TOTE_W, cubeInTote, type View } from "./motion";
import Ring from "./Ring";
import { ActIcon, PilotIcon } from "./signs";
import { C } from "./tokens";
import type { TipBind } from "./Tooltip";

const MONO = "var(--font-mono)";
const SANS = "var(--font-sans)";

// The floor never draws smaller than 2/3 scale (globals.css: .floor svg), so
// 18 units of text are 12 px or more.
const TEXT = 18;
const ICON = 26;
const BIN_TOP = ROBOT_Y - 106;
const BIN_BOTTOM = CONVEYOR_Y + CONVEYOR_H;

// Pilot controls and seats: fixed places, by pilot number.
const BTN = 32;
const MINUS_X = LINE_X0;
const PLUS_X = LINE_X0 + BTN + 8;
const SEAT_X0 = PLUS_X + BTN + 24;
const SEAT_W = 56;
const SEAT_PITCH = 64;
const seatX = (id: number) => SEAT_X0 + (id - 1) * SEAT_PITCH;

// Hit area around small things that select an order.
const HIT = 6;

// Icons never change, so they skip the repaint.
const ItemIcon = memo(function ItemIcon({ name, x, y }: { name: IconName; x: number; y: number }) {
  const Icon = ICONS[name];
  return <Icon x={x} y={y} size={ICON} color={C.ink2} strokeWidth={1.75} />;
});

// A tote with one cube for each item still in it, left-aligned.
function Tote({ x, y, cubes, active, sel, hover }: { x: number; y: number; cubes: number; active: boolean; sel: boolean; hover: boolean }) {
  const stroke = sel || hover ? C.orange : active ? C.ink : C.ink3;
  return (
    <g>
      <rect x={x} y={y} width={TOTE_W} height={TOTE_H} rx={2} fill={C.page} stroke={stroke} strokeWidth={sel ? 2 : active || hover ? 1.5 : 1} />
      {Array.from({ length: cubes }, (_, slot) => {
        const c = cubeInTote({ x, y }, slot);
        return <rect key={slot} x={c.x} y={c.y} width={CUBE} height={CUBE} fill={sel ? C.orange : C.ink2} />;
      })}
    </g>
  );
}

// A pilot: the headset and the pilot's number, in a box.
function PilotBox({ x, y, w, h, id, busy }: { x: number; y: number; w: number; h: number; id: number | ""; busy: boolean }) {
  const icon = TEXT;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={busy ? C.line : "none"} stroke={busy ? C.ink2 : C.line2} />
      <PilotIcon x={x + 5} y={y + (h - icon) / 2} size={icon} color={busy ? C.ink : C.ink3} strokeWidth={2} />
      <text x={x + 26} y={y + h / 2 + 6} fontSize={TEXT} fill={busy ? C.ink : C.ink3} fontFamily={MONO} fontWeight={600} className="metric">
        {id}
      </text>
    </>
  );
}

interface Props {
  sim: Sim;
  view: View;
  selectedOrder: number | null;
  onSelectOrder: (order: number | null) => void;
  onPilots: (delta: number) => void;
  tip: TipBind;
}

export default function FloorView({ sim, view, selectedOrder, onSelectOrder, onPilots, tip }: Props) {
  const s = sim;
  const so = selectedOrder;
  const [hover, setHover] = useState<number | null>(null); // order under the pointer
  const [pilotHover, setPilotHover] = useState(0); // -1, 0, or +1

  // The selected order, marked in orange where it is now: its items on the
  // shelves (picking), the picker, its tote and cubes, or its mailer.
  const order = so !== null ? s.orders.get(so) : undefined;
  const picker = so !== null ? s.pickers.find((p) => p.order === so) : undefined;
  const onShelf = new Set<string>();
  if (order && picker) for (const st of picker.stops) onShelf.add(BRANDS[order.brand].items[st.item].sku);

  // Click an order to follow it. A second click stops.
  const pick = (id: number) => ({
    className: "pickable",
    onClick: () => onSelectOrder(so === id ? null : id),
    onPointerEnter: () => setHover(id),
    onPointerLeave: () => setHover((h) => (h === id ? null : h)),
  });

  // Pilot seat previews: + adds the lowest free seat (or keeps a leaving
  // pilot); − sends the last pilot within the target away.
  const leavingIdx = s.pilots.findIndex((p) => pilotLeaving(s, p));
  let addId: number | null = null;
  let keepId: number | null = null;
  if (pilotHover > 0 && s.pilotTarget < MAX_PILOTS) {
    if (leavingIdx >= 0) keepId = s.pilots[leavingIdx].id;
    else {
      addId = 1;
      while (s.pilots.some((p) => p.id === addId)) addId++;
    }
  }
  const dropId = pilotHover < 0 && s.pilotTarget > 1 ? s.pilots[s.pilotTarget - 1]?.id : undefined;

  const firstTote = s.robots.find((r) => r.order !== null)?.order ?? null;
  const firstAct = s.robots.find((r) => robotStatus(s, r) === "act")?.id ?? null;

  const pilotButton = (delta: number, x: number) => {
    const enabled = delta > 0 ? s.pilotTarget < MAX_PILOTS : s.pilotTarget > 1;
    return (
      <g
        className={`svg-btn ${enabled ? "" : "off"}`}
        role="button"
        tabIndex={0}
        aria-label={delta > 0 ? "Add a pilot" : "Remove a pilot"}
        aria-disabled={!enabled}
        onClick={() => enabled && onPilots(delta)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && enabled) onPilots(delta);
        }}
        onPointerEnter={(e) => {
          setPilotHover(delta);
          tip(`pilot${delta}`, { kind: "ui", title: delta > 0 ? "Add a pilot" : "Remove a pilot", keys: delta > 0 ? "+" : "-" }).onPointerEnter(e);
        }}
        onPointerLeave={() => {
          setPilotHover(0);
          tip(`pilot${delta}`, { kind: "ui", title: "" }).onPointerLeave();
        }}
      >
        <rect x={x} y={PILOT_Y} width={BTN} height={BTN} rx={6} fill={C.panel} stroke={C.line2} />
        <text x={x + BTN / 2} y={PILOT_Y + BTN / 2 + 7} fontSize={22} fill={C.ink} fontFamily={SANS} fontWeight={600} textAnchor="middle">
          {delta > 0 ? "+" : "−"}
        </text>
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Warehouse floor and robot line">
      {/* A click on the empty floor stops following an order. */}
      <rect width={VIEW_W} height={VIEW_H} fill="transparent" onClick={() => onSelectOrder(null)} />

      {/* ---------- Pick floor ---------- */}
      {Array.from({ length: RACK_COUNT + 1 }, (_, i) => (
        <line key={i} x1={aisleX(i)} x2={aisleX(i)} y1={RACK_Y + RACK_HEAD} y2={AISLE_Y} stroke={C.line} strokeDasharray="2 6" />
      ))}
      <line x1={20} x2={1180} y1={AISLE_Y} y2={AISLE_Y} stroke={C.line} strokeDasharray="2 6" />

      {BRANDS.map((b, z) => {
        const rx = rackX(z);
        return (
          <g key={b.code}>
            <rect x={rx} y={RACK_Y} width={RACK_W} height={RACK_H} rx={6} fill={C.panel} stroke={C.line2} />
            <g className="hint" {...tip(`brand${z}`, { kind: "brand", brand: z }, true)}>
              <rect x={rx} y={RACK_Y} width={RACK_W} height={RACK_HEAD} fill="transparent" />
              <text x={rx + 8} y={RACK_Y + 22} fontSize={TEXT} fill={C.ink} fontFamily={MONO} fontWeight={700}>
                {b.code}
              </text>
            </g>
            {b.items.map((it, i) => {
              const { x, y } = cellPos(z, i);
              const at = s.flash.get(it.sku);
              const age = at === undefined ? 99 : s.t - at;
              const glow = age < 6 ? 0.3 * (1 - age / 6) : 0;
              const mark = onShelf.has(it.sku);
              return (
                <g key={it.sku} className="hint" {...tip(`item${it.sku}`, { kind: "item", brand: z, item: i }, true)}>
                  <rect
                    x={x}
                    y={y}
                    width={CELL_W}
                    height={CELL_H}
                    rx={4}
                    fill={glow > 0 ? `rgba(255,255,255,${glow.toFixed(3)})` : "transparent"}
                    stroke={mark ? C.orange : C.line}
                    strokeWidth={mark ? 2 : 1}
                  />
                  <ItemIcon name={it.icon} x={x + (CELL_W - ICON) / 2} y={y + (CELL_H - ICON) / 2} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* ---------- Pack line ---------- */}
      {/* Totes first, so an empty tote can slide down behind its robot. */}
      {[...view.totes.values()].map((t) => {
        const o = s.orders.get(t.order);
        return (
          <g key={t.order} {...pick(t.order)} data-tour={t.order === firstTote && t.active ? "tote" : undefined}>
            <rect x={t.x - HIT} y={t.y - 2} width={TOTE_W + 2 * HIT} height={TOTE_H + 4} fill="transparent" />
            <Tote
              x={t.x}
              y={t.y}
              cubes={o ? o.items.length - o.packed : 0}
              active={t.active}
              sel={t.order === so}
              hover={t.order === hover && t.order !== so}
            />
          </g>
        );
      })}

      <g data-tour="robots">
        {s.robots.map((r) => {
          const x = robotX(r.id);
          const status = robotStatus(s, r);
          const fill = status === "act" ? C.red : status === "watch" ? C.redTint : C.body;
          const stroke = status === "act" ? C.red : status === "watch" ? "rgba(217,45,74,0.7)" : C.line2;
          return (
            <g key={r.id} className="hint" data-tour={r.id === firstAct ? "act" : undefined} {...tip(`robot${r.id}`, { kind: "robot", id: r.id }, true)}>
              <rect x={x} y={ROBOT_Y} width={ROBOT_W} height={ROBOT_H} rx={6} className="robot-body" style={{ fill, stroke }} />
              <text x={x + ROBOT_W / 2} y={ROBOT_Y + 20} fontSize={TEXT} fill={C.ink} fontFamily={MONO} fontWeight={700} textAnchor="middle" className="metric">
                {robotNumber(r.id)}
              </text>
              {status === "act" ? (
                <ActIcon robot={r} x={x + ROBOT_W / 2 - 10} y={ROBOT_Y + 25} size={20} color={C.ink} strokeWidth={2.25} />
              ) : (
                <Ring cx={x + ROBOT_W / 2} cy={ROBOT_Y + 35} r={9} width={3.5} value={robotProgress(r)} color={C.ink} />
              )}
              {/* Pack area: packed cubes wait here for the mailer. */}
              <rect x={x + PACK_X - 2} y={ROBOT_Y + PACK_Y - 2} width={ROBOT_W - 2 * (PACK_X - 2)} height={CUBE + 4} rx={2} fill="none" stroke={C.line} />
              {/* A pilot at work: the pilot's sign under the robot. */}
              <g className={`fade ${r.phase === "pilot" ? "" : "gone"}`}>
                <PilotBox x={x + ROBOT_W / 2 - 24} y={ROBOT_Y + ROBOT_H + 4} w={48} h={24} id={r.pilot ?? ""} busy />
              </g>
            </g>
          );
        })}
      </g>

      {/* Packed cubes, on top of the robots they slide into. */}
      {[...view.cubes.entries()].map(([key, c]) => (
        <rect key={key} x={c.x} y={c.y} width={CUBE} height={CUBE} fill={c.order === so ? C.orange : C.ink2} pointerEvents="none" />
      ))}

      {/* Conveyor */}
      <rect x={CONVEYOR_X0} y={CONVEYOR_Y} width={BIN_X - CONVEYOR_X0} height={CONVEYOR_H} rx={4} fill={C.panel} stroke={C.line2} />
      {Array.from({ length: Math.ceil((BIN_X - CONVEYOR_X0) / 12) }, (_, i) => {
        const lx = CONVEYOR_X0 + i * 12 + ((s.t * 8) % 12);
        if (lx >= BIN_X - 2 || lx <= CONVEYOR_X0 + 2) return null;
        return <line key={i} x1={lx} x2={lx} y1={CONVEYOR_Y + 3} y2={CONVEYOR_Y + CONVEYOR_H - 3} stroke={C.line} />;
      })}
      {/* The selected order's mailer is solid orange and drawn last, on top. */}
      {[...view.mailers.values()]
        .filter((m) => m.stage !== "pack")
        .sort((a, b) => Number(a.order === so) - Number(b.order === so))
        .map((m) => (
          <g key={m.order} {...pick(m.order)}>
            <rect x={m.x - 3} y={m.y - 3} width={MAILER_W + 6} height={MAILER_H + 6} fill="transparent" />
            <rect
              x={m.x}
              y={m.y}
              width={MAILER_W}
              height={MAILER_H}
              rx={1.5}
              fill={m.order === so ? C.orange : C.paper}
              stroke={m.order === hover && m.order !== so ? C.orange : "none"}
              strokeWidth={2}
            />
          </g>
        ))}

      {/* Outbound bin */}
      <rect x={BIN_X} y={BIN_TOP} width={BIN_W} height={BIN_BOTTOM - BIN_TOP} rx={8} fill={C.panel} stroke={C.line2} />
      <text x={BIN_X + 12} y={BIN_TOP + 30} fontSize={TEXT} fill={C.ink2} fontFamily={SANS} fontWeight={500}>
        Shipped
      </text>
      <text x={BIN_X + 12} y={BIN_TOP + 72} fontSize={36} fill={C.ink} fontFamily={MONO} fontWeight={600} className="metric">
        {s.shipped}
      </text>

      {/* ---------- Remote pilots ---------- */}
      <g data-tour="pilots">
        {pilotButton(-1, MINUS_X)}
        {pilotButton(1, PLUS_X)}
        {/* All 10 seats are always drawn, so a pilot fades in and out. */}
        {Array.from({ length: MAX_PILOTS }, (_, k) => {
          const id = k + 1;
          const p = s.pilots.find((q) => q.id === id);
          const leaving = p ? pilotLeaving(s, p) : false;
          const x = seatX(id);
          return (
            <g key={id} className={`hint fade ${p ? "" : "gone"}`} {...tip(`seat${id}`, { kind: "pilot", id }, true)}>
              <PilotBox x={x} y={PILOT_Y} w={SEAT_W} h={SEAT_H} id={id} busy={p?.robot != null} />
              {(leaving || id === dropId || id === keepId) && (
                <rect
                  x={x - 3}
                  y={PILOT_Y - 3}
                  width={SEAT_W + 6}
                  height={SEAT_H + 6}
                  rx={8}
                  fill="none"
                  stroke={id === dropId || id === keepId ? C.orange : C.ink3}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              )}
            </g>
          );
        })}
        {addId !== null && (
          <rect
            x={seatX(addId)}
            y={PILOT_Y}
            width={SEAT_W}
            height={SEAT_H}
            rx={6}
            fill="none"
            stroke={C.orange}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            pointerEvents="none"
          />
        )}
      </g>

      {/* ---------- Pickers ---------- */}
      {s.pickers.map((p) => {
        const sel = p === picker;
        const hov = p.order !== null && p.order === hover && !sel;
        const dot = <circle cx={p.x} cy={p.y} r={6} fill={sel ? C.orange : p.task === "idle" ? C.line2 : C.ink2} />;
        if (p.order === null) return <g key={p.id} pointerEvents="none">{dot}</g>;
        return (
          <g key={p.id} {...pick(p.order)}>
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
            {(sel || hov) && <circle cx={p.x} cy={p.y} r={10.5} fill="none" stroke={C.orange} strokeWidth={sel ? 2 : 1.5} />}
            {dot}
            <rect x={p.x + 6} y={p.y - 13} width={13} height={9} rx={1.5} fill={C.page} stroke={sel || hov ? C.orange : C.ink2} />
          </g>
        );
      })}
    </svg>
  );
}
