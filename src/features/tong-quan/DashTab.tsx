import { useEffect, useState } from "react";
import { Card } from "../../components/ui";
import { C, font } from "../../constants/colors";
import { Donut } from "./Donut";
import { sList, sGet } from "../../services/storage";
import { ymKey } from "../../utils/format";
import { tinhPSFromRec } from "../../utils/finance";
import { lopOfMonth } from "../../utils/lop"; // Giả sử bạn có helper này hoặc copy từ app gốc
import type { Meta, MonthData, HocSinh, Lop } from "../../types";

/* ================================================================
   Helper: lopOfMonth — NẾU BẠN CHƯA TÁCH RA UTILS, 
   COPY HÀM NÀY TỪ APP GỐC VÀO FILE utils/lop.ts
   ================================================================ */
// function lopOfMonth(hs: HocSinh, ym: string): string | null {
//   const hist = (hs.lopHistory || []).filter((h) => h.tuThang <= ym).sort((a, b) => a.tuThang.localeCompare(b.tuThang));
//   return hist.length ? hist[hist.length - 1].lop : null;
// }

interface DashRow {
  hs: HocSinh;
  rec: any;
  lop?: Lop;
  ps: { tong: number; suaCount?: number };
  conNo: number;
  coRec: boolean;
  tongPhaiThu: number;
}

interface DashTabProps {
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
    noList: any[];
    noAB_AtoB: number;
    noAB_BtoA: number;
  };
  mData: MonthData;
  upMData: (d: MonthData) => void;
  month: number;
  year: number;
  locked: boolean;
  meta: Meta;
  allRows: DashRow[];
  delThang: () => void;
  students: HocSinh[];
  ym: string;
  upMeta: (m: Meta) => void;
  setTab: (id: string) => void;
}

