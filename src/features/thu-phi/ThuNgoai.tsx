import { useState } from "react";
import { Card, NumInput, ABBtn } from "../../components/ui";
import { C } from "../../constants/colors";
import { uid } from "../../utils/format";
import type { MonthData } from "../../types";

interface ThuNgoaiProps {
  mData: MonthData;
  upMData: (d: MonthData) => void;
  locked: boolean;
}

export function ThuNgoai({ mData, upMData, locked }: ThuNgoaiProps) {
  const tn = mData.thuNgoai || [];
  const [ten, setTen] = useState("");
  const [so, setSo] = useState("");
  const add = () => {
    if (!ten.trim()) return;
    upMData({ ...mData, thuNgoai: [...tn, { id: uid(), ten: ten.trim(), soTien: Number(so) || 0, thucThu: 0, nguoiThu: "A" }] });
    setTen("");
    setSo("");
  };
  const set = (id: string, p: Partial<MonthData["thuNgoai"][0]>) =>
    upMData({ ...mData, thuNgoai: tn.map((k) => (k.id === id ? { ...k, ...p } : k)) });
  const del = (id: string) => upMData({ ...mData, thuNgoai: tn.filter((k) => k.id !== id) });

  return (
    <Card style={{ marginTop: 4 }}>
      <div style={{ fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 700, fontSize: 14.5, marginBottom: 8 }}>💧 Thu ngoài (KV4)</div>
      {tn.map((k) => (
        <div key={k.id} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ flex: "1 1 120px", fontSize: 13.5, fontWeight: 600, minWidth: 0 }}>
            {k.ten} <span style={{ color: C.sub, fontWeight: 400 }}>({k.soTien.toLocaleString("vi-VN")})</span>
          </div>
          <NumInput value={k.thucThu} onChange={(v) => set(k.id, { thucThu: v })} w={100} disabled={locked} />
          <ABBtn val={k.nguoiThu} set={(p) => set(k.id, { nguoiThu: p })} small disabled={locked} />
          {!locked && (
            <button onClick={() => del(k.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", padding: 4 }}>
              🗑
            </button>
          )}
        </div>
      ))}
      {!locked && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            placeholder="Tên khoản (VD: Quỹ CSVC)"
            style={{ flex: "2 1 140px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, minWidth: 0, fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
          />
          <input
            type="number"
            value={so}
            onChange={(e) => setSo(e.target.value)}
            placeholder="Số tiền"
            style={{ flex: "1 1 90px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, minWidth: 0, fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
          />
          <button
            onClick={add}
            style={{ background: "#176B5B", color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer" }}
          >
            + Thêm
          </button>
        </div>
      )}
    </Card>
  );
}
