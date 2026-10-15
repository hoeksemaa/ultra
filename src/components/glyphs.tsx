// Small shared pictures: the pilot badge, status icons, item-type icons, and
// the time controls. Color carries meaning (STYLE.md); the shape repeats it,
// so no state depends on color alone.
import {
  Book,
  Box,
  CameraOff,
  Cog,
  Hand,
  Inbox,
  MailX,
  Milk,
  Printer,
  Rabbit,
  Repeat,
  Shirt,
  ShoppingBag,
  Wine,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { GraspClass } from "@/sim/catalog";
import type { Phase } from "@/sim/engine";
import { C } from "./tokens";

// A pilot: a head with a headset, and the pilot number in the middle. Drawn
// in a 24-unit box. A busy pilot has a solid head; a free pilot, an outline.
export function PilotMark({ id, busy, color = C.pilot }: { id: number; busy: boolean; color?: string }) {
  return (
    <>
      <path d="M3.4 14.5 V12 A8.6 8.6 0 0 1 20.6 12 V14.5" fill="none" stroke={color} strokeWidth={1.8} />
      <rect x={1.4} y={11.4} width={3.8} height={6.2} fill={color} />
      <rect x={18.8} y={11.4} width={3.8} height={6.2} fill={color} />
      <path d="M20.4 17.4 Q19.6 22 14.6 22" fill="none" stroke={color} strokeWidth={1.4} />
      <circle cx={12} cy={14.2} r={6.6} fill={busy ? color : C.charcoal} stroke={color} strokeWidth={1.6} />
      <text
        x={12}
        y={14.2}
        dy="0.36em"
        textAnchor="middle"
        fontSize={id > 9 ? 7.6 : 9.4}
        fontWeight={700}
        fontFamily="var(--font-mono)"
        fill={busy ? C.charcoal : color}
      >
        {id}
      </text>
    </>
  );
}

// The same badge as an HTML element.
export function PilotBadge({ id, busy, size = 28 }: { id: number; busy: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="pilot-badge">
      <PilotMark id={id} busy={busy} />
    </svg>
  );
}

// Robot states that show an icon. Packing shows none: green is quiet.
export const STATUS_ICON: Partial<Record<Phase, LucideIcon>> = {
  idle: Inbox, // no tote
  regrasp: Repeat, // the robot tries the grasp again alone
  pilot_wait: Hand, // a pilot must take over
  fault: Wrench, // an operator must fix the robot
};

export const FAULT_ICON: Record<string, LucideIcon> = {
  "Gripper torque": Cog,
  "Wrist camera offline": CameraOff,
  "Mailer feed jam": MailX,
  "Label printer jam": Printer,
};

export const CLASS_ICON: Record<GraspClass, LucideIcon> = {
  rigid: Box,
  bottle: Milk,
  pouch: ShoppingBag,
  flat: Book,
  fragile: Wine,
  apparel: Shirt,
  soft: Rabbit,
};

// Time controls: pause, then one to three play triangles for the speeds.
export function TimeIcon({ n }: { n: 0 | 1 | 2 | 3 }) {
  const w = n === 1 ? 10 : 7;
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
      {n === 0 ? (
        <>
          <rect x={6} y={5} width={4} height={14} fill="currentColor" />
          <rect x={14} y={5} width={4} height={14} fill="currentColor" />
        </>
      ) : (
        Array.from({ length: n }, (_, i) => {
          const x0 = 12 - (n * w) / 2 + i * w;
          return <path key={i} d={`M${x0} 5.5 L${x0 + w} 12 L${x0} 18.5 Z`} fill="currentColor" />;
        })
      )}
    </svg>
  );
}
