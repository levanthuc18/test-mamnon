import { QRBox } from "./QRBox";
import { C, font } from "../../constants/colors";
import type { HocSinh, FeeRecord, Lop, Meta, MonthData } from "../../types";

interface PhieuRow {
  hs: HocSinh;
  rec: FeeRecord;
  lop?: Lop;
  ps: { tong: number; dong: [string, number, boolean][] };
  noTruoc: number;
  tongPhaiThu: number;
  conNo: number;
}

interface PhieuThuProps {
  phieuRow: PhieuRow;
  allRows: PhieuRow[];
  setPhieuId: (id: string) => void;
  meta: Meta;
  month: number;
  year: number;
  upMeta: (m: Meta) => void;
  mData: MonthData;
  upMData: (d: MonthData) => void;
}

export function PhieuThu({ phieuRow, allRows, setPhieuId, meta, month, year, upMeta, mData, upMData }: PhieuThuProps) {
  const nguoiThu = phieuRow.hs.nguoiThu;
  const bienLai = phieuRow.rec.bienLai || null;
  const inPhieu = () => {
    if (!bienLai) {
      const next = (meta.soBienLai?.[nguoiThu] || 0) + 1;
      const bl = `BL-${nguoiThu}-${String(next).padStart(4, "0")}`;
      upMeta({ ...meta, soBienLai: { ...(meta.soBienLai || {}), [nguoiThu]: next } });
      upMData({ ...mData, fees: { ...mData.fees, [phieuRow.hs.id]: { ...mData.fees[phieuRow.hs.id], bienLai: bl } } });
      setTimeout(() => window.print(), 100);
    } else {
      window.print();
    }
  };

  return (
    <>
      <select
        className="no-print"
        value={phieuRow.hs.id}
        onChange={(e) => setPhieuId(e.target.value)}
        style={{
          width: "100%",
          padding: "11px 12px",
          borderRadius: 12,
          marginBottom: 14,
          border: `1.5px solid ${C.line}`,
          fontFamily: font.body,
          fontSize: 14,
          color: C.ink,
          background: C.card,
        }}
      >
        {allRows.filter((r) => r.rec).map((r) => (
          <option key={r.hs.id} value={r.hs.id}>
            {r.hs.ten} — {r.lop?.ten}
          </option>
        ))}
      </select>

      <div id="phieu-in" style={{ background: "#FFFEF9", borderRadius: 4, padding: "0 0 18px", boxShadow: "0 4px 18px rgba(28,53,48,.12)" }}>
        <div
          style={{
            height: 10,
            background: `linear-gradient(45deg, transparent 33.33%, #FFFEF9 33.33%, #FFFEF9 66.66%, transparent 66.66%), linear-gradient(-45deg, transparent 33.33%, #FFFEF9 33.33%, #FFFEF9 66.66%, transparent 66.66%)`,
            backgroundColor: C.bg,
            backgroundSize: "14px 20px",
          }}
        />
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: C.sub }}>
              {bienLai ? <b style={{ color: C.ink, fontSize: 12 }}>{bienLai}</b> : "Số: (cấp khi in)"}
            </div>
            <div style={{ fontSize: 11, color: C.sub }}>Ngày: {new Date().toLocaleDateString("vi-VN")}</div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 19, color: C.pine }}>PHIẾU THU HỌC PHÍ</div>
            <div style={{ fontSize: 12.5, color: C.sub }}>
              Tháng {month}/{year} — {meta.tenTruong}
            </div>
          </div>
          <div style={{ fontSize: 13.5, marginBottom: 10 }}>
            <b>{phieuRow.hs.ten}</b> · {phieuRow.lop?.ten} · Mã {phieuRow.hs.id.toUpperCase()}
          </div>
          <div style={{ fontSize: 13.5 }}>
            {phieuRow.ps.dong.map(([l, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3.5px 0", borderBottom: `1px dotted ${C.line}` }}>
                <span style={{ color: C.sub }}>{l}</span>
                <span>{v.toLocaleString("vi-VN")}</span>
              </div>
            ))}
            {phieuRow.noTruoc !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3.5px 0", borderBottom: `1px dotted ${C.line}`, color: phieuRow.noTruoc > 0 ? C.coral : "#2E8F63" }}>
                <span>{phieuRow.noTruoc > 0 ? "Nợ tháng trước" : "Dư tháng trước"}</span>
                <span>
                  {phieuRow.noTruoc > 0 ? phieuRow.noTruoc.toLocaleString("vi-VN") : "−" + (-phieuRow.noTruoc).toLocaleString("vi-VN")}
                </span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0 3px", fontFamily: font.display, fontWeight: 800, fontSize: 16 }}>
              <span>TỔNG PHẢI THU</span>
              <span>{phieuRow.tongPhaiThu.toLocaleString("vi-VN")} đ</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: C.sub }}>Đã thu</span>
              <span>{phieuRow.rec.thucThu.toLocaleString("vi-VN")} đ</span>
            </div>
            {phieuRow.conNo !== 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: phieuRow.conNo > 0 ? C.coral : "#A8731B", fontWeight: 600 }}>
                <span>{phieuRow.conNo > 0 ? "Còn nợ" : "Thu thừa"}</span>
                <span>{Math.abs(phieuRow.conNo).toLocaleString("vi-VN")} đ</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#E2F0EB", display: "flex", gap: 12, alignItems: "center" }}>
            <QRBox bank={meta.bank[nguoiThu]} amount={Math.max(0, phieuRow.conNo)} noiDung={`Hoc phi ${phieuRow.hs.ten} T${month}`} />
            <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              <b>Chuyển khoản cho {nguoiThu}</b>
              <br />
              {meta.bank[nguoiThu].chu}
              <br />
              {meta.bank[nguoiThu].stk} · {meta.bank[nguoiThu].nh}
            </div>
          </div>
        </div>
      </div>
      <button
        className="no-print"
        onClick={inPhieu}
        style={{ marginTop: 14, width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
      >
        {bienLai ? "🖨 In / Lưu PDF" : "✓ Cấp số biên lai & In"}
      </button>
    </>
  );
}
