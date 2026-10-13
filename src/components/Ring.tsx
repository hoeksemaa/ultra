import { C } from "./tokens";

// Progress ring: a gray track, and an arc that runs clockwise from the top.
export default function Ring({
  cx,
  cy,
  r,
  width,
  value,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  width: number;
  value: number | null;
  color: string;
}) {
  const c = 2 * Math.PI * r;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.w12} strokeWidth={width} />
      {value !== null && value > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeDasharray={`${c * value} ${c}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      )}
    </g>
  );
}
