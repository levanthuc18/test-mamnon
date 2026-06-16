import { C } from "../../constants/colors";

interface DonutProps {
  pct: number;
  color: string;
  size?: number;
}

export function Donut({ pct, color, size = 76 }: DonutProps) {
  const r = (size - 10) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(100, pct) / 100;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#EEF1EE" strokeWidth={8} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}
      />
      <text x={c} y={c + 5} textAnchor="middle" fontSize={16} fontWeight={800} fill={C.ink} fontFamily="'Baloo 2', system-ui, sans-serif">
        {pct}%
      </text>
    </svg>
  );
}
