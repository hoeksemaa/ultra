"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleHelp, Pause, Play, RotateCcw, Undo2 } from "lucide-react";
import {
  ROBOT_Y,
  STEP,
  VIEW_H,
  autonomy,
  createSim,
  fmtClock,
  newData,
  ordersPerHour,
  robotStatus,
  setPilotTarget,
  step,
  train,
  type Order,
  type Sim,
} from "@/sim/engine";
import FloorView from "./FloorView";
import Inspector from "./Inspector";
import ModelPanel from "./ModelPanel";
import { createView, updateView, type View } from "./motion";
import { pct } from "./tokens";
import { TipLayer, useTips, type TipBind } from "./Tooltip";
import Tutorial from "./Tutorial";

const SPEEDS = [1, 10, 60];
const UNDO_MS = 8000;

// The sim and its view always change together, so they live in one state.
interface World {
  sim: Sim;
  view: View;
}

function newWorld(): World {
  return { sim: createSim(), view: createView() };
}

// ▶ ▶▶ ▶▶▶: one triangle for each speed step.
function SpeedIcon({ n }: { n: number }) {
  return (
    <svg width={n * 9 - 1} height={12} viewBox={`0 0 ${n * 9 - 1} 12`} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${i * 9} 1 L${i * 9 + 8} 6 L${i * 9} 11 Z`} fill="currentColor" />
      ))}
    </svg>
  );
}

function Kpi({ label, value, help, tip }: { label: string; value: string; help: string; tip: TipBind }) {
  return (
    <div className="kpi hint" {...tip(`kpi-${label}`, { kind: "ui", title: help }, true)}>
      <div className="k">{label}</div>
      <div className="v metric">{value}</div>
    </div>
  );
}

export default function FleetConsole() {
  const [world, setWorld] = useState<World>(newWorld);
  const { sim, view } = world;
  const [, setFrame] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [undo, setUndo] = useState<World | null>(null);
  const [tour, setTour] = useState<number | null>(null);
  const { tip, bind, hide } = useTips();
  const live = useRef({ world, speed, paused, undo });
  const undoTimer = useRef<number | undefined>(undefined);
  const floorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    live.current = { world, speed, paused, undo };
  }, [world, speed, paused, undo]);

  // Fixed-step loop: the same seed gives the same shift on every run.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastPaint = 0;
    let wasMoving = false;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const c = live.current;
      if (!c.paused) {
        acc += dt * c.speed;
        while (acc >= STEP) {
          step(c.world.sim, STEP);
          acc -= STEP;
        }
      }
      // Slides finish even while the sim is paused.
      const moving = updateView(c.world.view, c.world.sim, dt);
      if ((!c.paused || moving || wasMoving) && now - lastPaint >= 33) {
        lastPaint = now;
        setFrame((f) => f + 1);
      }
      wasMoving = moving;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // On a small screen the floor scrolls inside its panel. Start at the robots.
  useEffect(() => {
    const el = floorRef.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    el.scrollTop = (ROBOT_Y / VIEW_H) * el.scrollHeight - el.clientHeight / 2;
  }, []);

  // ---------- Actions: one control and one shortcut each ----------

  const changePilots = useCallback((n: number) => {
    const s = live.current.world.sim;
    setPilotTarget(s, s.pilotTarget + n);
    setFrame((f) => f + 1);
  }, []);

  const doTrain = useCallback(() => {
    const s = live.current.world.sim;
    if (newData(s) === 0) return;
    train(s);
    setFrame((f) => f + 1);
  }, []);

  const reset = useCallback(() => {
    const old = live.current.world;
    const w = newWorld();
    live.current = { ...live.current, world: w, undo: old };
    setWorld(w);
    setSelected(null);
    hide();
    setUndo(old);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
  }, [hide]);

  const undoReset = useCallback(() => {
    const old = live.current.undo;
    if (!old) return;
    window.clearTimeout(undoTimer.current);
    live.current = { ...live.current, world: old, undo: null };
    setWorld(old);
    setUndo(null);
  }, []);

  const selectOrder = useCallback((id: number | null) => {
    const { sim: s, view: v } = live.current.world;
    setSelected(id === null ? null : (s.orders.get(id) ?? v.mailers.get(id)?.info ?? null));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === "z" && live.current.undo) {
          e.preventDefault();
          undoReset();
        }
        return;
      }
      if (e.altKey) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          setPaused((p) => !p);
          break;
        case "1":
        case "2":
        case "3":
          setSpeed(SPEEDS[Number(e.key) - 1]);
          break;
        case "+":
        case "=":
          changePilots(1);
          break;
        case "-":
        case "_":
          changePilots(-1);
          break;
        case "t":
        case "T":
          doTrain();
          break;
        case "r":
        case "R":
          reset();
          break;
        case "?":
          setTour((t) => (t === null ? 0 : null));
          break;
        case "Escape":
          setSelected(null);
          setTour(null);
          break;
      }
    };
    // Space pauses; it must not also press the focused button.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [changePilots, doTrain, reset, undoReset]);

  const perHour = ordersPerHour(sim);
  const auto = autonomy(sim);
  const ready = {
    act: sim.robots.some((r) => robotStatus(sim, r) === "act"),
    pilot: sim.robots.some((r) => r.phase === "pilot" || r.phase === "pilot_wait"),
    data: newData(sim) >= 10,
  };

  return (
    <div className="app">
      <header className="hdr">
        <div className="clock metric">{fmtClock(sim.t)}</div>
        <Kpi label="Orders/hr" value={perHour === null ? "—" : String(Math.round(perHour))} help="Orders packed in the last hour" tip={bind} />
        <Kpi label="Autonomy" value={auto === null ? "—" : pct(auto, 0)} help="Orders packed with no pilot, of the last 100" tip={bind} />

        <div className="controls" data-tour="controls">
          <button
            className="ctl icon"
            aria-label={paused ? "Play" : "Pause"}
            {...bind("play", { kind: "ui", title: paused ? "Play" : "Pause", keys: "Space" })}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play size={18} strokeWidth={2} fill="currentColor" /> : <Pause size={18} strokeWidth={2} fill="currentColor" />}
          </button>
          <div className="seg" role="group" aria-label="Speed">
            {SPEEDS.map((v, i) => (
              <button
                key={v}
                className={`ctl ${speed === v ? "on" : ""}`}
                aria-label={`Speed ${v}×`}
                aria-pressed={speed === v}
                {...bind(`speed${v}`, { kind: "ui", title: `Speed ${v}×`, keys: String(i + 1) })}
                onClick={() => setSpeed(v)}
              >
                <SpeedIcon n={i + 1} />
              </button>
            ))}
          </div>
          <div className="reset">
            <button className="ctl icon" aria-label="Reset" {...bind("reset", { kind: "ui", title: "Reset", keys: "R" })} onClick={reset}>
              <RotateCcw size={18} strokeWidth={2} />
            </button>
            {undo && (
              <div className="toast" role="status">
                <span>New shift</span>
                <button className="ctl" onClick={undoReset}>
                  <Undo2 size={16} strokeWidth={2} /> Undo
                </button>
              </div>
            )}
          </div>
          <button
            className="ctl icon"
            aria-label="Help"
            {...bind("help", { kind: "ui", title: "Help", keys: "?" })}
            onClick={() => setTour((t) => (t === null ? 0 : null))}
          >
            <CircleHelp size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      <main className="main">
        <div className="floor-frame" data-tour="floor">
          <div className="floor" ref={floorRef}>
            <FloorView
              sim={sim}
              view={view}
              selectedOrder={selected?.id ?? null}
              onSelectOrder={selectOrder}
              onPilots={changePilots}
              tip={bind}
            />
          </div>
        </div>
        <aside className="side">
          <ModelPanel sim={sim} onTrain={doTrain} tip={bind} />
          <Inspector sim={sim} view={view} order={selected} tip={bind} />
          <footer className="credit">
            Unofficial demo · <a href="https://github.com/hoeksemaa">made by John</a>
          </footer>
        </aside>
      </main>

      <TipLayer tip={tip} sim={sim} />
      <Tutorial ready={ready} tour={tour} setTour={setTour} />
    </div>
  );
}
