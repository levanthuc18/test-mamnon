import { useState } from "react";
import { C, font } from "../../constants/colors";

interface NumInputProps {
  value: number;
  onChange: (v: number) => void;
  w?: number;
  disabled?: boolean;
  warn?: boolean;
}

export function NumInput({ value, onChange, w = 70, disabled, warn }: NumInputProps) {
  const [focused, setFocused] = useState(false);
  const display = focused
    ? (value === 0 || value == null ? "" : String(value))
    : (value === 0 || value == null ? "" : Number(value).toLocaleString("vi-VN"));
  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      disabled={disabled}
      placeholder="0"
      onFocus={(e) => {
        if (!disabled) {
          setFocused(true);
          e.target.style.borderColor = C.pine;
          setTimeout(() => e.target.select(), 0);
        }
      }}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, "");
        onChange(digits === "" ? 0 : Number(digits));
      }}
      onBlur={(e) => {
        setFocused(false);
        e.target.style.borderColor = warn ? C.amber : C.line;
      }}
      style={{
        width: w,
        padding: "6px 8px",
        borderRadius: 8,
        border: `1.5px solid ${warn ? C.amber : C.line}`,
        fontFamily: font.body,
        fontSize: 14,
        color: C.ink,
        background: disabled ? C.graySoft : warn ? C.amberSoft : "#FAFCFA",
        textAlign: "right",
        outline: "none",
      }}
    />
  );
}
