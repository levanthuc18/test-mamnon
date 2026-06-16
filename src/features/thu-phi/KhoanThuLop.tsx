import { useState } from "react";
import { Card } from "../../components/ui";
import { C } from "../../constants/colors";
import { uid } from "../../utils/format";
import type { MonthData, HocSinh } from "../../types";

interface KhoanThuLopProps {
  mData: MonthData;
  upMData: (d: MonthData) => void;
  locked: boolean;
  classes: { id: string; ten: string }[];
  rows: { hs: HocSinh; lopId?: string | null }[];
  lopFilter: string;
}

export function KhoanThuLop({ mData, upMData, locked, classes, rows, lopFilter }: KhoanThuLopProps) {
  if (locked) return null;
  const [ten, setTen] = useState("");
  const [so, setSo] = useState("");
  const [coDinh, setCoDinh] = useState(false);
  const [lopAp, setLopAp] = useState(lopFilter !== "all" ? lopFilter : (classes[0]?.id || ""));
  const targets = rows.filter((r) => r.lopId === lopAp);
  const apply = () => {
    if (!ten.trim() || !so || !lopAp) return;
    const ids = targets.map((r) => r.hs.id);
    if (ids.length === 0) {
      alert("Lớp này chưa có HS trong tháng.");
      return;
    }
    const fees = { ...mData.fees };
    ids.forEach((sid) => {
      const cur = fees[sid];
      if (!cur) return;
      fees[sid] = {
        ...cur,
        phuThu: [
          ...(cur.phuThu || []),
          { id: uid(), ten: ten.trim() + (coDinh ? " (cố định)" : ""), soTien: Number(so), lop: lopAp, coDinh },
        ],
      };
    });
    upMData({ ...mData, fees });
    setTen("");
    setSo("");
    alert(`Đã thêm "${ten.trim()}" cho ${ids.length} HS lớp ${classes.find((c) => c.id === lopAp)?.ten}.`);
  };
  return (
    <Card style={{ marginTop: 10, background: "#E7F0FB", borderColor: "#C7DCF3" }}>
      <div style={{ fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 700, fontSize: 14.5, marginBottom: 4, color: "#2F6FBF" }}>
        ➕ Khoản thu áp cho cả lớp
      </div>
      <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 8 }}>
        Chọn lớp + nhập khoản → cộng vào mọi HS lớp đó tháng này. <b>Cố định</b> = khoản lặp hàng tháng; <b>không cố định</b> = chỉ tháng này. Sửa/xóa lẻ ở thẻ HS.
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        <select
          value={lopAp}
          onChange={(e) => setLopAp(e.target.value)}
          style={{ flex: "1 1 120px", padding: "9px 10px", borderRadius: 9, border: "1.5px solid #C7DCF3", fontSize: 13, minWidth: 0, fontFamily: "'Be Vietnam Pro', system-ui, sans-serif", background: "#fff" }}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.ten} ({rows.filter((r) => r.lopId === c.id).length} HS)
            </option>
          ))}
        </select>
        <div style={{ display: "inline-flex", borderRadius: 9, overflow: "hidden", border: "1.5px solid #C7DCF3" }}>
          <button
            onClick={() => setCoDinh(false)}
            style={{
              padding: "8px 12px",
              fontWeight: 700,
              fontSize: 12,
              border: "none",
              cursor: "pointer",
              background: !coDinh ? "#2F6FBF" : "#fff",
              color: !coDinh ? "#fff" : C.sub,
              fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
            }}
          >
            Không cố định
          </button>
          <button
            onClick={() => setCoDinh(true)}
            style={{
              padding: "8px 12px",
              fontWeight: 700,
              fontSize: 12,
              border: "none",
              cursor: "pointer",
              background: coDinh ? "#2F6FBF" : "#fff",
              color: coDinh ? "#fff" : C.sub,
              fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
            }}
          >
            Cố định
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input
          value={ten}
          onChange={(e) => setTen(e.target.value)}
          placeholder="Tên khoản (VD: Dã ngoại / Đầu năm)"
          style={{ flex: "2 1 150px", padding: "9px 10px", borderRadius: 9, border: "1.5px solid #C7DCF3", fontSize: 13, minWidth: 0, fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
        />
        <input
          type="number"
          value={so}
          onChange={(e) => setSo(e.target.value)}
          placeholder="Số tiền"
          style={{ flex: "1 1 90px", padding: "9px 10px", borderRadius: 9, border: "1.5px solid #C7DCF3", fontSize: 13, minWidth: 0, fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
        />
        <button
          onClick={apply}
          style={{ background: "#2F6FBF", color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer" }}
        >
          Áp dụng
        </button>
      </div>
    </Card>
  );
}
