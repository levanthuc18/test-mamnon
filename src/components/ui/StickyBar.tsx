import { ReactNode } from "react";
import { C } from "../../constants/colors";

interface StickyBarProps {
  shrunk: boolean;
  children: ReactNode;
}

export function StickyBar({ shrunk, children }: StickyBarProps) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 22,
        background: shrunk ? "rgba(245,247,243,.96)" : "transparent",
        backdropFilter: shrunk ? "blur(6px)" : "none",
        WebkitBackdropFilter: shrunk ? "blur(6px)" : "none",
        margin: "0 -14px",
        padding: shrunk ? "8px 14px 2px" : "0 14px",
        borderBottom: shrunk ? `1px solid ${C.line}` : "1px solid transparent",
        boxShadow: shrunk ? "0 4px 12px -8px rgba(23,107,91,.35)" : "none",
        transition:
          "background .2s ease, padding .2s ease, border-color .2s ease, box-shadow .2s ease",
      }}
    >
      {children}
    </div>
  );
}
