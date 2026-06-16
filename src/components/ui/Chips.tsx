import { C, font } from "../../constants/colors";

interface ChipsProps {
  items: [string, string][];
  val: string;
  set: (id: string) => void;
}

export function Chips({ items, val, set }: ChipsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 4,
        marginBottom: 10,
      }}
    >
      {items.map(([id, lb]) => (
        <button
          key={id}
          onClick={() => set(id)}
          style={{
            flexShrink: 0,
            padding: "6px 13px",
            borderRadius: 99,
            border: `1.5px solid ${val === id ? C.pine : C.line}`,
            cursor: "pointer",
            background: val === id ? C.pine : C.card,
            color: val === id ? "#fff" : C.sub,
            fontFamily: font.body,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {lb}
        </button>
      ))}
    </div>
  );
}
