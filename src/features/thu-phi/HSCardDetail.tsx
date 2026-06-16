import { useState } from "react";
import { NumInput } from "../../components/ui";
import { C, font } from "../../constants/colors";
import { KHOAN } from "../../utils/finance";
import { PhuThuHS } from "./PhuThuHS";
import type { HocSinh, FeeRecord, Lop } from "../../types";

interface HSCardDetailProps {
  r: {
    hs: HocSinh;
    rec: FeeRecord;
    lop?: Lop;
    tongPhaiThu: number;
    ps: { tong: number; dong: [string, number, boolean][]; suaCount: number };
    noTruoc: number;
    st: { t: string; c: string; bg: string } | null;
    conNo: number;
  };
  locked: boolean;
  setRec: (sid: string, patch: Partial<FeeRecord>) => void;
  setKhoan: (sid: string, key: string, val: number) => void;
  resetKhoan: (sid: string, key: string) => void;
  resetAllKhoan: (sid: string) => void;
  addPhuThuHS: (sid: string, ten: string, soTien: number) => void;
  delPhuThuHS: (sid: string, pid: string) => void;
  setPhieuId: (id: string) => void;
  setTab: (id: string) => void;
}

export function HSCardDetail({
  r,
  locked,
  setRec,
  setKhoan,
  resetKhoan,
  resetAllKhoan,
  addPhuThuHS,
  delPhuThuHS,
  setPhieuId,
  setTab,
}: HSCardDetailProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKhoan, setSheetKhoan] = useState<{ key: string; label: string } | null>(null);
  const [sheetVal, setSheetVal] = useState("");
  const [sheetLabel, setSheetLabel] = useState("");
  const [ptTen, setPtTen] = useState("");
  const [ptSo, setPtSo] = useState("");
  const [showPtInput, setShowPtInput] = useState(false);
  const [showChiTiet, setShowChiTiet] = useState(false);

  const openSheet = (k: { key: string; label: string } | null, label?: string) => {
    setSheetKhoan(k);
    setSheetLabel(label || (k ? k.label : ""));
    setSheetVal(String(k ? (r.rec.khoan?.[k.key] ?? 0) : (r.rec.ngayAn || 0)));
    setSheetOpen(true);
  };

  const saveSheet = () => {
    if (sheetKhoan) {
      setKhoan(r.hs.id, sheetKhoan.key, Number(sheetVal) || 0);
    } else {
      setRec(r.hs.id, { ngayAn: Number(sheetVal) || 0, ngayAnManual: true });
    }
    setSheetOpen(false);
  };

  const addPT = () => {
    if (!ptTen.trim() || !ptSo) return;
    addPhuThuHS(r.hs.id, ptTen.trim(), Number(ptSo));
    setPtTen("");
    setPtSo("");
    setShowPtInput(false);
  };

  const tienAn = r.rec.khoan?.tienAn ?? 0;
  const giaAn = r.rec.ngayAn > 0 ? Math.round(tienAn / r.rec.ngayAn) : (r.lop?.tienAn || 0);

  return (
    <div className="fade-in" style={{ borderTop: `1px dashed ${C.line}`, background: "#FBFDFB", animation: "fadeIn .2s ease" }}>
      <div style={{ padding: "14px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>Thực thu:</span>
          <NumInput value={r.rec.thucThu} onChange={(v) => setRec(r.hs.id, { thucThu: v })} w={140} disabled={locked} />
          {!locked && (r.rec.thucThu || 0) < r.tongPhaiThu && (
            <button
              onClick={() => setRec(r.hs.id, { thucThu: r.tongPhaiThu })}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: "#2E8F63",
                color: "#fff",
                fontFamily: font.display,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ✓ Thu đủ
            </button>
          )}
          {!locked && (r.rec.thucThu || 0) >= r.tongPhaiThu && r.tongPhaiThu > 0 && (
            <span
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "#E4F3EA",
                color: "#2E8F63",
                fontWeight: 700,
                fontSize: 14,
                whiteSpace: "nowrap",
              }}
            >
              ✓ Đã thu đủ
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "0 14px 14px" }}>
        <div
          onClick={() => !locked && openSheet(null, "Ngày ăn")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 0",
            borderBottom: `1px solid ${C.line}`,
            cursor: locked ? "default" : "pointer",
          }}
        >
          <div
            style={{
              fontFamily: font.display,
              fontWeight: 800,
              fontSize: 20,
              color: C.ink,
              minWidth: 36,
              textAlign: "center",
            }}
          >
            {r.rec.ngayAn}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Ngày ăn</div>
            <div style={{ fontSize: 12, color: C.sub }}>
              {tienAn.toLocaleString("vi-VN")} đ
              {r.rec.ngayAnManual && <span style={{ color: "#A8731B", marginLeft: 4 }}>· tay</span>}
            </div>
          </div>
          {!locked && <span style={{ fontSize: 16, color: C.sub }}>✏️</span>}
        </div>

        {r.hs.pl !== "GV" && r.hs.pl !== "T7" && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>Khoản phí</div>
              {!locked && r.ps.suaCount > 0 && (
                <button
                  onClick={() => resetAllKhoan(r.hs.id)}
                  style={{
                    fontSize: 11,
                    color: C.pine,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ↺ Khôi phục
                </button>
              )}
            </div>
            {KHOAN.filter((k) => k.key !== "tienAn").map((k) => {
              const val = r.rec.khoan?.[k.key] ?? 0;
              const def = r.rec.khoanDefault?.[k.key] ?? 0;
              const sua = val !== def;
              if (val === 0 && def === 0 && k.key !== "hocPhi") return null;
              return (
                <div
                  key={k.key}
                  onClick={() => !locked && openSheet(k)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                    borderBottom: `1px solid ${C.line}`,
                    cursor: locked ? "default" : "pointer",
                  }}
                >
                  <span style={{ flex: 1, fontSize: 14, color: sua ? "#A8731B" : C.ink }}>
                    {k.label}
                    {sua && <span style={{ fontSize: 11, color: "#A8731B", marginLeft: 4 }}>· đã sửa</span>}
                  </span>
                  <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, color: C.ink }}>
                    {val.toLocaleString("vi-VN")}
                  </span>
                  {!locked && <span style={{ fontSize: 14, color: C.sub }}>✏️</span>}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, whiteSpace: "nowrap" }}>Khoản riêng</span>
            <div style={{ flex: 1, height: 1, background: C.line }} />
            {!locked && !showPtInput && (
              <button
                onClick={() => setShowPtInput(true)}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: 9,
                  border: `1.5px solid ${C.pine}`,
                  background: "#E2F0EB",
                  color: C.pine,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                ➕ Thêm
              </button>
            )}
          </div>
          {(r.rec.phuThu || []).map((p) => (
            <div
              key={p.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}
            >
              <span style={{ flex: 1, fontSize: 14, color: C.ink }}>
                {p.ten}
                {p.lop && <span style={{ color: C.blueA, fontSize: 10 }}> (cả lớp)</span>}
              </span>
              <span style={{ fontWeight: 700 }}>{p.soTien.toLocaleString("vi-VN")}</span>
              {!locked && (
                <button
                  onClick={(e) => { e.stopPropagation(); delPhuThuHS(r.hs.id, p.id); }}
                  style={{ border: "none", background: "none", color: C.coral, cursor: "pointer", fontSize: 14 }}
                >
                  🗑
                </button>
              )}
            </div>
          ))}
          {(r.rec.phuThu || []).length === 0 && !showPtInput && (
            <div style={{ fontSize: 12, color: "#8A938E", padding: "2px 0 4px" }}>Chưa có khoản riêng.</div>
          )}
          {!locked && showPtInput && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <input
                value={ptTen}
                onChange={(e) => setPtTen(e.target.value)}
                placeholder="Tên khoản"
                style={{ flex: 2, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 13, fontFamily: font.body }}
              />
              <input
                type="number"
                value={ptSo}
                onChange={(e) => setPtSo(e.target.value)}
                placeholder="Số tiền"
                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 13, fontFamily: font.body }}
              />
              <button
                onClick={addPT}
                style={{
                  background: C.pine,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Thêm
              </button>
              <button
                onClick={() => { setShowPtInput(false); setPtTen(""); setPtSo(""); }}
                style={{
                  background: "none",
                  color: C.sub,
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1.5px solid ${C.line}`,
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: C.card, border: `1px solid ${C.line}` }}>
          <div
            onClick={() => setShowChiTiet((v) => !v)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Chi tiết</div>
            <span
              style={{
                fontSize: 12,
                color: C.sub,
                transition: "transform .2s",
                transform: showChiTiet ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▼
            </span>
          </div>

          {showChiTiet && (
            <div style={{ marginTop: 8 }}>
              {r.ps.dong.map(([l, v, sua], i) => (
                <div
                  key={i}
                  style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 13, color: v < 0 ? "#2E8F63" : C.ink }}
                >
                  <span style={{ color: C.sub }}>
                    {l}
                    {sua && <span style={{ color: "#A8731B" }}> ⚠</span>}
                  </span>
                  <span>{v.toLocaleString("vi-VN")}</span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  fontSize: 13,
                  color: C.sub,
                  marginTop: 4,
                  borderTop: `1px dashed ${C.line}`,
                }}
              >
                <span>Phát sinh tháng này</span>
                <span>{r.ps.tong.toLocaleString("vi-VN")}</span>
              </div>
              {r.noTruoc !== 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                    fontSize: 13,
                    color: r.noTruoc > 0 ? C.coral : "#2E8F63",
                  }}
                >
                  <span>{r.noTruoc > 0 ? "+ Nợ tháng trước" : "− Dư tháng trước"}</span>
                  <span>
                    {r.noTruoc > 0 ? r.noTruoc.toLocaleString("vi-VN") : "−" + (-r.noTruoc).toLocaleString("vi-VN")}
                  </span>
                </div>
              )}
            </div>
          )}

          {!showChiTiet && (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: C.sub }}>
                <span>Phát sinh tháng này</span>
                <span>{r.ps.tong.toLocaleString("vi-VN")}</span>
              </div>
              {r.noTruoc !== 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "3px 0",
                    fontSize: 13,
                    color: r.noTruoc > 0 ? C.coral : "#2E8F63",
                  }}
                >
                  <span>{r.noTruoc > 0 ? "+ Nợ tháng trước" : "− Dư tháng trước"}</span>
                  <span>
                    {r.noTruoc > 0 ? r.noTruoc.toLocaleString("vi-VN") : "−" + (-r.noTruoc).toLocaleString("vi-VN")}
                  </span>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 8,
              marginTop: 6,
              borderTop: `1.5px solid ${C.line}`,
              fontWeight: 800,
              fontSize: 16,
              fontFamily: font.display,
            }}
          >
            <span>TỔNG PHẢI THU</span>
            <span>{r.tongPhaiThu.toLocaleString("vi-VN")} đ</span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "#fff",
          borderTop: `1.5px solid ${C.line}`,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 5,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.sub }}>
            Phát sinh {r.ps.tong.toLocaleString("vi-VN")} · Nợ cũ {r.noTruoc.toLocaleString("vi-VN")}
          </div>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 16, color: C.ink }}>
            Tổng {r.tongPhaiThu.toLocaleString("vi-VN")} đ
          </div>
        </div>
        <button
          onClick={() => { setPhieuId(r.hs.id); setTab("phieu"); }}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: C.pine,
            color: "#fff",
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Đến thu tiền →
        </button>
      </div>

      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setSheetOpen(false)} style={{ flex: 1, background: "rgba(0,0,0,.4)" }} />
          <div
            style={{
              background: "#fff",
              borderRadius: "20px 20px 0 0",
              padding: "20px 16px 24px",
              boxShadow: "0 -4px 20px rgba(0,0,0,.15)",
            }}
          >
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 14 }}>
              Sửa {sheetLabel}
            </div>
            {sheetKhoan && (
              <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>
                Mặc định: {(r.rec.khoanDefault?.[sheetKhoan.key] ?? 0).toLocaleString("vi-VN")}
              </div>
            )}
            {!sheetKhoan && (
              <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>
                Giá: {giaAn.toLocaleString("vi-VN")} đ/ngày
              </div>
            )}
            <input
              type="number"
              inputMode="numeric"
              autoFocus
              value={sheetVal}
              onChange={(e) => setSheetVal(e.target.value)}
              placeholder="0"
              style={{
                width: "100%",
                padding: "14px 12px",
                borderRadius: 12,
                border: `1.5px solid ${C.pine}`,
                fontSize: 18,
                fontFamily: font.display,
                fontWeight: 700,
                color: C.ink,
                textAlign: "right",
                marginBottom: 14,
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setSheetOpen(false)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: `1.5px solid ${C.line}`,
                  background: C.card,
                  color: C.sub,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
              <button
                onClick={saveSheet}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "none",
                  background: C.pine,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Lưu
              </button>
            </div>
            {sheetKhoan && (
              <button
                onClick={() => { resetKhoan(r.hs.id, sheetKhoan!.key); setSheetOpen(false); }}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "none",
                  color: C.pine,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ↺ Khôi phục mặc định
              </button>
            )}
            {!sheetKhoan && (
              <button
                onClick={() => { setRec(r.hs.id, { ngayAnManual: false }); setSheetOpen(false); }}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "none",
                  color: C.pine,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ↺ Trả về tự tính
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
