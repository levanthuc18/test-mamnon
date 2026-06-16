import { useRef, useState, useMemo } from "react";
import { Badge, Card, SearchBar, StickyBar, Chips, useStickyShrink } from "../../components/ui";
import { C, font } from "../../constants/colors";
import { noDau } from "../../utils/format";
import { KHOAN, trangThaiThu } from "../../utils/finance";
import { EmptyState } from "./EmptyState";
import { NgayAnBar } from "./NgayAnBar";
import { HSCardDetail } from "./HSCardDetail";
import { LopFilterSheet } from "./LopFilterSheet";
import { ThuNgoai } from "./ThuNgoai";
import { KhoanThuLop } from "./KhoanThuLop";
import type { HocSinh, FeeRecord, Lop, MonthData } from "../../types";

interface Row {
  hs: HocSinh;
  rec: FeeRecord;
  lopId?: string | null;
  lop?: Lop;
  nghi: number;
  ps: { tong: number; dong: [string, number, boolean][]; suaCount: number };
  noTruoc: number;
  tongPhaiThu: number;
  st: { t: string; c: string; bg: string } | null;
  conNo: number;
  coRec: boolean;
}

interface ThuPhiTabProps {
  rows: Row[];
  tk: {
    ps: number;
    thu: number;
    no: number;
    A: number;
    B: number;
    chiA: number;
    chiB: number;
    traA: number;
    traB: number;
    noList: { ten: string; so: number; chua: boolean }[];
    noAB_AtoB: number;
    noAB_BtoA: number;
  };
  allRows: Row[];
  chipsLop: [string, string][];
  lopFilter: string;
  setLopFilter: (id: string) => void;
  thuFilter: string;
  setThuFilter: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  getLop: (id: string) => Lop | undefined;
  setRec: (sid: string, patch: Partial<FeeRecord>) => void;
  setKhoan: (sid: string, key: string, val: number) => void;
  resetKhoan: (sid: string, key: string) => void;
  resetAllKhoan: (sid: string) => void;
  setNgayAnAll: (val: number, ids?: string[]) => void;
  thuDuNhieu: (pairs: { sid: string; thucThu: number }[]) => void;
  addPhuThuHS: (sid: string, ten: string, soTien: number) => void;
  delPhuThuHS: (sid: string, pid: string) => void;
  locked: boolean;
  mData: MonthData;
  upMData: (d: MonthData) => void;
  setPhieuId: (id: string) => void;
  setTab: (id: string) => void;
  isWide: boolean;
}

