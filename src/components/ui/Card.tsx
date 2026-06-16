import { ReactNode } from "react";
import { C } from "../../constants/colors";

interface CardProps {
  children: ReactNode;
  style?: React.CSSProperties;
}

export function Card({ children, style }: CardProps) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 16,
        border: `1px solid ${C.line}`,
        padding: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
