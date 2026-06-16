import { C, font } from "../../constants/colors";

interface BadgeProps {
  s: { t: string; c: string; bg: string };
}

export function Badge({ s }: BadgeProps) {
  return (
    <span
      style={{
        background: s.bg,
        color: s.c,
        fontFamily: font.body,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 99,
        whiteSpace: "nowrap",
      }}
    >
      {s.t}
    </span>
  );
}
