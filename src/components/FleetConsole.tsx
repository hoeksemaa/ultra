"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STEP, createSim, setPilotTarget, step, train, type Sim } from "@/sim/engine";
import FloorView from "./FloorView";
import Hud from "./Hud";
import { AlertsPanel, ContextBar, ModelPanel, OrdersPanel, type PanelId } from "./Inspector";
import { createView, updateView, type View } from "./motion";

// The sim and its view always change together, so they live in one state.
interface World {
  sim: Sim;
  view: View;
}

function newWorld(): World {
  return { sim: createSim(), view: createView() };
}

export default function FleetConsole() {
  const [world, setWorld] = useState<World>(newWorld);
  const { sim, view } = world;
  const [, setFrame] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [paused, setPaused] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const live = useRef({ world, speed, paused });

  useEffect(() => {
    live.current = { world, speed, paused };
  }, [world, speed, paused]);

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

  const changePilots = (n: number) => {
    setPilotTarget(sim, sim.pilotTarget + n);
    setFrame((f) => f + 1);
  };

  // Only orders can be selected. A second click clears it.
  const onSelectOrder = useCallback((id: number) => {
    setSelectedOrder((cur) => (cur === id ? null : id));
  }, []);

  return (
    <div className="app">
      <Hud
        sim={sim}
        paused={paused}
        speed={speed}
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
      />

      <main className={`main ${panel ? "with-panel" : ""}`}>
        <div className="floor">
          <FloorView sim={sim} view={view} selectedOrder={selectedOrder} focus={{ robot: null, cls: null }} detail={false} />
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

    </div>
  );
}
