import { useState } from "react";
import { CLASS_BASE, GRASP_CLASSES } from "@/sim/catalog";
import { classData, classReliability, newData, trainedPilotRate, type Sim } from "@/sim/engine";
import { pct } from "./tokens";
import type { TipBind } from "./Tooltip";

// Reliability by item type: bars on one shared scale (0 to 100%). The orange
// part shows what training will give, while the pointer is on the button.
export default function ModelPanel({ sim, onTrain, tip }: { sim: Sim; onTrain: () => void; tip: TipBind }) {
  const [preview, setPreview] = useState(false);
  const pending = newData(sim);
  const show = preview && pending > 0;
  const trainTip = tip("train", { kind: "ui", title: "Train model", keys: "T" });

  return (
    <section className="panel model">
      <div className="panel-hd">
        <span className="ttl">Reliability</span>
        <span className="metric dim">Model v{sim.model}</span>
      </div>
      <div className="rel">
        {GRASP_CLASSES.map((c) => {
          const now = classReliability(sim, c);
          const next = 1 - trainedPilotRate(c, classData(sim, c));
          const gain = show && next > now + 0.0005;
          return (
            <div key={c} className="rel-row hint" {...tip(`class${c}`, { kind: "class", cls: c }, true)}>
              <span>{CLASS_BASE[c].label}</span>
              <span className="bar">
                <span className="ghost" style={{ width: `${(gain ? next : now) * 100}%` }} />
                <span className="fill" style={{ width: `${now * 100}%` }} />
              </span>
              <span className={`metric num ${gain ? "orange-text" : ""}`}>{pct(gain ? next : now, 0)}</span>
            </div>
          );
        })}
      </div>
      <div className="train">
        <button
          className="btn-primary"
          data-tour="train"
          disabled={pending === 0}
          onPointerEnter={(e) => {
            setPreview(true);
            trainTip.onPointerEnter(e);
          }}
          onPointerLeave={() => {
            setPreview(false);
            trainTip.onPointerLeave();
          }}
          onFocus={() => setPreview(true)}
          onBlur={() => setPreview(false)}
          onClick={onTrain}
        >
          Train model
        </button>
        <span className="metric dim">{pending} new samples</span>
      </div>
    </section>
  );
}