export function ThuPhiTab({
  rows,
  tk,
  allRows,
  chipsLop,
  lopFilter,
  setLopFilter,
  thuFilter,
  setThuFilter,
  search,
  setSearch,
  openId,
  setOpenId,
  setRec,
  setKhoan,
  resetKhoan,
  resetAllKhoan,
  setNgayAnAll,
  thuDuNhieu,
  addPhuThuHS,
  delPhuThuHS,
  locked,
  mData,
  upMData,
  setPhieuId,
  setTab,
  isWide,
}: ThuPhiTabProps) {
  const [fastMode, setFastMode] = useState(false);
  const [lopSheetOpen, setLopSheetOpen] = useState(false);
  const [thuSheetOpen, setThuSheetOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [showNgayAn, setShowNgayAn] = useState(false);
  const [thuLimit, setThuLimit] = useState(50);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { sentinelRef, shrunk } = useStickyShrink();

  const cnt = { chuaThu: 0, thieu: 0, xong: 0 };
  rows.forEach((r) => {
    if (r.ps.tong > 0 && (r.rec.thucThu || 0) === 0) cnt.chuaThu++;
    else if (r.conNo > 0) cnt.thieu++;
    else if ((r.rec.thucThu || 0) > 0 && r.conNo <= 0) cnt.xong++;
  });

  const batchThuDu = async (onlyNo: boolean) => {
    const pairs = rows
      .filter((r) => !onlyNo || r.conNo > 0)
      .map((r) => ({ sid: r.hs.id, thucThu: r.tongPhaiThu }));
    if (pairs.length === 0) return;
    if (!confirm(`Đánh "thu đủ" cho ${pairs.length} HS đang hiển thị?`)) return;
    thuDuNhieu(pairs);
    alert(onlyNo ? `Đã thu đủ ${pairs.length} HS còn nợ.` : `Đã thu đủ ${pairs.length} HS đang hiển thị.`);
  };

  const cfgItem = {
    width: "100%",
    textAlign: "left" as const,
    padding: "11px 12px",
    borderRadius: 9,
    border: "none",
    background: "none",
    color: C.ink,
    fontWeight: 700,
    fontSize: 13.5,
    fontFamily: font.body,
    cursor: "pointer",
  };

  const selStyle = {
    padding: "9px 10px",
    borderRadius: 9,
    border: `1.5px solid ${C.line}`,
    fontSize: 13,
    fontFamily: font.body,
    color: C.ink,
    background: C.card,
    minWidth: 0,
    cursor: "pointer",
  };

  const pct = tk.ps > 0 ? Math.min(100, Math.round(tk.thu / tk.ps * 100)) : 0;
  const soChuaThu = (tk.noList || []).filter((x) => x.chua).length;

  return (
    <>
      <Card style={{ marginBottom: 12, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, color: C.sub }}>Phải thu (toàn trường)</span>
          <span style={{ fontFamily: font.display, fontWeight: 800, fontSize: 20, color: C.ink }}>
            {tk.ps.toLocaleString("vi-VN")} đ
          </span>
        </div>
        <div style={{ height: 9, borderRadius: 99, background: C.line, overflow: "hidden", margin: "9px 0 5px" }}>
          <div
            style={{
              width: pct + "%",
              height: "100%",
              background: pct >= 100 ? "#2E8F63" : C.pine,
              borderRadius: 99,
              transition: "width .3s",
            }}
          />
        </div>
        <div style={{ fontSize: 12.5, color: "#2E8F63", fontWeight: 700 }}>
          Đã thu {pct}% · {tk.thu.toLocaleString("vi-VN")} đ
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.line}`, fontSize: 12.5 }}>
          <span style={{ color: tk.no > 0 ? C.coral : "#2E8F63", fontWeight: 700 }}>
            ● Còn nợ: {tk.no.toLocaleString("vi-VN")} đ
          </span>
          <button
            onClick={() => setThuFilter(thuFilter === "chuaThu" ? "all" : "chuaThu")}
            style={{
              border: "none",
              background: "none",
              color: thuFilter === "chuaThu" ? C.pine : C.coral,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
              padding: 0,
              textDecoration: thuFilter === "chuaThu" ? "underline" : "none",
            }}
          >
            ● {soChuaThu} chưa thu
          </button>
        </div>
      </Card>

      <div ref={sentinelRef} style={{ height: 1 }} />
      <StickyBar shrunk={shrunk}>
        <SearchBar value={search} onChange={setSearch} />
        {isWide ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <select value={lopFilter} onChange={(e) => setLopFilter(e.target.value)} style={{ ...selStyle, flex: "1 1 110px" }}>
              {chipsLop.map(([id, ten]) => (
                <option key={id} value={id}>{id === "all" ? "Tất cả lớp" : ten}</option>
              ))}
            </select>
            <select value={thuFilter} onChange={(e) => setThuFilter(e.target.value)} style={{ ...selStyle, flex: "1 1 110px" }}>
              {[["all", "Mọi tình trạng"], ["chuaThu", "Chưa thu"], ["thieu", "Thiếu"], ["noCu", "Nợ cũ"], ["thuThua", "Thu thừa"]].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {!locked && !fastMode && (
              <button onClick={() => setCfgOpen((v) => !v)} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 9, border: `1.5px solid ${C.pine}`, cursor: "pointer", fontWeight: 700, fontSize: 12.5, fontFamily: font.body, background: cfgOpen ? C.pine : "#E2F0EB", color: cfgOpen ? "#fff" : C.pine }}>
                ⚙️ Cấu hình
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <button onClick={() => setLopSheetOpen(true)} style={{ ...selStyle, flex: "1 1 110px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {lopFilter === "all" ? "Tất cả lớp" : chipsLop.find((c) => c[0] === lopFilter)?.[1]}
                </span>
                <span style={{ fontSize: 10, color: C.sub, marginLeft: 6 }}>▼</span>
              </button>
              <button onClick={() => setThuSheetOpen(true)} style={{ ...selStyle, flex: "1 1 110px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {thuFilter === "all" ? "Mọi tình trạng" : thuFilter === "chuaThu" ? "Chưa thu" : thuFilter === "thieu" ? "Thiếu" : thuFilter === "noCu" ? "Nợ cũ" : thuFilter === "thuThua" ? "Thu thừa" : "Mọi tình trạng"}
                </span>
                <span style={{ fontSize: 10, color: C.sub, marginLeft: 6 }}>▼</span>
              </button>
              {!locked && !fastMode && (
                <button onClick={() => setCfgOpen((v) => !v)} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 9, border: `1.5px solid ${C.pine}`, cursor: "pointer", fontWeight: 700, fontSize: 12.5, fontFamily: font.body, background: cfgOpen ? C.pine : "#E2F0EB", color: cfgOpen ? "#fff" : C.pine }}>
                  ⚙️ Cấu hình
                </button>
              )}
            </div>
            <LopFilterSheet
              open={lopSheetOpen}
              onClose={() => setLopSheetOpen(false)}
              chipsLop={chipsLop}
              lopFilter={lopFilter}
              setLopFilter={setLopFilter}
              allRows={allRows}
            />
            {thuSheetOpen && (
              <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div onClick={() => setThuSheetOpen(false)} style={{ flex: 1, background: "rgba(0,0,0,.45)" }} />
                <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 24px", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 -4px 24px rgba(0,0,0,.18)" }}>
                  <div style={{ width: 44, height: 5, borderRadius: 99, background: C.line, margin: "0 auto 12px" }} />
                  <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>Tình trạng thu</div>
                  {[["all", "Mọi tình trạng"], ["chuaThu", "Chưa thu"], ["thieu", "Thiếu"], ["noCu", "Nợ cũ"], ["thuThua", "Thu thừa"]].map(([v, l]) => {
                    const active = thuFilter === v;
                    return (
                      <div key={v} onClick={() => { setThuFilter(v); setThuSheetOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 4px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${active ? C.pine : C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {active && <div style={{ width: 12, height: 12, borderRadius: 99, background: C.pine }} />}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: active ? C.pine : C.ink }}>{l}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </StickyBar>

      {!locked && fastMode && (
        <button onClick={() => setFastMode(false)} style={{ width: "100%", marginBottom: 10, padding: "11px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5, fontFamily: font.body, background: C.pine, color: "#fff" }}>
          ⛔ Tắt chế độ Tích thu nhanh
        </button>
      )}
      {!locked && !fastMode && cfgOpen && (
        <Card style={{ marginBottom: 10, padding: 6 }}>
          <button onClick={() => setShowNgayAn((v) => !v)} style={{ ...cfgItem, color: showNgayAn ? C.pine : C.ink }}>
            🍽️ Áp ngày ăn hàng loạt {showNgayAn ? "▲" : "▼"}
          </button>
          {showNgayAn && (
            <div style={{ padding: "2px 2px 6px" }}>
              <NgayAnBar onApply={setNgayAnAll} rows={rows} />
            </div>
          )}
          <button onClick={() => { setFastMode(true); setCfgOpen(false); }} style={cfgItem}>
            ⚡ Bật chế độ Tích thu nhanh
          </button>
          {(() => {
            const soNo = rows.filter((r) => r.conNo > 0).length;
            return (
              <button
                onClick={() => { if (soNo > 0) { batchThuDu(true); setCfgOpen(false); } }}
                disabled={soNo === 0}
                style={{ ...cfgItem, color: soNo > 0 ? "#2E8F63" : "#8A938E", cursor: soNo > 0 ? "pointer" : "default" }}
              >
                💵 Thu đủ {soNo} HS còn nợ đang hiển thị
              </button>
            );
          })()}
        </Card>
      )}

      {locked && (
        <div style={{ background: "#FBF1D8", border: "1px solid #EAD8A0", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 12.5, color: "#7A5E12" }}>
          🔒 Tháng này đã chốt — chỉ xem. Mở khóa ở tab Tổng quan.
        </div>
      )}

      {rows.length === 0 && <EmptyState search={search} onClear={() => { setSearch(""); setLopFilter("all"); setThuFilter("all"); }} />}

      {rows.slice(0, thuLimit).map((r) => {
        const open = openId === r.hs.id;
        if (fastMode) {
          const idx = rows.findIndex((x) => x.hs.id === r.hs.id);
          return (
            <div key={r.hs.id} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, marginBottom: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.hs.ten}</div>
                <div style={{ fontSize: 11.5, color: C.sub }}>
                  cần {r.tongPhaiThu.toLocaleString("vi-VN")}
                  {r.noTruoc > 0 ? ` · 🔴 nợ ${r.noTruoc.toLocaleString("vi-VN")}` : ""}
                </div>
              </div>
              <input
                ref={(el) => (inputRefs.current[r.hs.id] = el)}
                type="text"
                inputMode="numeric"
                defaultValue={r.rec.thucThu ? Number(r.rec.thucThu).toLocaleString("vi-VN") : ""}
                onFocus={(e) => { e.target.value = r.rec.thucThu ? String(r.rec.thucThu) : ""; e.target.select(); }}
                onBlur={(e) => {
                  const d = e.target.value.replace(/[^\d]/g, "");
                  setRec(r.hs.id, { thucThu: d === "" ? 0 : Number(d) });
                  e.target.value = d ? Number(d).toLocaleString("vi-VN") : "";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.target.blur();
                    const next = rows[idx + 1];
                    if (next) setTimeout(() => inputRefs.current[next.hs.id]?.focus(), 30);
                  }
                }}
                placeholder="0"
                style={{ width: 110, padding: "9px 8px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontFamily: font.body, fontSize: 14, color: C.ink, background: "#FAFCFA", textAlign: "right", outline: "none" }}
              />
              <button
                onClick={() => { setRec(r.hs.id, { thucThu: r.tongPhaiThu }); if (inputRefs.current[r.hs.id]) inputRefs.current[r.hs.id].value = Number(r.tongPhaiThu).toLocaleString("vi-VN"); }}
                style={{ background: "#2E8F63", color: "#fff", border: "none", borderRadius: 8, width: 40, height: 40, fontSize: 16, cursor: "pointer", flexShrink: 0 }}
              >
                ✓
              </button>
            </div>
          );
        }
        return (
          <div key={r.hs.id} style={{ background: C.card, borderRadius: 16, border: `1px solid ${open ? C.pine : C.line}`, marginBottom: 10, overflow: "hidden" }}>
            <div onClick={() => setOpenId(open ? null : r.hs.id)} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: r.hs.nguoiThu === "B" ? "#F2EAFA" : "#E7F0FB", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontWeight: 700, fontSize: 13, color: r.hs.nguoiThu === "B" ? "#8A56B8" : "#2F6FBF" }}>
                  {r.hs.nguoiThu}
                </div>
                {r.noTruoc > 0 && (
                  <div title="có nợ tháng trước" style={{ position: "absolute", top: -3, right: -3, width: 11, height: 11, borderRadius: 99, background: C.coral, border: "2px solid #fff" }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>
                  {r.hs.ten}
                  {r.ps.suaCount > 0 && <span title="có khoản đã sửa" style={{ color: "#A8731B", fontSize: 12 }}> ⚠</span>}
                </div>
                <div style={{ fontSize: 11.5, color: C.sub, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 1 }}>
                  <span>{r.lop?.ten}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: "#EEF1EE", color: "#8A938E" }}>{r.hs.pl}</span>
                  {r.nghi > 0 ? <span>· nghỉ {r.nghi}</span> : null}
                </div>
                {r.noTruoc !== 0 && (
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 1, color: r.noTruoc > 0 ? C.coral : "#2E8F63" }}>
                    {r.noTruoc > 0 ? `🔴 Nợ cũ ${r.noTruoc.toLocaleString("vi-VN")}` : `🟢 Dư cũ ${(-r.noTruoc).toLocaleString("vi-VN")}`}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 16, color: C.ink }}>
                    {r.tongPhaiThu.toLocaleString("vi-VN")}
                  </div>
                  {r.st && <Badge s={r.st} />}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setPhieuId(r.hs.id); setTab("phieu"); }}
                  title="Xem phiếu thu"
                  style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", padding: 2 }}
                >
                  🧾
                </button>
              </div>
            </div>
            {open && (
              <HSCardDetail
                r={r}
                locked={locked}
                setRec={setRec}
                setKhoan={setKhoan}
                resetKhoan={resetKhoan}
                resetAllKhoan={resetAllKhoan}
                addPhuThuHS={addPhuThuHS}
                delPhuThuHS={delPhuThuHS}
                setPhieuId={setPhieuId}
                setTab={setTab}
              />
            )}
          </div>
        );
      })}

      {rows.length > thuLimit && (
        <button
          onClick={() => setThuLimit((l) => l + 50)}
          style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1.5px solid ${C.pine}`, background: "#E2F0EB", color: C.pine, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 10 }}
        >
          Hiện thêm 50 HS ({Math.min(thuLimit, rows.length)}/{rows.length})
        </button>
      )}

      <ThuNgoai mData={mData} upMData={upMData} locked={locked} />
      <KhoanThuLop mData={mData} upMData={upMData} locked={locked} classes={chipsLop.slice(1).map(([id, ten]) => ({ id, ten }))} rows={rows} lopFilter={lopFilter} />
    </>
  );
}
