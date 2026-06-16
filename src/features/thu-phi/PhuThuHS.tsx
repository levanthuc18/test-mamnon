import { useState } from "react";
import { C, font } from "../../constants/colors";
import { uid } from "../../utils/format";
import type { FeeRecord } from "../../types";

interface PhuThuHSProps {
  hsId: string;
  rec: FeeRecord;
  locked: boolean;
  addPhuThuHS: (sid: string, ten: string, soTien: number) => void;
  delPhuThuHS: (sid: string, pid: string) => void;
}

export function PhuThuHS({ hsId, rec, locked, addPhuThuHS, delPhuThuHS }: PhuThuHSProps) {
  const [ten, setTen] = useState("");
  const [so, setSo] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const list = rec.phuThu || [];
  const add = () => {
    if (!ten.trim() || !so) return;
    addPhuThuHS(hsId, ten.trim(), Number(so));
    setTen("");
    setSo("");
  };
  return (
    <div style={{ marginBottom: 10, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 4 }}>
        Khoản riêng (đầu năm, đồng phục…)
      </div>
      {list.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 13 }}>
          <span style={{ flex: 1, color: C.ink }}>
            {p.ten}
            {p.lop && <span style={{ color: C.blueA, fontSize: 10.5 }}> (cả lớp)</span>}
          </span>
          <span style={{ fontWeight: 600 }}>
            {p.soTien.toLocaleString("vi-VN")} đ
          </span>
          {!locked &&
            (confirmId === p.id ? (
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => { delPhuThuHS(hsId, p.id); setConfirmId(null); }}
                  style={{
                    border: "none",
                    background: C.coral,
                    color: "#fff",
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Xóa
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  style={{ border: "none", background: "none", color: C.sub, fontSize: 11, cursor: "pointer" }}
                >
                  Hủy
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmId(p.id)}
                style={{ border: "none", background: "none", color: C.coral, cursor: "pointer", fontSize: 14 }}
              >
                🗑
              </button>
            ))}
        </div>
      ))}
      {!locked && (
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            placeholder="Tên khoản (VD: Đầu năm)"
            style={{
              flex: "2 1 130px",
              padding: "7px 9px",
              borderRadius: 8,
              border: `1.5px solid ${C.line}`,
              fontSize: 12.5,
              minWidth: 0,
              fontFamily: font.body,
            }}
          />
          <input
            type="number"
            value={so}
            onChange={(e) => setSo(e.target.value)}
            placeholder="Số tiền"
            style={{
              flex: "1 1 80px",
              padding: "7px 9px",
              borderRadius: 8,
              border: `1.5px solid ${C.line}`,
              fontSize: 12.5,
              minWidth: 0,
              fontFamily: font.body,
            }}
          />
          <button
            onClick={add}
            style={{
              background: "#E2F0EB",
              color: C.pine,
              fontWeight: 700,
              fontSize: 12.5,
              padding: "7px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            + Thêm
          </button>
        </div>
      )}
    </div>
  );
}
