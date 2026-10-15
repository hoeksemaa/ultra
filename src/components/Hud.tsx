// The top bar: time, autonomy, and the pilot team. It has no title and no
// labels; each control shows what it is, and hover tells the rest.
import { Bot, Minus, Plus, RotateCcw } from "lucide-react";
import { fmtClock, pilotWanted, type Sim } from "@/sim/engine";
import { PilotBadge, TimeIcon } from "./glyphs";

export const SPEEDS = [1, 10, 60];
const TICKS = 50;

interface Props {
  sim: Sim;
  paused: boolean;
  speed: number;
  onPause: () => void;
  onSpeed: (v: number) => void;
  onReset: () => void;
  onPilots: (n: number) => void;
}

// Autonomy as a tally: one bar per recent order. Green: the robot packed it
// alone. Blue: a pilot helped. Empty slots fill from the right.
function Autonomy({ recent }: { recent: boolean[] }) {
  const last = recent.slice(-TICKS);
  return (
    <div className="auto" data-tip="kpi:autonomy" data-tour="autonomy">
      <Bot size={20} className="auto-ico" aria-hidden="true" />
      <div className="ticks" aria-hidden="true">
        {Array.from({ length: TICKS - last.length }, (_, i) => (
          <i key={`e${i}`} />
        ))}
        {last.map((ok, i) => (
          <i key={i} className={ok ? "alone" : "helped"} />
        ))}
      </div>
    </div>
  );
}

export default function Hud({ sim, paused, speed, onPause, onSpeed, onReset, onPilots }: Props) {
  const s = sim;
  const wanted = pilotWanted(s);
  return (
    <header className="hud">
      <div className="hud-l" data-tour="time">
        <div className="seg">
          <button className={`tool ${paused ? "on" : ""}`} onClick={onPause} aria-label="Pause" aria-pressed={paused} data-tip="ctl:pause">
            <TimeIcon n={0} />
          </button>
          {SPEEDS.map((v, i) => (
            <button
              key={v}
              className={`tool ${!paused && speed === v ? "on" : ""}`}
              onClick={() => onSpeed(v)}
              aria-label={`Play ${v}x`}
              aria-pressed={!paused && speed === v}
              data-tip={`ctl:speed:${v}`}
            >
              <TimeIcon n={(i + 1) as 1 | 2 | 3} />
            </button>
          ))}
        </div>
        <span className="clock metric" data-tip="ctl:clock">
          {fmtClock(s.t)}
        </span>
        <button className="tool" onClick={onReset} aria-label="Reset" data-tip="ctl:reset">
          <RotateCcw size={18} />
        </button>
      </div>

      <Autonomy recent={s.recent} />

      <div className="hud-r">
        <div className="pilots" data-tour="pilots">
          <div className="roster">
            {s.pilots.map((p) => (
              <span key={p.id} className="pilot" data-tip={`pilot:${p.id}`}>
                <PilotBadge id={p.id} busy={p.robot !== null} />
              </span>
            ))}
          </div>
          <div className="seg">
            <button className="tool" onClick={() => onPilots(-1)} disabled={s.pilotTarget <= 1} aria-label="Remove a pilot" data-tip="pilot:remove">
              <Minus size={18} />
            </button>
            <button
              className={`tool ${wanted ? "cta" : ""}`}
              onClick={() => onPilots(1)}
              disabled={s.pilotTarget >= 10}
              aria-label="Add a pilot"
              data-tip="pilot:add"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
