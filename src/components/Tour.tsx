// The guided tour behind the help button. Each step lights one part of the
// screen and says what it is. The sim keeps running under it.
import { useEffect, useLayoutEffect, useReducer, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Hand, Inbox, Repeat, Wrench, X } from "lucide-react";
import type { PanelId } from "./Inspector";
import { PilotBadge } from "./glyphs";
import { C } from "./tokens";

interface Step {
  target: string | null; // a data-tour value, or null for the middle of the screen
  panel?: PanelId; // a panel to open first
  title: string;
  body: ReactNode;
}

function Key({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className="tour-key">
      <span className="swatch" style={{ background: tone }} />
      {children}
    </span>
  );
}

const STEPS: Step[] = [
  {
    target: null,
    title: "Fleet console",
    body: (
      <>
        <p>A simulated packing site. Pickers fill totes. Robots pack the totes into mailers. Remote pilots help robots that get stuck.</p>
        <p>Hover over anything for details. Hold Alt to show stock counts.</p>
      </>
    ),
  },
  {
    target: "racks",
    title: "Pick floor",
    body: (
      <>
        <p>One rack for each brand. Pickers (dots) walk the aisles and fill one tote for each order.</p>
        <p>The pips on each bin show its stock.</p>
      </>
    ),
  },
  {
    target: "robots",
    title: "Robots",
    body: (
      <>
        <p>Totes wait above each robot. The ring shows the item in work. The color says what the robot needs.</p>
        <div className="tour-keys">
          <Key tone={C.ok}>Packing</Key>
          <Key tone={C.watch}>
            <Repeat size={14} color={C.watch} strokeWidth={2.25} /> Grasp again, alone
          </Key>
          <Key tone={C.watch}>
            <Inbox size={14} color={C.watch} strokeWidth={2.25} /> No tote
          </Key>
          <Key tone={C.fault}>
            <Hand size={14} color={C.fault} strokeWidth={2.25} /> Needs a pilot
          </Key>
          <Key tone={C.fault}>
            <Wrench size={14} color={C.fault} strokeWidth={2.25} /> Fault
          </Key>
          <Key tone={C.pilot}>
            <PilotBadge id={2} busy size={16} /> Pilot in control
          </Key>
        </div>
      </>
    ),
  },
  {
    target: "pilots",
    title: "Pilots",
    body: (
      <>
        <p>Your remote pilots. A solid badge is busy, and the same badge shows under its robot. An outline is free.</p>
        <p>Use − and + to change the team. + turns orange when robots wait for a pilot.</p>
      </>
    ),
  },
  {
    target: "bin",
    title: "Outbound",
    body: <p>Mailers ride the belt into the box. Large number: mailers shipped. Small number: orders per hour.</p>,
  },
  {
    target: "autonomy",
    title: "Autonomy",
    body: (
      <>
        <p>One bar for each recent order.</p>
        <div className="tour-keys">
          <Key tone={C.ok}>Robot alone</Key>
          <Key tone={C.pilot}>Pilot helped</Key>
        </div>
      </>
    ),
  },
  {
    target: "tabs",
    panel: "orders",
    title: "Panels",
    body: (
      <>
        <p>Open a panel here. Click its icon again to close it.</p>
        <p>Alerts: robots that need a human. Orders: click an order to find it on the floor. Model: reliability for each item type.</p>
      </>
    ),
  },
  {
    target: "model",
    panel: "model",
    title: "Train the model",
    body: (
      <>
        <p>Each packed item logs data. White segments: reliability now. Gray segments: the gain from new data.</p>
        <p>Press the orange button to train. An orange dot on the icon means new data.</p>
      </>
    ),
  },
  {
    target: "time",
    title: "Time",
    body: (
      <p>
        Pause, play, and fast-forward. Keys: <kbd>Space</kbd> <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>. Help: <kbd>?</kbd>
      </p>
    ),
  },
];

const PAD = 6;
const GAP = 14;

export default function Tour({ onClose, onPanel }: { onClose: () => void; onPanel: (p: PanelId) => void }) {
  const [step, go] = useReducer((_: number, n: number) => Math.max(0, Math.min(STEPS.length - 1, n)), 0);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const spot = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const st = STEPS[step];
  const last = step === STEPS.length - 1;

  const move = (n: number) => {
    const next = STEPS[Math.max(0, Math.min(STEPS.length - 1, n))];
    if (next.panel) onPanel(next.panel);
    go(n);
  };

  // Keys: arrows step, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") {
        if (step === STEPS.length - 1) onClose();
        else {
          const next = STEPS[step + 1];
          if (next.panel) onPanel(next.panel);
          go(step + 1);
        }
      } else if (e.key === "ArrowLeft") {
        const prev = STEPS[Math.max(0, step - 1)];
        if (prev.panel) onPanel(prev.panel);
        go(step - 1);
      } else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [step, onClose, onPanel]);

  // Follow the layout: resize, scroll, and a panel that opens.
  useEffect(() => {
    const on = () => redraw();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    const raf = requestAnimationFrame(() => {
      const el = st.target ? document.querySelector(`[data-tour="${st.target}"]`) : null;
      el?.scrollIntoView({ block: "nearest" });
      redraw();
    });
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
      cancelAnimationFrame(raf);
    };
  }, [st.target]);

  // Place the light and the card next to the target.
  useLayoutEffect(() => {
    const s = spot.current;
    const c = card.current;
    if (!s || !c) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = st.target ? document.querySelector(`[data-tour="${st.target}"]`) : null;
    const t = c.getBoundingClientRect();
    if (!el) {
      s.style.display = "none";
      c.style.transform = `translate(${Math.round((vw - t.width) / 2)}px, ${Math.round((vh - t.height) / 2)}px)`;
      return;
    }
    const a = el.getBoundingClientRect();
    s.style.display = "block";
    s.style.transform = `translate(${a.left - PAD}px, ${a.top - PAD}px)`;
    s.style.width = `${a.width + 2 * PAD}px`;
    s.style.height = `${a.height + 2 * PAD}px`;
    let x = a.left + a.width / 2 - t.width / 2;
    let y: number;
    if (a.bottom + PAD + GAP + t.height < vh) y = a.bottom + PAD + GAP;
    else if (a.top - PAD - GAP - t.height > 0) y = a.top - PAD - GAP - t.height;
    else if (a.left - PAD - GAP - t.width > 0) {
      x = a.left - PAD - GAP - t.width;
      y = a.top + a.height / 2 - t.height / 2;
    } else if (a.right + PAD + GAP + t.width < vw) {
      x = a.right + PAD + GAP;
      y = a.top + a.height / 2 - t.height / 2;
    } else y = vh - t.height - GAP;
    x = Math.max(GAP, Math.min(x, vw - t.width - GAP));
    y = Math.max(GAP, Math.min(y, vh - t.height - GAP));
    c.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  });

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Tour">
      <div className="tour-dim" style={{ opacity: st.target ? 0 : 1 }} />
      <div ref={spot} className="tour-spot" />
      <div ref={card} className="tour-card">
        <div className="tour-hd">
          <span className="label">{st.title}</span>
          <button className="tool bare" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="tour-body">{st.body}</div>
        <div className="tour-ft">
          <span className="tour-pips" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <i key={i} className={i === step ? "now" : i < step ? "done" : undefined} />
            ))}
          </span>
          <div className="seg">
            <button className="tool" onClick={() => move(step - 1)} disabled={step === 0} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <button className="tool cta" onClick={() => (last ? onClose() : move(step + 1))} aria-label={last ? "Done" : "Next"} autoFocus>
              {last ? <Check size={18} /> : <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
