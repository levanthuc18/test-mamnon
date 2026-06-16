import { C } from "../../constants/colors";

interface ABBtnProps {
  val: "A" | "B";
  set: (p: "A" | "B") => void;
  small?: boolean;
  disabled?: boolean;
}

export function ABBtn({ val, set, small, disabled }: ABBtnProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: 9,
        overflow: "hidden",
        border: `1.5px solid ${C.line}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {["A", "B"].map((p) => (
        <button
          key={p}
          onClick={() => !disabled && set(p as "A" | "B")}
          style={{
            padding: small ? "5px 11px" : "7px 13px",
            fontWeight: 700,
            fontSize: small ? 12 : 13,
            border: "none",
            cursor: disabled ? "default" : "pointer",
            background: val === p ? (p === "A" ? C.blueA : C.violetB) : "#fff",
            color: val === p ? "#fff" : C.sub,
            fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
