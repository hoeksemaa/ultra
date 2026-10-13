"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STEP, createSim, fmtClock, setPilotTarget, step, type Sim } from "@/sim/engine";
import FloorView from "./FloorView";
import { createView, updateView, type View } from "./motion";
import SidePanel from "./SidePanel";

const SPEEDS = [1, 10, 60];

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
  const [selected, setSelected] = useState<number | null>(null); // robot
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
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

  // One selection at a time: a robot or an order. A second click clears it.
  const onSelect = (r: number) => {
    setSelectedOrder(null);
    setSelected((cur) => (cur === r ? null : r));
  };
  const onSelectOrder = useCallback((id: number) => {
    setSelected(null);
    setSelectedOrder((cur) => (cur === id ? null : id));
  }, []);

  return (
    <div className="app">
      <header className="hdr">
        <div>
          <div className="label eyebrow">Unofficial demo by John Hoeksema</div>
          <h1>OP1 Fleet Console</h1>
        </div>
        <div className="metric clock">{fmtClock(sim.t)}</div>
        <div className="controls">
          <div className="ctl-row">
            <button className="chip" onClick={() => setPaused((p) => !p)}>
              {paused ? "Play" : "Pause"}
            </button>
            <button
              className="chip"
              onClick={() => {
                const w = newWorld();
                live.current = { ...live.current, world: w };
                setWorld(w);
                setSelected(null);
                setSelectedOrder(null);
              }}
            >
              Reset
            </button>
          </div>
          <div className="ctl-row">
            {SPEEDS.map((v) => (
              <button key={v} className={`chip ${speed === v ? "on" : ""}`} onClick={() => setSpeed(v)}>
                {v}×
              </button>
            ))}
          </div>
          <div className="ctl-row">
            <span className="label faint ctl-lbl">Pilots</span>
            <button className="chip" onClick={() => changePilots(-1)} aria-label="Remove a pilot">
              −
            </button>
            <span className="chip value metric">{sim.pilotTarget}</span>
            <button className="chip" onClick={() => changePilots(1)} aria-label="Add a pilot">
              +
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="floor">
          <FloorView sim={sim} view={view} selected={selected} selectedOrder={selectedOrder} onSelect={onSelect} />
        </div>
        <SidePanel
          sim={sim}
          view={view}
          selected={selected}
          selectedOrder={selectedOrder}
          onSelect={onSelect}
          onSelectOrder={onSelectOrder}
          onAddPilot={() => changePilots(1)}
        />
      </main>

      <footer className="ftr label">
        <span>Not affiliated with Ultra · all brands and data are fictional</span>
        <a href="https://github.com/hoeksemaa/ultra">github.com/hoeksemaa/ultra</a>
      </footer>
    </div>
  );
}
