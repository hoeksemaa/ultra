"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { GraspClass } from "@/sim/catalog";
import { STEP, createSim, setPilotTarget, step, train, type Sim } from "@/sim/engine";
import FloorView, { type Focus } from "./FloorView";
import Hud, { SPEEDS } from "./Hud";
import { AlertsPanel, ContextBar, ModelPanel, OrdersPanel, type PanelId } from "./Inspector";
import { createView, updateView, type View } from "./motion";
import { TipLayer, tipFor } from "./tips";
import Tour from "./Tour";

// The sim and its view always change together, so they live in one state.
interface World {
  sim: Sim;
  view: View;
}

function newWorld(): World {
  return { sim: createSim(), view: createView() };
}

// The help button shows an orange dot until the viewer opens help once.
const HELP_KEY = "op1-help-seen";
const helpEvent = "op1-help-seen";
function subscribeHelp(cb: () => void) {
  window.addEventListener(helpEvent, cb);
  return () => window.removeEventListener(helpEvent, cb);
}
function helpSeen() {
  try {
    return localStorage.getItem(HELP_KEY) === "1";
  } catch {
    return true;
  }
}
function markHelpSeen() {
  try {
    localStorage.setItem(HELP_KEY, "1");
  } catch {
    // Storage can be off; the dot then stays for this visit only.
  }
  window.dispatchEvent(new Event(helpEvent));
}

// What a hovered element points at on the floor.
function focusOf(key: string | null, s: Sim): Focus {
  const none: Focus = { robot: null, cls: null };
  if (!key) return none;
  const [kind, a] = key.split(":");
  if (kind === "robot") return { robot: Number(a), cls: null };
  if (kind === "pilot") return { robot: s.pilots.find((p) => p.id === Number(a))?.robot ?? null, cls: null };
  if (kind === "class") return { robot: null, cls: a as GraspClass };
  return none;
}

interface Hover {
  key: string;
  el: Element;
}

export default function FleetConsole() {
  const [world, setWorld] = useState<World>(newWorld);
  const { sim, view } = world;
  const [, setFrame] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [paused, setPaused] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [tour, setTour] = useState(false);
  const [detail, setDetail] = useState(false);
  const seen = useSyncExternalStore(subscribeHelp, helpSeen, () => true);
  const live = useRef({ world, speed, paused, tour, panel });

  useEffect(() => {
    live.current = { world, speed, paused, tour, panel };
  }, [world, speed, paused, tour, panel]);

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

  const openHelp = useCallback(() => {
    setTour(true);
    markHelpSeen();
  }, []);

  // Keys, as in most sim games: Space pauses, 1 2 3 set the speed, ? opens
  // help, Esc closes a panel, and Alt shows the numbers on the floor.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        e.preventDefault();
        setDetail(true);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      // A focused button or row handles its own Space and Enter.
      if (t?.closest("button, a, [role=button]") && (e.key === " " || e.key === "Enter")) return;
      const k = SPEEDS[Number(e.key) - 1];
      if (e.key === " ") {
        setPaused((p) => !p);
      } else if (k) {
        setSpeed(k);
        setPaused(false);
      } else if (e.key === "?") {
        openHelp();
      } else if (e.key === "Escape" && !live.current.tour) {
        setPanel(null);
      } else return;
      e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") setDetail(false);
    };
    const onBlur = () => setDetail(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [openHelp]);

  const changePilots = (n: number) => {
    setPilotTarget(sim, sim.pilotTarget + n);
    setFrame((f) => f + 1);
  };

  // Only orders can be selected. A second click clears it.
  const onSelectOrder = useCallback((id: number) => {
    setSelectedOrder((cur) => (cur === id ? null : id));
  }, []);

  const onPanel = useCallback((p: PanelId) => setPanel(p), []);
  const closeTour = useCallback(() => setTour(false), []);

  // One hover popup for the whole console. Any element with data-tip opens it.
  // A mouse click hides it until the pointer leaves that element.
  const clicked = useRef<Element | null>(null);
  const onPointerOver = (e: React.PointerEvent) => {
    const el = (e.target as Element).closest("[data-tip]");
    if (el !== clicked.current) clicked.current = null;
    if (el === (hover?.el ?? null) || (el && el === clicked.current)) return;
    setHover(el ? { key: el.getAttribute("data-tip")!, el } : null);
  };
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") setHover(null);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clicked.current = (e.target as Element).closest("[data-tip]");
    setHover(null);
  };
  // A mouse click leaves no focus behind, so Space still pauses.
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") (e.target as Element).closest("button")?.blur();
  };

  const tipCtx = { sim, view, paused };

  return (
    <div className="app" onPointerOver={onPointerOver} onPointerLeave={onPointerLeave} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <Hud
        sim={sim}
        paused={paused}
        speed={speed}
        helpDot={!seen}
        onPause={() => setPaused((p) => !p)}
        onSpeed={(v) => {
          setSpeed(v);
          setPaused(false);
        }}
        onReset={() => {
          const w = newWorld();
          live.current = { ...live.current, world: w };
          setWorld(w);
          setSelectedOrder(null);
        }}
        onPilots={changePilots}
        onHelp={openHelp}
      />

      <main className={`main ${panel ? "with-panel" : ""}`}>
        <div className="floor">
          <FloorView sim={sim} view={view} selectedOrder={selectedOrder} focus={focusOf(hover?.key ?? null, sim)} detail={detail} />
        </div>
        {panel && (
          <aside className="inspector" aria-label={panel}>
            {panel === "alerts" && <AlertsPanel sim={sim} />}
            {panel === "orders" && <OrdersPanel sim={sim} view={view} selectedOrder={selectedOrder} onSelectOrder={onSelectOrder} />}
            {panel === "model" && (
              <ModelPanel
                sim={sim}
                onTrain={() => {
                  train(sim);
                  setFrame((f) => f + 1);
                }}
              />
            )}
          </aside>
        )}
        <ContextBar sim={sim} open={panel} onToggle={(id) => setPanel((cur) => (cur === id ? null : id))} />
        <a className="credit" href="https://github.com/hoeksemaa">
          Unofficial demo · made by John
        </a>
      </main>

      <TipLayer el={hover?.el ?? null} body={hover ? tipFor(hover.key, tipCtx) : null} />
      {tour && <Tour onClose={closeTour} onPanel={onPanel} />}
    </div>
  );
}
