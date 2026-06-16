import { C } from "../../constants/colors";
import { PL_LABEL } from "../../utils/finance";
import type { PhanLoai } from "../../types";

interface PLBadgeProps {
  pl: PhanLoai;
}

export function PLBadge({ pl }: PLBadgeProps) {
  const colors: Record<PhanLoai, { bg: string; c: string }> = {
    Bthg: { bg: C.graySoft, c: C.gray },
    AE: { bg: C.blueASoft, c: C.blueA },
    GV: { bg: C.greenSoft, c: C.green },
    T7: { bg: C.amberSoft, c: C.amber },
  };
  const s = colors[pl] || colors.Bthg;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 99,
        background: s.bg,
        color: s.c,
        whiteSpace: "nowrap",
      }}
    >
      {PL_LABEL[pl] || pl}
    </span>
  );
}

================================================================================
BƯỚC 6: SỬA FILE src/components/ui/index.ts
================================================================================

Mở file index.ts đã có, THÊM vào cuối (giữ nguyên các dòng cũ):

export { NumInput } from "./NumInput";
export { ABBtn } from "./ABBtn";
export { LockNote } from "./LockNote";
export { PLBadge } from "./PLBadge";
