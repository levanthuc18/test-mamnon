import { useMemo, useState } from "react";
import { BottomSheet } from "../../components/ui";  // Giả sử đã có hoặc dùng inline
import { C } from "../../constants/colors";
import { noDau } from "../../utils/format";
import type { Lop } from "../../types";

interface LopFilterSheetProps {
  open: boolean;
  onClose: () => void;
  chipsLop: [string, string][];
  lopFilter: string;
  setLopFilter: (id: string) => void;
  allRows: { lopId?: string | null; coRec: boolean; conNo: number }[];
}

export function LopFilterSheet({ open, onClose, chipsLop, lopFilter, setLopFilter, allRows }: LopFilterSheetProps) {
  const [q, setQ] = useState("");
  const stats = useMemo(() => {
    const s: Record<string, { count: number; no: number }> = {};
    allRows.forEach((r) => {
      if (!r.coRec) return;
      const id = r.lopId || "none";
      if (!s[id]) s[id] = { count: 0, no: 0 };
      s[id].count++;
      s[id].no += Math.max(0, r.conNo);
    });
    return s;
  }, [allRows]);

  const totalNo = allRows.reduce((a, r) => a + (r.coRec ? Math.max(0, r.conNo) : 0), 0);
  const totalHS = allRows.filter((r) => r.coRec).length;

  const filtered = chipsLop.filter(([id, ten]) => {
    if (!q.trim()) return true;
    return noDau(ten).includes(noDau(q));
  });

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,.45)" }} />
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 24px", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 -4px 24px rgba(0,0,0,.18)" }}>
        <div style={{ width: 44, height: 5, borderRadius: 99, background: C.line, margin: "0 auto 12px" }} />
        <div style={{ fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>Chọn lớp học</div>
        {filtered.map(([id, ten]) => {
          const active = lopFilter === id;
          const count = id === "all" ? totalHS : (stats[id]?.count || 0);
          const no = id === "all" ? totalNo : (stats[id]?.no || 0);
          return (
            <div
              key={id}
              onClick={() => { setLopFilter(id); onClose(); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 4px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${active ? C.pine : C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {active && <div style={{ width: 12, height: 12, borderRadius: 99, background: C.pine }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: active ? C.pine : C.ink }}>{id === "all" ? "Tất cả lớp" : ten}</div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{count} học sinh · Nợ: {no.toLocaleString("vi-VN")} đ</div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 20, color: C.sub, fontSize: 13 }}>Không tìm thấy lớp</div>
        )}
      </div>
    </div>
  );
}