export function DashTab({ tk, mData, upMData, month, year, locked, meta, allRows, delThang, students, ym, upMeta, setTab }: DashTabProps) {
  // [COLLAPSE] Trang thai dong/mo cac khoi
  const [openCards, setOpenCards] = useState<Record<string, boolean>>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("dashOpenCards") : null;
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return { vanHanh: true, kd: true, tienMat: false, loiNhuan: false, lichSu: false, chiPhi: true };
  });
  const toggleCard = (key: string) => {
    setOpenCards((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("dashOpenCards", JSON.stringify(next));
      return next;
    });
  };

  // [DELETE PROTECT]
  const [showDelConfirm, setShowDelConfirm] = useState(false);
  const [delConfirmText, setDelConfirmText] = useState("");

  // [TOP NO]
  const [topNoLimit, setTopNoLimit] = useState(3);

  // [DU NO] Luy ke + lich su
  const [luyKe, setLuyKe] = useState<{ giuA: number; giuB: number; noNCC: number } | null>(null);
  const [lichSu, setLichSu] = useState<any[] | null>(null);

  // Bottom sheets
  const [sheetCB, setSheetCB] = useState(false);
  const [sheetCP, setSheetCP] = useState(false);
  const [sheetLN, setSheetLN] = useState(false);
  const [sheetLS, setSheetLS] = useState(false);

  useEffect(() => {
    let huy = false;
    (async () => {
      const dk = meta?.soDuDauKy || {};
      let giuA = dk.tienMatA || 0, giuB = dk.tienMatB || 0;
      let noNCC = 0;
      const keys = (await sList("mn5:thang:")).filter((k) => /mn5:thang:\d{4}-\d{2}$/.test(k)).map((k) => k.replace("mn5:thang:", "")).filter((m) => m <= ym).sort();
      const ls: any[] = [];
      for (const m of keys) {
        const td = await sGet(`mn5:thang:${m}`); if (!td) continue;
        const my = Number(m.slice(0, 4)), mmo = Number(m.slice(5));
        const pmo = mmo === 1 ? 12 : mmo - 1, pyy = mmo === 1 ? my - 1 : my;
        const ddPrevM = (await sGet(`mn5:dd:${ymKey(pyy, pmo)}`)) || {};
        let thuA = 0, thuB = 0, chiA = 0, chiB = 0, traA = 0, traB = 0, psA = 0, psB = 0;
        let thangNoNCC = 0;
        Object.entries(td.fees || {}).forEach(([sid, rec]: [string, any]) => {
          const hs = students.find((s) => s.id === sid); if (!hs) return;
          const tt = Number(rec.thucThu) || 0;
          if (hs.nguoiThu === "A") thuA += tt; else if (hs.nguoiThu === "B") thuB += tt;
          const lop = meta.classes.find((c) => c.id === lopOfMonth(hs, m));
          const nghi = Object.keys(ddPrevM[sid] || {}).length;
          const ps = tinhPSFromRec(hs, rec, lop, nghi).tong;
          if (hs.nguoiThu === "A") psA += ps; else if (hs.nguoiThu === "B") psB += ps;
        });
        (td.thuNgoai || []).forEach((k: any) => {
          const tt = Number(k.thucThu) || 0, st = Number(k.soTien) || 0;
          if (k.nguoiThu === "A") { thuA += tt; psA += st; } else if (k.nguoiThu === "B") { thuB += tt; psB += st; }
        });
        (td.chiPhi || []).forEach((c: any) => {
          const e = Number(c.soTien) || 0, kk = Number(c.daTra) || 0;
          if (c.loai === "CHUYEN") { if (c.huong === "A->B") { thuA -= e; thuB += e; } else { thuB -= e; thuA += e; } return; }
          if (c.loai === "NO_AB") return;
          if (c.nguoiChi === "A") { chiA += e; traA += kk; } else { chiB += e; traB += kk; }
          thangNoNCC += (e - kk);
        });
        noNCC += thangNoNCC;
        giuA += thuA - traA; giuB += thuB - traB;
        const [yy, mm] = m.split("-");
        const psThang = psA + psB, chiThang = chiA + chiB, thuThang = thuA + thuB, traThang = traA + traB;
        ls.push({
          thang: `T${Number(mm)}/${yy}`, mm: Number(mm), yy: Number(yy),
          laiKeToan: psThang - chiThang, laiTienMat: thuThang - traThang,
          psThang, chiThang, thuThang, traThang, noNCC,
          thuA, thuB, traA, traB, chiA, chiB,
          giuACum: giuA, giuBCum: giuB, deltaA: thuA - traA, deltaB: thuB - traB
        });
      }
      if (!huy) { setLuyKe({ giuA, giuB, noNCC }); setLichSu(ls); }
    })();
    return () => { huy = true; };
  }, [meta, students, ym, mData]);

  const cp = mData.chiPhi || [];
  const [nd, setNd] = useState(""); const [so, setSo] = useState(""); const [ng, setNg] = useState<"A" | "B">("A");
  const [loai, setLoai] = useState("PHAT_SINH"); const [huong, setHuong] = useState("A->B");
  const [showCoDinh, setShowCoDinh] = useState(true);

  const add = () => {
    if (loai === "TRA_NO") {
      if (!nd.trim()) return;
      upMData({ ...mData, chiPhi: [...cp, { id: crypto.randomUUID(), noiDung: nd.trim(), soTien: 0, nguoiChi: ng, daTra: Number(so) || 0, loai: "TRA_NO" }] });
      setNd(""); setSo(""); return;
    }
    if (!so) return;
    if (loai === "CHUYEN") {
      upMData({ ...mData, chiPhi: [...cp, { id: crypto.randomUUID(), noiDung: nd.trim() || "Chuyển tiền", soTien: Number(so), loai: "CHUYEN", huong, daTra: 0 }] });
      setNd(""); setSo(""); return;
    }
    if (!nd.trim()) return;
    const item: any = { id: crypto.randomUUID(), noiDung: nd.trim(), soTien: Number(so), nguoiChi: ng, daTra: 0, loai };
    if (loai === "NO_AB") item.huong = huong;
    upMData({ ...mData, chiPhi: [...cp, item] });
    setNd(""); setSo("");
  };

  const setCP = (id: string, p: any) => upMData({ ...mData, chiPhi: cp.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const delCP = (id: string) => upMData({ ...mData, chiPhi: cp.filter((c) => c.id !== id) });

  const traDuTatCa = async () => {
    const targets = cp.filter((c: any) => (c.loai === "CO_DINH" || c.loai === "PHAT_SINH") && (Number(c.soTien) || 0) > 0 && (Number(c.daTra) || 0) < (Number(c.soTien) || 0));
    if (targets.length === 0) { alert("Không còn khoản nào cần trả đủ."); return; }
    if (!confirm(`Đánh "đã trả đủ" cho ${targets.length} khoản đang còn thiếu?`)) return;
    const ids = new Set(targets.map((c: any) => c.id));
    upMData({ ...mData, chiPhi: cp.map((c: any) => ids.has(c.id) ? { ...c, daTra: Number(c.soTien) || 0 } : c) });
    alert(`Đã đánh trả đủ ${targets.length} khoản.`);
  };

  const themCoDinhMau = () => {
    const co = ["Lương giáo viên", "Thực phẩm 1", "Thực phẩm 2", "Tiền điện", "Tiền nước"].filter((t) => !cp.some((c: any) => c.noiDung === t && c.loai === "CO_DINH"));
    if (!co.length) { setShowCoDinh((v) => !v); return; }
    upMData({ ...mData, chiPhi: [...cp, ...co.map((t) => ({ id: crypto.randomUUID(), noiDung: t, soTien: 0, nguoiChi: "A", loai: "CO_DINH", daTra: 0 }))] });
    alert(`Đã thêm ${co.length} khoản cố định.`);
    setShowCoDinh(true);
  };

  const tongChi = tk.chiA + tk.chiB, tongTra = tk.traA + tk.traB;
  const lnKeToan = tk.ps - tongChi;
  const lnTienMat = tk.thu - tongTra;
  const tyLeA = meta?.tyLeLaiA ?? 50;
  const noAB = tk.noAB_AtoB - tk.noAB_BtoA;
  const noNCC = tongChi - tongTra;
  const tongTienMat = (luyKe ? luyKe.giuA + luyKe.giuB : (tk.A - tk.traA) + (tk.B - tk.traB));
  const giuThangA = tk.A - tk.traA, giuThangB = tk.B - tk.traB;

  const chotThang = async () => {
    const chuaThu = allRows.filter((r) => r.coRec && r.ps.tong > 0 && (r.rec?.thucThu || 0) === 0).length;
    const ngayAn0 = allRows.filter((r) => r.coRec && r.hs.pl !== "GV" && r.hs.pl !== "T7" && (r.rec?.ngayAn || 0) === 0).length;
    let cb = [];
    if (ngayAn0) cb.push(`• ${ngayAn0} HS có ngày ăn = 0`);
    if (chuaThu) cb.push(`• ${chuaThu} HS chưa thu`);
    const msg = `Chốt tháng ${month}/${year}?\n` + (cb.length ? "\nLưu ý:\n" + cb.join("\n") + "\n" : "") + "\nSau khi chốt sẽ khóa (mở lại được).";
    if (confirm(msg)) {
      const noLuyKe: Record<string, number> = {};
      allRows.forEach((r) => { if (r.coRec) noLuyKe[r.hs.id] = r.conNo; });
      upMData({ ...mData, daChot: true, noLuyKe });
      alert("Đã chốt tháng.");
    }
  };

  const moChot = async () => {
    if (confirm("Mở khóa tháng đã chốt để chỉnh sửa lại?")) {
      const { noLuyKe, ...rest } = mData;
      upMData({ ...rest, daChot: false });
      alert("Đã mở khóa.");
    }
  };

  const recRows0 = allRows.filter((r) => r.coRec);
  const dashTong = students.length;
  const dashDangHoc = students.filter((s) => s.trangThai === "Đang học").length;
  const canThuAll = recRows0.reduce((a, r) => a + r.tongPhaiThu, 0);
  const daThuAll = recRows0.reduce((a, r) => a + (r.rec?.thucThu || 0), 0);
  const tyLeThu = canThuAll > 0 ? Math.round(daThuAll / canThuAll * 100) : 100;
  const noRows = recRows0.filter((r) => r.conNo > 0);
  const conNoAll = noRows.reduce((a, r) => a + r.conNo, 0);

  const cpKhoan = cp.filter((c: any) => c.loai === "CO_DINH" || c.loai === "PHAT_SINH");
  const cpXong = (c: any) => (Number(c.soTien) || 0) > 0 && (Number(c.daTra) || 0) >= (Number(c.soTien) || 0);
  const cpDone = cpKhoan.filter(cpXong);
  const cpChua = cpKhoan.filter((c) => !cpXong(c));
  const cpPct = cpKhoan.length > 0 ? Math.round(cpDone.length / cpKhoan.length * 100) : 0;

  const cbGroups = [
    ["Học phí/khoản sửa tay", recRows0.filter((r) => (r.ps.suaCount || 0) > 0), "#A8731B"],
    ["Thu thừa", recRows0.filter((r) => r.conNo < 0), "#2F6FBF"],
    ["Ngày ăn = 0", recRows0.filter((r) => r.hs.pl !== "GV" && r.hs.pl !== "T7" && (r.rec?.ngayAn || 0) === 0), C.coral],
  ].filter((g) => (g[1] as any[]).length > 0);

  const sheetTitle = { fontFamily: font.display, fontWeight: 700, fontSize: 14.5, color: C.ink, margin: "14px 0 8px" };
  const drillBtn = { background: C.pine, color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer" };

  return (
    <>
      {/* ===== KHỐI 2: THẺ VẬN HÀNH & DOANH THU ===== */}
      <Card style={{ marginBottom: 12, boxShadow: "0 3px 12px -8px rgba(23,107,91,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, color: C.ink }}>Tổng quan vận hành — T{month}/{year}</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Donut pct={tyLeThu} color={tyLeThu >= 80 ? "#2E8F63" : tyLeThu >= 50 ? "#A8731B" : C.coral} size={66} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 18, marginBottom: 8 }}>
              <div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 19, color: C.ink }}>{dashTong}</div><div style={{ fontSize: 10.5, color: C.sub }}>Tổng HS</div></div>
              <div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 19, color: "#2E8F63" }}>{dashDangHoc}</div><div style={{ fontSize: 10.5, color: C.sub }}>Đang học</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "1px 0" }}><span style={{ color: C.sub }}>Cần thu</span><b>{canThuAll.toLocaleString("vi-VN")}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "1px 0" }}><span style={{ color: C.sub }}>Đã thu ({tyLeThu}%)</span><b style={{ color: "#2E8F63" }}>{daThuAll.toLocaleString("vi-VN")}</b></div>
          </div>
        </div>
        {noRows.length > 0 && (
          <button onClick={() => setTab && setTab("no")} style={{ width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 9, border: "1px solid #EFC9BF", background: "#FBEAE5", color: C.coral, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
            🔴 {noRows.length} HS còn nợ — {conNoAll.toLocaleString("vi-VN")} đ ❯
          </button>
        )}
      </Card>

      {/* ===== KHỐI 3: THANH CẢNH BÁO ===== */}
      {cbGroups.length > 0 && (
        <button onClick={() => setSheetCB(true)} style={{ width: "100%", textAlign: "left", marginBottom: 12, padding: "10px 14px", borderRadius: 12, border: "1px solid #EAD8A0", background: "#FBF1DC", color: "#7A5E12", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🚨 Cảnh báo: {cbGroups.map((g) => `${g[0]} (${(g[1] as any[]).length})`).join(" · ")}</span>
          <span style={{ flexShrink: 0, fontWeight: 700 }}>❯</span>
        </button>
      )}

      {/* ===== KHỐI 4: THẺ CHI PHÍ CHECKLIST ===== */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>💸</span><span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>Chi phí tháng {month}</span></div>
          <span style={{ fontSize: 12, color: C.sub }}>Tổng chi: <b style={{ color: C.ink }}>{tongChi.toLocaleString("vi-VN")}</b></span>
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 6 }}>📊 {cpDone.length}/{cpKhoan.length} khoản đã xử lý</div>
        <div style={{ height: 8, borderRadius: 99, background: C.line, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: cpPct + "%", height: "100%", background: cpPct >= 100 ? "#2E8F63" : C.pine, borderRadius: 99, transition: "width .3s" }} />
        </div>
        {cpChua.slice(0, 2).map((c: any) => (
          <div key={c.id} style={{ fontSize: 13, color: C.ink, padding: "3px 0" }}>🔴 {c.noiDung}: <span style={{ color: C.coral, fontWeight: 600 }}>{(Number(c.daTra) || 0) > 0 ? "Trả 1 phần" : "Chưa trả"}</span></div>
        ))}
        {cpKhoan.length > 0 && cpChua.length === 0 && <div style={{ fontSize: 13, color: "#2E8F63", fontWeight: 600, padding: "3px 0" }}>✓ Đã xử lý hết các khoản chi</div>}
        {cpKhoan.length === 0 && <div style={{ fontSize: 13, color: C.sub, padding: "3px 0" }}>Chưa có khoản chi nào — bấm Quản lý để thêm.</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={() => setSheetCP(true)} style={drillBtn}>Quản lý ❯</button>
        </div>
      </Card>

      {/* ===== KHỐI 5: THẺ LỢI NHUẬN & CHIA QUỸ ===== */}
      <Card style={{ marginBottom: 12, background: "#E4F3EA", borderColor: "#BFE3CC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 16 }}>🤝</span><span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>Lợi nhuận & chia quỹ</span></div>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: C.card, borderRadius: 10 }}><div style={{ fontSize: 10.5, color: "#2E8F63", fontWeight: 600 }}>LN kế toán</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: lnKeToan < 0 ? C.coral : "#2E8F63" }}>{lnKeToan.toLocaleString("vi-VN")}</div></div>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: C.card, borderRadius: 10 }}><div style={{ fontSize: 10.5, color: "#2F6FBF", fontWeight: 600 }}>LN tiền mặt</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: lnTienMat < 0 ? C.coral : "#2F6FBF" }}>{lnTienMat.toLocaleString("vi-VN")}</div></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: C.card, borderRadius: 10 }}><div style={{ fontSize: 10.5, color: "#2F6FBF", fontWeight: 600 }}>Quỹ A giữ</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: (luyKe?.giuA ?? 0) < 0 ? C.coral : "#2F6FBF" }}>{luyKe ? luyKe.giuA.toLocaleString("vi-VN") : "…"}</div></div>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: C.card, borderRadius: 10 }}><div style={{ fontSize: 10.5, color: "#8A56B8", fontWeight: 600 }}>Quỹ B giữ</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: (luyKe?.giuB ?? 0) < 0 ? C.coral : "#8A56B8" }}>{luyKe ? luyKe.giuB.toLocaleString("vi-VN") : "…"}</div></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={() => setSheetLN(true)} style={drillBtn}>Chi tiết ❯</button>
        </div>
      </Card>

      {/* ===== KHỐI 6: LỊCH SỬ ===== */}
      <button onClick={() => setSheetLS(true)} style={{ width: "100%", textAlign: "left", marginBottom: 12, padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, color: C.ink, fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>📈 Lịch sử các tháng trước</span><span style={{ color: C.sub, fontWeight: 700 }}>❯</span>
      </button>

      {/* ===== CHỐT THÁNG / XÓA ===== */}
      {!locked
        ? <button onClick={chotThang} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "1.5px solid #C99A2E", background: "#FBF1D8", color: "#7A5E12", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>🔒 Chốt tháng {month}/{year}</button>
        : <button onClick={moChot} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.card, color: C.sub, fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>🔓 Mở khóa tháng {month}/{year}</button>}
      {!locked && (
        <div style={{ marginTop: 8 }}>
          {!showDelConfirm ? (
            <button onClick={() => setShowDelConfirm(true)} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "1.5px solid #FBEAE5", background: C.card, color: C.coral, fontFamily: font.body, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>🗑 Xóa bảng thu tháng này (tạo lại)</button>
          ) : (
            <div style={{ background: "#FBEAE5", borderRadius: 12, padding: 12, border: `1.5px solid ${C.coral}` }}>
              <div style={{ fontSize: 13, color: C.coral, fontWeight: 700, marginBottom: 8 }}>⚠️ Nhập "XOA" để xác nhận xóa bảng thu tháng {month}/{year}</div>
              <input value={delConfirmText} onChange={(e) => setDelConfirmText(e.target.value)} placeholder="Nhập XOA" style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 8, textAlign: "center", fontWeight: 700, textTransform: "uppercase" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowDelConfirm(false); setDelConfirmText(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${C.line}`, background: C.card, color: C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Hủy</button>
                <button onClick={() => { if (delConfirmText.trim().toUpperCase() === "XOA") { delThang(); setShowDelConfirm(false); setDelConfirmText(""); } else { alert("Nhập sai — gõ XOA để xác nhận"); } }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: delConfirmText.trim().toUpperCase() === "XOA" ? C.coral : "#EEF1EE", color: "#fff", fontWeight: 700, fontSize: 13, cursor: delConfirmText.trim().toUpperCase() === "XOA" ? "pointer" : "default" }}>🗑 Xóa</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ BOTTOM SHEETS ============ */}
      {/* Sheet cảnh báo */}
      {sheetCB && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setSheetCB(false)} style={{ flex: 1, background: "rgba(0,0,0,.45)" }} />
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 24px", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 -4px 24px rgba(0,0,0,.18)" }}>
            <div style={{ width: 44, height: 5, borderRadius: 99, background: C.line, margin: "0 auto 12px" }} />
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>Cảnh báo bất thường — T{month}/{year}</div>
            {cbGroups.length === 0 ? <div style={{ color: "#2E8F63", fontSize: 14, padding: 10 }}>✓ Không có bất thường.</div> : cbGroups.map((g) => (
              <div key={g[0]} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: g[2], marginBottom: 4 }}>{g[0]} ({(g[1] as any[]).length})</div>
                {(g[1] as any[]).map((r) => (
                  <div key={r.hs.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span>{r.hs.ten} <span style={{ color: C.sub, fontSize: 11 }}>· {r.lop?.ten}</span></span>
                  </div>
                ))}
              </div>
            ))}
            <button onClick={() => setSheetCB(false)} style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 11, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>✓ Hoàn thành</button>
          </div>
        </div>
      )}

      {/* Sheet chi phí */}
      {sheetCP && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setSheetCP(false)} style={{ flex: 1, background: "rgba(0,0,0,.45)" }} />
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 24px", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 -4px 24px rgba(0,0,0,.18)" }}>
            <div style={{ width: 44, height: 5, borderRadius: 99, background: C.line, margin: "0 auto 12px" }} />
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>Chi tiết chi phí — T{month}/{year}</div>
            <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: C.sub, marginBottom: 10, flexWrap: "wrap" }}>
              <span>Tổng chi <b style={{ color: C.ink }}>{tongChi.toLocaleString("vi-VN")}</b></span>
              <span>Đã trả <b style={{ color: "#2E8F63" }}>{tongTra.toLocaleString("vi-VN")}</b></span>
              <span>Nợ NCC <b style={{ color: noNCC > 0 ? C.coral : "#2E8F63" }}>{noNCC.toLocaleString("vi-VN")}</b></span>
              {!locked && <button onClick={themCoDinhMau} style={{ marginLeft: "auto", background: "#E2F0EB", color: C.pine, border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{cp.filter((c: any) => c.loai === "CO_DINH").length === 5 ? (showCoDinh ? "Ẩn" : "Hiện") + " 5 cố định" : "+ 5 khoản cố định"}</button>}
            </div>
            {!locked && (
              <button onClick={traDuTatCa} style={{ width: "100%", marginBottom: 10, padding: "9px 0", borderRadius: 9, border: "1.5px solid #2E8F63", background: "#E4F3EA", color: "#2E8F63", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>✓ Trả đủ tất cả khoản còn thiếu</button>
            )}
            {cp.map((c: any) => {
              const e = Number(c.soTien) || 0, k = Number(c.daTra) || 0;
              const isNoAB = c.loai === "NO_AB"; const isCT = c.loai === "CHUYEN";
              if (c.loai === "TRA_NO") return (
                <div key={c.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
                  <div style={{ fontWeight: 600 }}>💰 Trả nợ NCC · <b style={{ color: c.nguoiChi === "A" ? "#2F6FBF" : "#8A56B8" }}>[{c.nguoiChi}]</b> {c.noiDung} · {k.toLocaleString("vi-VN")} đ</div>
                  {!locked && <button onClick={() => delCP(c.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", padding: 4 }}>🗑</button>}
                </div>
              );
              if (isCT) return (
                <div key={c.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
                  <div style={{ fontWeight: 600 }}>🔄 Chuyển tiền <b style={{ color: c.huong === "A->B" ? "#2F6FBF" : "#8A56B8" }}>{c.huong === "A->B" ? "A → B" : "B → A"}</b> · {e.toLocaleString("vi-VN")} đ</div>
                  {!locked && <button onClick={() => delCP(c.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", padding: 4 }}>🗑</button>}
                </div>
              );
              const st = k === 0 ? { t: "Chưa trả", c: C.coral, bg: "#FBEAE5" } : k < e ? { t: "Trả 1 phần", c: "#A8731B", bg: "#FBF1DC" } : { t: "Đã trả", c: "#2E8F63", bg: "#E4F3EA" };
              return (
                <div key={c.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {!isNoAB && <span style={{ color: c.nguoiChi === "A" ? "#2F6FBF" : "#8A56B8", fontWeight: 800 }}>[{c.nguoiChi}]</span>} {c.noiDung}
                      {isNoAB && <span style={{ color: "#C99A2E", fontSize: 11, fontWeight: 700 }}> · NỢ {c.huong}</span>}
                      {c.loai === "CO_DINH" && <span style={{ color: C.sub, fontSize: 11 }}> · cố định</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, background: st.bg, color: st.c, whiteSpace: "nowrap" }}>{st.t}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, color: C.sub }}>
                      <span style={{ minWidth: 52 }}>Phải trả</span>
                      {c.loai === "CO_DINH" && !locked
                        ? (<><input type="number" value={c.soTien} onChange={(e) => setCP(c.id, { soTien: Number(e.target.value) })} style={{ width: 120, padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 13 }} /><button onClick={() => setCP(c.id, { nguoiChi: c.nguoiChi === "A" ? "B" : "A" })} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: "none", cursor: "pointer", background: c.nguoiChi === "A" ? "#E7F0FB" : "#F2EAFA", color: c.nguoiChi === "A" ? "#2F6FBF" : "#8A56B8", fontWeight: 700 }}>{c.nguoiChi}</button></>)
                        : (<b style={{ color: C.ink }}>{e.toLocaleString("vi-VN")}</b>)
                      }
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, color: C.sub }}>
                      <span style={{ minWidth: 52 }}>Đã trả</span>
                      <input type="number" value={c.daTra} onChange={(e) => setCP(c.id, { daTra: Number(e.target.value) })} style={{ width: 120, padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 13 }} disabled={locked} />
                      {!locked && <button onClick={() => setCP(c.id, { daTra: e })} style={{ background: "#E4F3EA", color: "#2E8F63", fontWeight: 700, fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer" }}>Trả đủ</button>}
                      {!locked && <button onClick={() => delCP(c.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", marginLeft: "auto", padding: 4 }}>🗑</button>}
                    </div>
                    {k > e && <div style={{ fontSize: 11.5, color: "#A8731B", background: "#FBF1DC", borderRadius: 7, padding: "4px 8px" }}>⚠️ Đã trả nhiều hơn phải trả {(k - e).toLocaleString("vi-VN")} đ</div>}
                  </div>
                </div>
              );
            })}
            {!locked && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  <input value={nd} onChange={(e) => setNd(e.target.value)} placeholder={loai === "TRA_NO" ? "Tên nợ (VD: Thực phẩm T4)" : "Khoản chi"} style={{ flex: "2 1 150px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, minWidth: 0, fontFamily: font.body }} />
                  {loai !== "TRA_NO" && <input type="number" value={so} onChange={(e) => setSo(e.target.value)} placeholder="Số tiền" style={{ flex: "1 1 90px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, minWidth: 0, fontFamily: font.body }} />}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={loai} onChange={(e) => { setLoai(e.target.value); if (e.target.value === "TRA_NO") { setSo("0"); } }} style={{ padding: "8px 8px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 12.5, fontFamily: font.body, background: "#fff" }}>
                    {["PHAT_SINH", "CO_DINH", "NO_AB", "CHUYEN", "TRA_NO"].map((l) => <option key={l} value={l}>{l === "PHAT_SINH" ? "Phát sinh" : l === "CO_DINH" ? "Cố định" : l === "NO_AB" ? "Nợ A↔B" : l === "TRA_NO" ? "💰 Trả nợ NCC" : "🔄 Chuyển tiền"}</option>)}
                  </select>
                  {(loai === "NO_AB" || loai === "CHUYEN") ? <select value={huong} onChange={(e) => setHuong(e.target.value)} style={{ padding: "8px 8px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 12.5, fontFamily: font.body, background: "#fff" }}><option value="A->B">A → B</option><option value="B->A">B → A</option></select> : <button onClick={() => setNg(ng === "A" ? "B" : "A")} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: ng === "A" ? "#E7F0FB" : "#F2EAFA", color: ng === "A" ? "#2F6FBF" : "#8A56B8", fontWeight: 700 }}>{ng}</button>}
                  <button onClick={() => { if (loai === "TRA_NO" && !nd.trim()) { alert("Nhập tên nợ cần trả"); return; } add(); }} style={{ background: C.pine, color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 16px", borderRadius: 9, border: "none", cursor: "pointer", marginLeft: "auto" }}>+ Thêm</button>
                </div>
              </div>
            )}
            {locked && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 10, textAlign: "center" }}>🔒 Tháng đã chốt — chỉ xem.</div>}
            <button onClick={() => setSheetCP(false)} style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 11, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>✓ Hoàn thành</button>
          </div>
        </div>
      )}

      {/* Sheet lợi nhuận */}
      {sheetLN && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setSheetLN(false)} style={{ flex: 1, background: "rgba(0,0,0,.45)" }} />
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 24px", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 -4px 24px rgba(0,0,0,.18)" }}>
            <div style={{ width: 44, height: 5, borderRadius: 99, background: C.line, margin: "0 auto 12px" }} />
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>Lợi nhuận & chia quỹ — T{month}/{year}</div>
            {/* Thực thu A/B */}
            <div style={{ background: "#FAFCFA", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>🧾 Doanh thu (thực thu)</span>
                <b style={{ fontFamily: font.display, fontSize: 17, color: C.ink }}>{tk.thu.toLocaleString("vi-VN")} đ</b>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12.5 }}>
                <span style={{ flex: 1 }}>A thu: <b style={{ color: "#2F6FBF" }}>{tk.A.toLocaleString("vi-VN")}</b></span>
                <span style={{ flex: 1 }}>B thu: <b style={{ color: "#8A56B8" }}>{tk.B.toLocaleString("vi-VN")}</b></span>
              </div>
            </div>
            {/* Đã chi A/B */}
            <div style={{ background: "#FAFCFA", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>💸 Đã chi (tiền mặt ra)</span>
                <b style={{ fontFamily: font.display, fontSize: 17, color: C.ink }}>{tongTra.toLocaleString("vi-VN")} đ</b>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12.5 }}>
                <span style={{ flex: 1 }}>A chi: <b style={{ color: "#2F6FBF" }}>{tk.traA.toLocaleString("vi-VN")}</b></span>
                <span style={{ flex: 1 }}>B chi: <b style={{ color: "#8A56B8" }}>{tk.traB.toLocaleString("vi-VN")}</b></span>
              </div>
            </div>
            {/* LN kế toán / tiền mặt */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, textAlign: "center", padding: "9px 4px", background: "#E4F3EA", borderRadius: 10 }}><div style={{ fontSize: 11, color: "#2E8F63", fontWeight: 600 }}>LN kế toán</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 16, color: lnKeToan < 0 ? C.coral : "#2E8F63" }}>{lnKeToan.toLocaleString("vi-VN")}</div><div style={{ fontSize: 9.5, color: C.sub }}>Phải thu − Chi phí</div></div>
              <div style={{ flex: 1, textAlign: "center", padding: "9px 4px", background: "#E7F0FB", borderRadius: 10 }}><div style={{ fontSize: 11, color: "#2F6FBF", fontWeight: 600 }}>LN tiền mặt</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 16, color: lnTienMat < 0 ? C.coral : "#2F6FBF" }}>{lnTienMat.toLocaleString("vi-VN")}</div><div style={{ fontSize: 9.5, color: C.sub }}>Đã thu − Đã trả</div></div>
            </div>
            {/* Phân chia tài chính */}
            <div style={sheetTitle}>📊 Phân chia tài chính T{month}</div>
            <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 8 }}>Tổng LN kế toán toàn trường: <b style={{ color: lnKeToan < 0 ? C.coral : "#2E8F63", fontSize: 14 }}>{lnKeToan.toLocaleString("vi-VN")} đ</b></div>
            {!locked && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#FBF1D8", borderRadius: 10, padding: "8px 10px" }}>
                <span style={{ fontSize: 12, color: "#7A5E12", fontWeight: 600 }}>Tỷ lệ chia</span>
                <button onClick={() => upMeta({ ...meta, tyLeLaiA: Math.max(0, tyLeA - 5) })} style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink, fontWeight: 800, fontSize: 17, cursor: "pointer", lineHeight: 1 }}>−</button>
                <span style={{ minWidth: 92, textAlign: "center", fontSize: 13, fontWeight: 700 }}>A {tyLeA}% / B {100 - tyLeA}%</span>
                <button onClick={() => upMeta({ ...meta, tyLeLaiA: Math.min(100, tyLeA + 5) })} style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink, fontWeight: 800, fontSize: 17, cursor: "pointer", lineHeight: 1 }}>+</button>
              </div>
            )}
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ display: "flex", background: "#FAFCFA", fontSize: 11.5, color: C.sub, fontWeight: 700, padding: "7px 10px" }}>
                <span style={{ flex: 1.5 }}>Nội dung</span>
                <span style={{ flex: 1, textAlign: "right", color: "#2F6FBF" }}>Người A</span>
                <span style={{ flex: 1, textAlign: "right", color: "#8A56B8" }}>Người B</span>
              </div>
              <div style={{ display: "flex", fontSize: 12.5, padding: "8px 10px", borderTop: `1px solid ${C.line}` }}>
                <span style={{ flex: 1.5 }}>💰 Lãi được chia</span>
                <b style={{ flex: 1, textAlign: "right", color: "#2F6FBF" }}>{Math.round(lnKeToan * tyLeA / 100).toLocaleString("vi-VN")}</b>
                <b style={{ flex: 1, textAlign: "right", color: "#8A56B8" }}>{(lnKeToan - Math.round(lnKeToan * tyLeA / 100)).toLocaleString("vi-VN")}</b>
              </div>
              <div style={{ display: "flex", fontSize: 12.5, padding: "8px 10px", borderTop: `1px solid ${C.line}` }}>
                <div style={{ flex: 1.5 }}>🏦 Quỹ trường đang giữ<div style={{ fontSize: 10, color: C.sub }}>(lũy kế đến hết tháng)</div></div>
                <div style={{ flex: 1, textAlign: "right" }}><b style={{ color: (luyKe?.giuA ?? 0) < 0 ? C.coral : "#2F6FBF" }}>{luyKe ? luyKe.giuA.toLocaleString("vi-VN") : "…"}</b><div style={{ fontSize: 10, color: giuThangA < 0 ? C.coral : C.sub }}>T{month}: {giuThangA.toLocaleString("vi-VN")}</div></div>
                <div style={{ flex: 1, textAlign: "right" }}><b style={{ color: (luyKe?.giuB ?? 0) < 0 ? C.coral : "#8A56B8" }}>{luyKe ? luyKe.giuB.toLocaleString("vi-VN") : "…"}</b><div style={{ fontSize: 10, color: giuThangB < 0 ? C.coral : C.sub }}>T{month}: {giuThangB.toLocaleString("vi-VN")}</div></div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 2 }}><span style={{ color: C.sub }}>Tổng quỹ trường đang giữ</span><b style={{ color: tongTienMat < 0 ? C.coral : C.pine }}>{tongTienMat.toLocaleString("vi-VN")} đ</b></div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>Quỹ âm = A/B đang ứng tiền túi, trường nợ lại.</div>
            {(tk.noAB_AtoB > 0 || tk.noAB_BtoA > 0) && (<>
              <div style={sheetTitle}>Nợ nội bộ A ↔ B</div>
              {noAB > 0 && <div style={{ fontSize: 13.5 }}>A đang nợ B: <b style={{ color: "#C99A2E" }}>{noAB.toLocaleString("vi-VN")} đ</b></div>}
              {noAB < 0 && <div style={{ fontSize: 13.5 }}>B đang nợ A: <b style={{ color: "#C99A2E" }}>{(-noAB).toLocaleString("vi-VN")} đ</b></div>}
              {noAB === 0 && <div style={{ fontSize: 13.5, color: "#2E8F63" }}>Đã cấn trừ xong.</div>}
            </>)}
            <button onClick={() => setSheetLN(false)} style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 11, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>✓ Hoàn thành</button>
          </div>
        </div>
      )}

      {/* Sheet lịch sử */}
      {sheetLS && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setSheetLS(false)} style={{ flex: 1, background: "rgba(0,0,0,.45)" }} />
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 24px", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 -4px 24px rgba(0,0,0,.18)" }}>
            <div style={{ width: 44, height: 5, borderRadius: 99, background: C.line, margin: "0 auto 12px" }} />
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>Lịch sử các tháng trước</div>
            {!lichSu || lichSu.length === 0 ? <div style={{ color: C.sub, fontSize: 14, padding: 10, textAlign: "center" }}>Chưa có dữ liệu các tháng.</div> : (() => {
              const splitA = (v: number) => Math.round(v * tyLeA / 100);
              const rev = [...lichSu].reverse();
              const tongLKT = lichSu.reduce((a, r) => a + r.laiKeToan, 0);
              const tongLTM = lichSu.reduce((a, r) => a + r.laiTienMat, 0);
              return (
                <div>
                  {rev.map((r) => {
                    const aKT = splitA(r.laiKeToan), bKT = r.laiKeToan - aKT;
                    return (
                      <div key={r.thang} style={{ border: `1px solid ${C.line}`, borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
                        <div style={{ background: "#E2F0EB", padding: "8px 12px", fontFamily: font.display, fontWeight: 800, fontSize: 14.5, color: C.pine }}>📅 Tháng {r.mm}/{r.yy}</div>
                        <div style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "1px 0" }}><span style={{ color: C.sub, fontWeight: 600 }}>🧾 Doanh thu (thực thu)</span><b style={{ color: C.ink }}>{r.thuThang.toLocaleString("vi-VN")} đ</b></div>
                          <div style={{ display: "flex", gap: 10, marginTop: 3, fontSize: 12 }}><span style={{ flex: 1, color: C.sub }}>A thu: <b style={{ color: "#2F6FBF" }}>{r.thuA.toLocaleString("vi-VN")}</b></span><span style={{ flex: 1, color: C.sub }}>B thu: <b style={{ color: "#8A56B8" }}>{r.thuB.toLocaleString("vi-VN")}</b></span></div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}` }}><span style={{ color: C.sub, fontWeight: 600 }}>💸 Chi phí xử lý (đã chi)</span><b style={{ color: C.ink }}>{r.traThang.toLocaleString("vi-VN")} đ</b></div>
                          <div style={{ display: "flex", gap: 10, marginTop: 3, fontSize: 12 }}><span style={{ flex: 1, color: C.sub }}>A chi: <b style={{ color: "#2F6FBF" }}>{r.traA.toLocaleString("vi-VN")}</b></span><span style={{ flex: 1, color: C.sub }}>B chi: <b style={{ color: "#8A56B8" }}>{r.traB.toLocaleString("vi-VN")}</b></span></div>
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
                            <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 600, marginBottom: 6 }}>📊 Phân chia tài chính · LN kế toán: <b style={{ color: r.laiKeToan < 0 ? C.coral : "#2E8F63" }}>{r.laiKeToan.toLocaleString("vi-VN")} đ</b></div>
                            <div style={{ border: `1px solid ${C.line}`, borderRadius: 9, overflow: "hidden" }}>
                              <div style={{ display: "flex", background: "#FAFCFA", fontSize: 11, color: C.sub, fontWeight: 700, padding: "5px 9px" }}>
                                <span style={{ flex: 1.5 }}>Nội dung</span>
                                <span style={{ flex: 1, textAlign: "right", color: "#2F6FBF" }}>Người A</span>
                                <span style={{ flex: 1, textAlign: "right", color: "#8A56B8" }}>Người B</span>
                              </div>
                              <div style={{ display: "flex", fontSize: 12, padding: "6px 9px", borderTop: `1px solid ${C.line}` }}>
                                <span style={{ flex: 1.5 }}>💰 Lãi chia ({tyLeA}/{100 - tyLeA})</span>
                                <b style={{ flex: 1, textAlign: "right", color: "#2F6FBF" }}>{aKT.toLocaleString("vi-VN")}</b>
                                <b style={{ flex: 1, textAlign: "right", color: "#8A56B8" }}>{bKT.toLocaleString("vi-VN")}</b>
                              </div>
                              <div style={{ display: "flex", fontSize: 12, padding: "6px 9px", borderTop: `1px solid ${C.line}` }}>
                                <div style={{ flex: 1.5 }}>🏦 Quỹ trường giữ<div style={{ fontSize: 9.5, color: C.sub }}>(lũy kế)</div></div>
                                <div style={{ flex: 1, textAlign: "right" }}><b style={{ color: r.giuACum < 0 ? C.coral : "#2F6FBF" }}>{r.giuACum.toLocaleString("vi-VN")}</b><div style={{ fontSize: 9.5, color: r.deltaA < 0 ? C.coral : C.sub }}>T{r.mm}: {r.deltaA.toLocaleString("vi-VN")}</div></div>
                                <div style={{ flex: 1, textAlign: "right" }}><b style={{ color: r.giuBCum < 0 ? C.coral : "#8A56B8" }}>{r.giuBCum.toLocaleString("vi-VN")}</b><div style={{ fontSize: 9.5, color: r.deltaB < 0 ? C.coral : C.sub }}>T{r.mm}: {r.deltaB.toLocaleString("vi-VN")}</div></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ background: "#FBF1D8", border: "1px solid #EAD8A0", borderRadius: 12, padding: "10px 12px", marginBottom: 4 }}>
                    <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 13.5, color: "#7A5E12", marginBottom: 4 }}>Σ Cộng tất cả các tháng</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "1px 0" }}><span style={{ color: C.sub }}>Tổng LN kế toán</span><b style={{ color: tongLKT < 0 ? C.coral : "#2E8F63" }}>{tongLKT.toLocaleString("vi-VN")} đ</b></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "1px 0" }}><span style={{ color: C.sub }}>Tổng LN tiền mặt</span><b style={{ color: tongLTM < 0 ? C.coral : "#2F6FBF" }}>{tongLTM.toLocaleString("vi-VN")} đ</b></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "1px 0" }}><span style={{ color: C.sub }}>Chia lãi · A {tyLeA}% / B {100 - tyLeA}%</span><b><span style={{ color: "#2F6FBF" }}>{splitA(tongLKT).toLocaleString("vi-VN")}</span> / <span style={{ color: "#8A56B8" }}>{(tongLKT - splitA(tongLKT)).toLocaleString("vi-VN")}</span></b></div>
                  </div>
                </div>
              );
            })()}
            <button onClick={() => setSheetLS(false)} style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 11, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>✓ Hoàn thành</button>
          </div>
        </div>
      )}
    </>
  );
}
