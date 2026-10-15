"use client";

// The tutorial (STYLE.md: tutorial). The help button opens all tips in
// order. On the first visit, each tip shows once, at its item, when the
// user can first use that item.
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { X } from "lucide-react";
import { FaultIcon, PilotIcon, PilotSign } from "./signs";

export interface Ready {
  act: boolean; // a robot is solid red
  pilot: boolean; // a robot needs or has a pilot
  data: boolean; // the model has new samples
}

interface Step {
  id: string;
  anchor: string[]; // the first match is the item to point at
  title?: string;
  body: ReactNode;
  ready: (r: Ready) => boolean;
}

const STEPS: Step[] = [
  {
    id: "intro",
    anchor: ["floor"],
    title: "OP1 fleet console",
    body: (
      <p>
        This unofficial demo simulates one warehouse. Pickers fill totes, and 20 OP1 robots pack the totes into mailers.
        All brands and numbers are fictional.
      </p>
    ),
    ready: () => true,
  },
  {
    id: "order",
    anchor: ["tote", "robots"],
    body: <p>Click a tote to follow its order. Click it again to stop.</p>,
    ready: () => true,
  },
  {
    id: "status",
    anchor: ["act", "robots"],
    body: (
      <ul className="legend">
        <li>
          <span className="swatch act">
            <PilotIcon size={14} strokeWidth={2.25} />
          </span>
          The robot needs a pilot.
        </li>
        <li>
          <span className="swatch act">
            <FaultIcon size={14} strokeWidth={2.25} />
          </span>
          The robot has a fault.
        </li>
        <li>
          <span className="swatch watch" />
          The robot tries again alone.
        </li>
        <li>Point to a robot to see its item.</li>
      </ul>
    ),
    ready: (r) => r.act,
  },
  {
    id: "pilots",
    anchor: ["pilots"],
    body: (
      <p>
        A pilot controls a robot from a remote desk. <PilotSign id={1} /> under a robot shows its pilot. Use − and + to
        change the number of pilots.
      </p>
    ),
    ready: (r) => r.pilot,
  },
  {
    id: "train",
    anchor: ["train"],
    body: (
      <p>
        Each packed item adds one sample. Train the model to make the robots more reliable. Point to the button to see
        the gain first.
      </p>
    ),
    ready: (r) => r.data,
  },
  {
    id: "controls",
    anchor: ["controls"],
    body: (
      <p>
        Pause, change the speed, or reset the shift here. Point to a part to see its name and shortcut. Press ? to see
        these tips again.
      </p>
    ),
    ready: () => true,
  },
];

// ---------- Tips already seen (per browser, best effort) ----------

const KEY = "op1-tips-seen";
let cache: string | null = null;
const listeners = new Set<() => void>();

function readSeen(): string {
  if (cache === null) {
    try {
      cache = window.localStorage.getItem(KEY) ?? "";
    } catch {
      cache = "";
    }
  }
  return cache;
}

function markSeen(ids: string[]) {
  const cur = new Set(readSeen().split(",").filter(Boolean));
  for (const id of ids) cur.add(id);
  cache = [...cur].join(",");
  try {
    window.localStorage.setItem(KEY, cache);
  } catch {
    // Private windows can block storage. The tips then show once per visit.
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// ---------- Placement ----------

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  vw: number;
  vh: number;
}

function findAnchor(names: string[]): Element | null {
  for (const n of names) {
    const el = document.querySelector(`[data-tour="${n}"]`);
    if (el) return el;
  }
  return null;
}

const CARD_W = 320;
const CARD_H = 200; // room to keep free above or below the item

function cardStyle(a: Box): React.CSSProperties {
  const left = Math.min(Math.max(a.left, 8), a.vw - Math.min(CARD_W, a.vw - 16) - 8);
  // Use the side with more room, so the card hides less of the floor.
  const below = a.vh - a.bottom >= a.top;
  if (below && a.bottom + 12 + CARD_H < a.vh) return { left, top: a.bottom + 12 };
  if (!below && a.top - 12 - CARD_H > 0) return { left, bottom: a.vh - a.top + 12 };
  // A big item: put the card inside it, at the top left.
  return { left: Math.max(a.left + 16, 8), top: Math.max(a.top + 16, 8) };
}

interface Props {
  ready: Ready;
  tour: number | null; // the help button's tour, or null
  setTour: (n: number | null) => void;
}

export default function Tutorial({ ready, tour, setTour }: Props) {
  const seenRaw = useSyncExternalStore(subscribe, readSeen, () => null);
  const seen = seenRaw === null ? null : new Set(seenRaw.split(",").filter(Boolean));

  let step: Step | undefined;
  let index = -1;
  if (tour !== null) {
    index = tour;
    step = STEPS[tour];
  } else if (seen && !seen.has("all")) {
    index = STEPS.findIndex((s) => !seen.has(s.id) && s.ready(ready));
    step = STEPS[index];
  }

  // Follow the item on screen: it can scroll, and totes move.
  const [box, setBox] = useState<Box | null>(null);
  const anchorKey = step ? step.anchor.join(",") : "";
  useEffect(() => {
    if (!anchorKey) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const el = findAnchor(anchorKey.split(","));
      if (el) {
        const r = el.getBoundingClientRect();
        const b = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, vw: window.innerWidth, vh: window.innerHeight };
        const k = Object.values(b).map(Math.round).join(",");
        if (k !== last) {
          last = k;
          setBox(b);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchorKey]);

  if (!step || !box) return null;
  const isTour = tour !== null;
  // The tour shows every tip, so after it no tip shows again by itself.
  const close = () => {
    markSeen(["all"]);
    if (isTour) setTour(null);
  };

  return (
    <>
      <div
        className="tour-ring"
        style={{ left: box.left - 4, top: box.top - 4, width: box.right - box.left + 8, height: box.bottom - box.top + 8 }}
      />
      <div className="tour-card" style={cardStyle(box)} role="dialog" aria-label="Tip" key={step.id}>
        <button className="ctl icon tour-x" aria-label={isTour ? "Close the tips" : "Stop the tips"} onClick={close}>
          <X size={16} strokeWidth={2} />
        </button>
        {step.title && <h2>{step.title}</h2>}
        {step.body}
        <div className="tour-nav">
          {isTour ? (
            <>
              <span className="metric dim">
                {index + 1} / {STEPS.length}
              </span>
              <span className="tour-btns">
                {index > 0 && (
                  <button className="ctl" onClick={() => setTour(index - 1)}>
                    Back
                  </button>
                )}
                <button className="btn-primary" onClick={() => (index + 1 < STEPS.length ? setTour(index + 1) : close())}>
                  {index + 1 < STEPS.length ? "Next" : "Done"}
                </button>
              </span>
            </>
          ) : (
            <>
              <span />
              <button className="btn-primary" onClick={() => markSeen([step.id])}>
                Got it
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
