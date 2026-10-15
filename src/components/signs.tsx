// One sign for each item, used everywhere (STYLE.md: glossary).
import { Headset, Package, Wrench, type LucideProps } from "lucide-react";
import { robotLabel, robotNumber, robotStatus, type Robot, type Sim } from "@/sim/engine";

// A pilot is a headset. A fault is a wrench. An order is a package.
export const PilotIcon = Headset;
export const FaultIcon = Wrench;
export const OrderIcon = Package;

// The icon that goes with solid red (act): a headset when the robot needs a
// pilot, a wrench for a fault.
export function ActIcon({ robot, ...props }: { robot: Robot } & LucideProps) {
  if (robot.phase === "pilot_wait") return <PilotIcon {...props} />;
  if (robot.phase === "fault") return <FaultIcon {...props} />;
  return null;
}

// A robot: a small robot body with its number, in its status color. It has
// no icon, so it never looks like a pilot (a headset with a number).
export function RobotSign({ sim, robot }: { sim: Sim; robot: Robot }) {
  return <span className={`robot-sign metric ${robotStatus(sim, robot)}`}>{robotNumber(robot.id)}</span>;
}

// A robot's state: the status color, the act icon, and the state word.
export function RobotState({ sim, robot }: { sim: Sim; robot: Robot }) {
  if (robot.phase === "pilot" && robot.pilot !== null) return <PilotSign id={robot.pilot} />;
  const status = robotStatus(sim, robot);
  return (
    <>
      {status !== "normal" && (
        <span className={`swatch ${status}`}>
          <ActIcon robot={robot} size={14} strokeWidth={2.25} aria-hidden />
        </span>
      )}
      <span>{robotLabel(robot)}</span>
    </>
  );
}

// A pilot: the headset with the pilot's number.
export function PilotSign({ id }: { id: number }) {
  return (
    <span className="pilot-sign">
      <PilotIcon size={14} strokeWidth={2} aria-hidden />
      <span className="metric">{id}</span>
    </span>
  );
}
