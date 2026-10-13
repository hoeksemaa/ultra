"use client";

import { useEffect, useRef, useState } from "react";
import { STEP, createSim, fmtClock, setPilotTarget, step, type Sim } from "@/sim/engine";
import { record, rewind } from "@/sim/history";
import FloorView from "./FloorView";
import SidePanel from "./SidePanel";

const SPEEDS = [1, 10, 60];
const REWIND = 10; // seconds of playback that one click undoes

export default function FleetConsole() {
  const [sim, setSim] = useState<Sim>(() => createSim());
  const [, setFrame] = useState(0);
  const [speed, setSpeed] = useState(10);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const live = useRef({ sim, speed, paused });
  const history = useRef<Sim[]>([]);

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
          record(history.current, c.sim);
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

  // Swap in a new sim now, so the loop never steps the old one.
  const load = (next: Sim) => {
    live.current = { ...live.current, sim: next };
    setSim(next);
  };

  const onRewind = () => {
    const back = rewind(history.current, live.current.sim.t - REWIND * speed);
    if (back) load(back);
  };

  const changePilots = (n: number) => {
    setPilotTarget(sim, sim.pilotTarget + n);
    setFrame((f) => f + 1);
  };

  const onSelect = (r: number) => setSelected((cur) => (cur === r ? null : r));

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
            <button className="chip" onClick={onRewind} disabled={sim.t < 1} title={`Back ${REWIND} s of playback`}>
              Rewind
            </button>
            <button className="chip" onClick={() => setPaused((p) => !p)}>
              {paused ? "Play" : "Pause"}
            </button>
            <button
              className="chip"
              onClick={() => {
                history.current = [];
                load(createSim());
                setSelected(null);
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
          <FloorView sim={sim} selected={selected} onSelect={onSelect} />
        </div>
        <SidePanel sim={sim} selected={selected} onSelect={onSelect} onAddPilot={() => changePilots(1)} />
      </main>

      <footer className="ftr label">
        <span>Not affiliated with Ultra · all brands and data are fictional</span>
        <a href="https://github.com/hoeksemaa/ultra">github.com/hoeksemaa/ultra</a>
      </footer>
    </div>
  );
}
