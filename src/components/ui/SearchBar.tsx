import { C, font } from "../../constants/colors";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <span
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: C.gray,
          fontSize: 14,
        }}
      >
        🔍
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Tìm tên học sinh…"}
        style={{
          width: "100%",
          padding: "10px 12px 10px 34px",
          borderRadius: 12,
          border: `1.5px solid ${C.line}`,
          fontFamily: font.body,
          fontSize: 14,
          color: C.ink,
          background: C.card,
          outline: "none",
        }}
        onFocus={(e) => (e.target.style.borderColor = C.pine)}
        onBlur={(e) => (e.target.style.borderColor = C.line)}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "none",
            color: C.gray,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
