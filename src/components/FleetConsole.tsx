"use client";

import { useEffect, useRef, useState } from "react";
import {
  STEP,
  createSim,
  fmtClock,
  setPickerTarget,
  setPilotTarget,
  step,
  type Sim,
} from "@/sim/engine";
import FloorView from "./FloorView";
import SidePanel from "./SidePanel";

const SPEEDS = [1, 10, 30, 60];

export default function FleetConsole() {
  const [sim, setSim] = useState<Sim>(() => createSim());
  const [, setFrame] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const live = useRef({ sim, speed, paused });

  useEffect(() => {
    live.current = { sim, speed, paused };
  }, [sim, speed, paused]);

  // Fixed-step loop: the same seed gives the same shift on every run.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastPaint = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const c = live.current;
      if (!c.paused) {
        acc += dt * c.speed;
        while (acc >= STEP) {
          step(c.sim, STEP);
          acc -= STEP;
        }
        if (now - lastPaint >= 50) {
          lastPaint = now;
          setFrame((f) => f + 1);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const repaint = () => setFrame((f) => f + 1);

  const onCmd = (cmd: "pilot+" | "pilot-" | "picker+") => {
    if (cmd === "pilot+") setPilotTarget(sim, sim.pilotTarget + 1);
    if (cmd === "pilot-") setPilotTarget(sim, sim.pilotTarget - 1);
    if (cmd === "picker+") setPickerTarget(sim, sim.pickerTarget + 2);
    repaint();
  };

  const onSelect = (r: number) => setSelected((cur) => (cur === r ? null : r));

  return (
    <div className="app">
      <header className="hdr">
        <div>
          <div className="label eyebrow">Unofficial demo by John Hoeksema</div>
          <h1>OP1 Fleet Console</h1>
        </div>
        <div className="meta">
          <div>
            <div className="label faint">Site</div>
            <div className="label">BK-01 · Brooklyn, NY · 3PL</div>
          </div>
          <div>
            <div className="label faint">Shift clock</div>
            <div className="metric clock">{fmtClock(sim.t)}</div>
          </div>
          <div>
            <div className="label faint">Sim</div>
            <div className="label st">
              <span className={`dot ${paused ? "idle" : "ok"}`} />
              {paused ? "Paused" : "Live"}
            </div>
          </div>
        </div>
        <div className="controls">
          <div className="ctl">
            <span className="label faint">Run</span>
            <div className="ctl-row">
              <button className="chip" onClick={() => setPaused((p) => !p)}>
                {paused ? "Play" : "Pause"}
              </button>
              <button
                className="chip"
                onClick={() => {
                  setSim(createSim());
                  setSelected(null);
                }}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="ctl">
            <span className="label faint">Speed</span>
            <div className="ctl-row">
              {SPEEDS.map((v) => (
                <button key={v} className={`chip ${speed === v ? "on" : ""}`} onClick={() => setSpeed(v)}>
                  {v}×
                </button>
              ))}
            </div>
          </div>
          <div className="ctl">
            <span className="label faint">Remote pilots</span>
            <div className="ctl-row">
              <button className="chip" onClick={() => onCmd("pilot-")} aria-label="Remove a pilot">
                −
              </button>
              <span className="chip value metric">{sim.pilotTarget}</span>
              <button className="chip" onClick={() => onCmd("pilot+")} aria-label="Add a pilot">
                +
              </button>
            </div>
          </div>
          <div className="ctl">
            <span className="label faint">Pickers</span>
            <div className="ctl-row">
              <button
                className="chip"
                onClick={() => {
                  setPickerTarget(sim, sim.pickerTarget - 2);
                  repaint();
                }}
                aria-label="Remove two pickers"
              >
                −
              </button>
              <span className="chip value metric">{sim.pickerTarget}</span>
              <button className="chip" onClick={() => onCmd("picker+")} aria-label="Add two pickers">
                +
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="floor">
          <FloorView sim={sim} selected={selected} onSelect={onSelect} />
        </div>
        <SidePanel sim={sim} selected={selected} onSelect={onSelect} onCmd={onCmd} />
      </main>

      <footer className="ftr label">
        <span>Unofficial demo by John Hoeksema · not affiliated with Ultra · all brands, items, and numbers are fictional</span>
        <a href="https://github.com/hoeksemaa/ultra">github.com/hoeksemaa/ultra</a>
      </footer>
    </div>
  );
}
