"use client";

// Calm tooltips (STYLE.md: tooltips). A tooltip opens when the pointer rests
// on an item for 0.5 s. A click or a tap on an info item opens the same
// content and keeps it open. All tooltips use one layout.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BRANDS, CLASS_BASE, type GraspClass } from "@/sim/catalog";
import { classData, currentItem, fmtDur, robotFault, type Sim } from "@/sim/engine";
import { ICONS } from "./icons";
import { PilotSign, RobotSign, RobotState } from "./signs";

export type TipTarget =
  | { kind: "robot"; id: number }
  | { kind: "item"; brand: number; item: number }
  | { kind: "brand"; brand: number }
  | { kind: "pilot"; id: number }
  | { kind: "class"; cls: GraspClass }
  | { kind: "ui"; title: string; keys?: string };

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  vw: number;
  vh: number;
}

export interface TipState {
  key: string;
  target: TipTarget;
  rect: Rect;
  pinned: boolean;
}

export interface TipHandlers {
  onPointerEnter: (e: React.PointerEvent<Element>) => void;
  onPointerLeave: () => void;
  onClick?: (e: React.MouseEvent<Element>) => void;
}

// key: one id for each item. pin: a click opens the tooltip (info items only,
// not buttons).
export type TipBind = (key: string, target: TipTarget, pin?: boolean) => TipHandlers;

const DELAY = 500;

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, vw: window.innerWidth, vh: window.innerHeight };
}

export function useTips() {
  const [tip, setTip] = useState<TipState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const anchor = useRef<Element | null>(null);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setTip(null);
  }, []);

  const bind: TipBind = useCallback((key, target, pin = false) => {
    return {
      onPointerEnter: (e) => {
        const el = e.currentTarget;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          anchor.current = el;
          setTip((t) => (t?.pinned ? t : { key, target, pinned: false, rect: rectOf(el) }));
        }, DELAY);
      },
      onPointerLeave: () => {
        window.clearTimeout(timer.current);
        setTip((t) => (t && t.key === key && !t.pinned ? null : t));
      },
      onClick: pin
        ? (e) => {
            window.clearTimeout(timer.current);
            const el = e.currentTarget;
            const rect = rectOf(el);
            anchor.current = el;
            setTip((t) => (t && t.key === key && t.pinned ? null : { key, target, pinned: true, rect }));
          }
        : undefined,
    };
  }, []);

  // A press anywhere closes a resting tooltip. A pinned tooltip stays open
  // only for a press on its own item (that press toggles it).
  useEffect(() => {
    const down = (e: PointerEvent) => {
      window.clearTimeout(timer.current);
      const inside = anchor.current?.contains(e.target as Node) ?? false;
      setTip((t) => (t && t.pinned && inside ? t : null));
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTip(null);
    };
    const scroll = () => setTip(null);
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
    };
  }, []);

  return { tip, bind, hide };
}

interface Content {
  title: ReactNode;
  lines: ReactNode[];
}

function content(s: Sim, t: TipTarget): Content | null {
  switch (t.kind) {
    case "robot": {
      const r = s.robots[t.id];
      const it = currentItem(s, r);
      const Icon = it ? ICONS[it.icon] : null;
      const fault = robotFault(r);
      return {
        title: (
          <>
            <RobotSign sim={s} robot={r} /> Robot {r.id + 1}
          </>
        ),
        lines: [
          <>
            <RobotState sim={s} robot={r} />
            {r.phase !== "pack" && <span className="metric tip-dim">{fmtDur(s.t - r.since)}</span>}
          </>,
          fault,
          it && Icon && (
            <>
              <Icon size={16} strokeWidth={1.75} aria-hidden /> {it.name}
            </>
          ),
        ],
      };
    }
    case "item": {
      const it = BRANDS[t.brand].items[t.item];
      const Icon = ICONS[it.icon];
      return {
        title: (
          <>
            <Icon size={16} strokeWidth={1.75} aria-hidden /> {it.name}
          </>
        ),
        lines: [`${CLASS_BASE[it.cls].label} · ${it.lb} lb`, <span key="s" className="metric">{s.stock[t.brand][t.item]} in stock</span>],
      };
    }
    case "brand": {
      const b = BRANDS[t.brand];
      return { title: b.name, lines: [b.about] };
    }
    case "pilot": {
      const i = s.pilots.findIndex((p) => p.id === t.id);
      if (i < 0) return null;
      const p = s.pilots[i];
      const leaving = i >= s.pilotTarget;
      return {
        title: (
          <>
            <PilotSign id={p.id} /> Pilot {p.id}
          </>
        ),
        lines: [
          p.robot !== null ? (
            <>
              <RobotSign sim={s} robot={s.robots[p.robot]} /> Robot {p.robot + 1}
            </>
          ) : (
            "Free"
          ),
          leaving && "Leaves after this item",
        ],
      };
    }
    case "class": {
      const n = classData(s, t.cls);
      const fresh = n - s.trained[t.cls];
      return {
        title: CLASS_BASE[t.cls].label,
        lines: [<span key="n" className="metric">{n} samples</span>, fresh > 0 && <span key="f" className="metric">{fresh} new</span>],
      };
    }
    case "ui":
      return {
        title: (
          <>
            {t.title}
            {t.keys && <kbd>{t.keys}</kbd>}
          </>
        ),
        lines: [],
      };
  }
}

const TIP_W = 280;

export function TipLayer({ tip, sim }: { tip: TipState | null; sim: Sim }) {
  if (!tip) return null;
  const c = content(sim, tip.target);
  if (!c) return null;
  const { rect } = tip;
  const cx = Math.min(Math.max((rect.left + rect.right) / 2, 8 + TIP_W / 2), rect.vw - 8 - TIP_W / 2);
  const below = rect.bottom + 8 + 120 < rect.vh;
  const style: React.CSSProperties = below
    ? { left: cx, top: rect.bottom + 8 }
    : { left: cx, bottom: rect.vh - rect.top + 8 };
  const lines = c.lines.filter(Boolean);
  return (
    <div className="tip" style={style} role="tooltip">
      <div className="tip-title">{c.title}</div>
      {lines.map((l, i) => (
        <div key={i} className="tip-line">
          {l}
        </div>
      ))}
    </div>
  );
}
