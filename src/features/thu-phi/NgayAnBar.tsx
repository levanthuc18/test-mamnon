import { useState } from "react";
import { Card, NumInput } from "../../components/ui";
import { C, font } from "../../constants/colors";
import type { HocSinh } from "../../types";

interface NgayAnBarProps {
  onApply: (val: number, ids: string[]) => void;
  rows: { hs: HocSinh }[];
}

export function NgayAnBar({ onApply, rows }: NgayAnBarProps) {
  const [v, setV] = useState(24);
  return (
    <Card
      style={{
        marginBottom: 10,
        background: "#E2F0EB",
        borderColor: "#BFE0D4",
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.pine }}>
          🍽️ Số ngày ăn trong tháng:
        </span>
        <NumInput value={v} onChange={setV} w={62} />
        <span style={{ fontSize: 12.5, color: C.pine }}>ngày</span>
        <button
          onClick={() => onApply(v, rows.map((r) => r.hs.id))}
          style={{
            background: C.pine,
            color: "#fff",
            fontWeight: 700,
            fontSize: 12.5,
            padding: "8px 14px",
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
          }}
        >
          Áp dụng cho {rows.length} HS đang hiển thị
        </button>
      </div>
      <div style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>
        Tiền ăn = số ngày ăn × đơn giá. Chỉ áp cho HS đang lọc; HS đã sửa tay vẫn giữ riêng.
      </div>
    </Card>
  );
}
