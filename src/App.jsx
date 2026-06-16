import { useState, useEffect, useRef, useMemo, memo } from "react";
import { DiemDanhTab } from "./features/diem-danh";
import { Badge, Card, SearchBar, StickyBar, Chips, useStickyShrink } from "./components/ui";
import { sGet, sSet, sList, sDel, CHOT_MEM, saveChotMem } from "./services/storage";
import { logAction, setActor } from "./services/logger";
import { C, font } from "./constants/colors";
import { fmt, ymKey, uid, noDau, stripYm } from "./utils/format";
import { soNgayHoc, soBuoiT7Auto, ngayNhapHocTrongThang, TUAN } from "./utils/dates";
import {
  tinhPSFromRec, defaultKhoan, khoanMode, isKhongThu, trangThaiThu,
  PL_HE, PL_LABEL, PHAN_LOAI, TRANG_THAI, TT_THU_PHI, KHOAN
} from "./utils/finance";
import type {
  HocSinh, Lop, FeeRecord, MonthData, Meta, ChiPhiItem,
  ThuNgoaiItem, PhuThuItem, LogEntry, NguoiThu, PhanLoai, TrangThai
} from "./types";

function LoginScreen({ meta, onLogin }) {
  const [mode, setMode] = useState(null); // null | 'admin' | 'gv'
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const tryAdmin = () => { if (pin.trim() === "1989") onLogin({ role: "admin" }); else setErr("Mã quản lý không đúng"); };
  const tryGV = () => { const gv = meta?.giaoVien?.find((g) => g.pin === pin.trim()); if (gv) onLogin({ role: "gv", gvId: gv.id, ten: gv.ten, lopId: gv.lopId }); else setErr("PIN không đúng"); };
  const lopTen = (id) => meta?.classes.find((c) => c.id === id)?.ten || "?";
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: font.body }}>
      <div style={{ background: C.card, borderRadius: 20, padding: "30px 26px", width: "100%", maxWidth: 360, boxShadow: "0 8px 30px rgba(0,0,0,.08)", textAlign: "center" }}>
        <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 22, color: C.pine }}>{meta?.tenTruong || "Mầm Non"}</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 22 }}>Quản lý điểm danh & thu phí</div>
        {!mode && (<>
          <button onClick={() => { setMode("admin"); setPin(""); setErr(""); }} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 12 }}>👩‍💼 Quản lý (Kế toán)</button>
          <button onClick={() => { setMode("gv"); setPin(""); setErr(""); }} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.blueA}`, background: C.card, color: C.blueA, fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>👩‍🏫 Giáo viên điểm danh</button>
        </>)}
        {mode && (<>
          <div style={{ textAlign: "left", marginBottom: 8, fontSize: 13, fontWeight: 700, color: C.sub }}>{mode === "admin" ? "🔐 Nhập mã quản lý" : "👩‍🏫 Nhập PIN giáo viên"}</div>
          <input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => { setPin(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && (mode === "admin" ? tryAdmin() : tryGV())} placeholder={mode === "admin" ? "Mã quản lý" : "PIN của bạn"} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px solid ${err ? C.coral : C.line}`, fontSize: 16, fontFamily: font.body, outline: "none", textAlign: "center", letterSpacing: 4 }} />
          {err && <div style={{ fontSize: 12.5, color: C.coral, marginTop: 6 }}>{err}</div>}
          <button onClick={mode === "admin" ? tryAdmin : tryGV} style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: mode === "admin" ? C.pine : C.blueA, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 12 }}>Vào</button>
          <button onClick={() => { setMode(null); setPin(""); setErr(""); }} style={{ width: "100%", padding: "8px 0", borderRadius: 10, border: "none", background: "none", color: C.sub, fontSize: 13, cursor: "pointer", marginTop: 6 }}>‹ Quay lại</button>
          {mode === "gv" && meta?.giaoVien?.length > 0 && <div style={{ marginTop: 12, fontSize: 11, color: C.gray, lineHeight: 1.6 }}>{meta.giaoVien.map((g) => <div key={g.id}>{g.ten} · lớp {lopTen(g.lopId)}</div>)}</div>}
        </>)}
      </div>
    </div>
  );
}

// [P0-2] Sao luu / phuc hoi du lieu (co fallback copy/paste cho moi truong chan tai file)
function BackupExport({ meta, students }) {
  const [busy, setBusy] = useState(false);
  const [outText, setOutText] = useState("");
  const [outName, setOutName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const dl = (text, name, type) => { try { const blob = new Blob([type === "csv" ? "\uFEFF" + text : text], { type: type === "csv" ? "text/csv;charset=utf-8;" : "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (e) {} };

  const buildJSON = async () => {
    const keys = await sList("mn5:"); const data = {};
    for (const k of keys) data[k] = await sGet(k);
    return JSON.stringify(data);
  };
  const buildCSV = async () => {
    const keys = (await sList("mn5:thang:")).filter((k) => /mn5:thang:\d{4}-\d{2}$/.test(k)).sort();
    const rows = [["Tháng", "Mã HS", "Tên", "Lớp", "Phải thu", "Đã thu", "Còn nợ"]];
    for (const k of keys) {
      const td = await sGet(k); if (!td?.fees) continue;
      const ym = k.replace("mn5:thang:", ""); const y = Number(ym.slice(0, 4)), mo = Number(ym.slice(5));
      const pm = mo === 1 ? 12 : mo - 1, py = mo === 1 ? y - 1 : y;
      const ddPrevM = (await sGet(`mn5:dd:${ymKey(py, pm)}`)) || {};
      for (const [sid, rec] of Object.entries(td.fees)) {
        const hs = students.find((s) => s.id === sid); if (!hs) continue;
        const lop = meta.classes.find((c) => c.id === lopOfMonth(hs, ym));
        const nghi = Object.keys(ddPrevM[sid] || {}).length;
        const ps = tinhPSFromRec(hs, rec, lop, nghi).tong; const tt = Number(rec.thucThu) || 0;
        rows.push([ym, sid, hs.ten, lop?.ten || "", ps, tt, ps - tt]);
      }
    }
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  const doExport = async (kind) => {
    setBusy(true);
    try {
      const text = kind === "json" ? await buildJSON() : await buildCSV();
      const name = kind === "json" ? `sao-luu-mamnon-${new Date().toISOString().slice(0, 10)}.json` : `bao-cao-thu-phi-${new Date().toISOString().slice(0, 10)}.csv`;
      dl(text, name, kind);                 // thu tai file (chay khi deploy that)
      setOutText(text); setOutName(name);   // hien ra de copy (chay trong khung chat)
    } catch (e) { toast("Lỗi xuất: " + e.message); }
    setBusy(false);
  };

  const copyOut = async () => { try { await navigator.clipboard.writeText(outText); toast("Đã copy."); } catch { toast("Bôi đen ô bên dưới rồi Copy thủ công."); } };

  const restore = async (text) => {
    let data; try { data = JSON.parse(text); } catch { toast("Nội dung không hợp lệ."); return; }
    const n = Object.keys(data).length;
    if (!n) { toast("Không có dữ liệu."); return; }
    if (!(await ask(`Phục hồi ${n} mục?\n⚠️ GHI ĐÈ toàn bộ dữ liệu hiện tại — không hoàn tác được.`, { danger: true, okText: "Phục hồi" }))) return;
    setBusy(true);
    try {
      const old = await sList("mn5:");
      for (const k of old) if (!(k in data)) await sDel(k);
      for (const [k, v] of Object.entries(data)) await sSet(k, v);
      toast("Đã phục hồi. Đang tải lại…");
      setTimeout(() => location.reload(), 800);
    } catch (e) { toast("Lỗi: " + e.message); setBusy(false); }
  };
  const importFile = async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; restore(await f.text()); };

  return (
    <>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>💾 Sao lưu dữ liệu</div>
        <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 12 }}>Bấm để xuất. Nếu máy không tự tải file (do trình duyệt/khung xem trước chặn), nội dung sẽ hiện ra ô bên dưới để bạn <b>copy</b> và dán vào ghi chú/Zalo lưu lại.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => doExport("json")} disabled={busy} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: C.pine, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Đang xử lý…" : "📥 Sao lưu toàn bộ (JSON)"}</button>
          <button onClick={() => doExport("csv")} disabled={busy} style={{ padding: "10px 16px", borderRadius: 10, border: `1.5px solid ${C.pine}`, background: C.card, color: C.pine, fontWeight: 700, fontSize: 13.5, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>📊 Xuất Excel thu phí (CSV)</button>
        </div>
        {outText && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.sub }}>{outName}</span>
              <button onClick={copyOut} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: C.blueA, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📋 Copy</button>
            </div>
            <textarea readOnly value={outText} onFocus={(e) => e.target.select()} style={{ width: "100%", height: 110, fontSize: 11, fontFamily: "monospace", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: 8, resize: "vertical", color: C.ink, background: "#FAFCFA" }} />
          </div>
        )}
      </Card>
      <Card>
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>♻️ Phục hồi</div>
        <div style={{ fontSize: 12, color: C.coral, fontWeight: 600, marginBottom: 10 }}>⚠️ Ghi đè toàn bộ dữ liệu hiện tại.</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 6 }}>Cách 1 — dán nội dung bản sao lưu JSON vào đây:</div>
        <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder='Dán nội dung JSON đã sao lưu...' style={{ width: "100%", height: 90, fontSize: 11, fontFamily: "monospace", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: 8, resize: "vertical", marginBottom: 8 }} />
        <button onClick={() => restore(pasteText)} disabled={busy || !pasteText.trim()} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: pasteText.trim() ? C.coral : C.graySoft, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: pasteText.trim() ? "pointer" : "default" }}>♻️ Phục hồi từ nội dung dán</button>
        <div style={{ fontSize: 12, color: C.sub, margin: "12px 0 6px" }}>Cách 2 — chọn file .json (chỉ chạy khi mở app thật):</div>
        <label style={{ display: "inline-block", padding: "10px 16px", borderRadius: 10, border: `1.5px dashed ${C.line}`, fontSize: 13.5, color: C.sub, cursor: "pointer" }}>Chọn file .json<input type="file" accept=".json,application/json" onChange={importFile} disabled={busy} style={{ display: "none" }} /></label>
      </Card>
    </>
  );
}

export default function App() {
  const now = new Date();
  const [meta, setMeta] = useState(null);
  const [students, setStudents] = useState(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [mData, setMData] = useState(null);
  const [ddData, setDDData] = useState(null); // [UX-V] diem danh rieng { [hsId]: { [day]: true } }
  const [leData, setLeData] = useState(null); // [UX-W] ngay le chung { [day]: true }
  const [ddPrev, setDDPrev] = useState({}); // [UX-X] diem danh thang TRUOC (de tru nghi)
  const [nextChot, setNextChot] = useState(false); // [UX-Y] thang sau da chot?
  const [tab, setTab] = useState("thu");
  const [auth, setAuth] = useState(null); // [PQ] null | {role:'admin'} | {role:'gv',gvId,ten,lopId}
  const isAdmin = auth?.role === "admin";
  const isGV = auth?.role === "gv";
  const gvLopId = auth?.lopId || null;
  const gvTen = auth?.ten || "";
  CURRENT_ACTOR = isAdmin ? "Admin" : (isGV ? gvTen : "?");
  const [openId, setOpenId] = useState(null);
  const [phieuId, setPhieuId] = useState(null);
  const [lopFilter, setLopFilter] = useState("all");
  const [thuFilter, setThuFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [isWide, setIsWide] = useState(typeof window !== "undefined" && window.innerWidth >= 820);
  const saveT = useRef({});
  const ym = ymKey(year, month);

  useEffect(() => {
    const h = () => setIsWide(window.innerWidth >= 820);
    window.addEventListener("resize", h); return () => window.removeEventListener("resize", h);
  }, []);

  // Tao toan bo du lieu mau (3 thang + no luy ke)
  const doSeed = async () => {
    const m = SEED_META, st = [];
    await sSet("mn5:meta", m); await sSet("mn5:students", st);
    await sSet("mn5:seedVersion", 14);
    return { m, st };
  };

  // Load + seed
  useEffect(() => { (async () => {
    let m = await sGet("mn5:meta");
    let st = await sGet("mn5:students");
    const sv = await sGet("mn5:seedVersion");
    // Seed cau hinh lan dau (chua co meta) HOAC phien ban cu
    if (!m || !st || sv !== 14) {
      const r = await doSeed();
      m = r.m; st = r.st; setSeeded(true);
    }
    setMeta(m); setStudents(st); setLoading(false);
    const a = await sGet("mn5:auth"); if (a && (a.role === "admin" || a.role === "gv")) setAuth(a);
  })(); }, []);

  // [PQ] dang nhap / dang xuat
  const login = (a) => { setAuth(a); sSet("mn5:auth", a); };
  const logout = () => { setAuth(null); sDel("mn5:auth"); setTab("dd"); };

  // Nut nap lai du lieu mau (xoa sach + seed)
  const reseedAll = async () => {
    const keys = await sList("mn5:");
    for (const k of keys) await sDel(k);
    Object.keys(CHOT_MEM).forEach((k) => delete CHOT_MEM[k]); saveChotMem();
    const r = await doSeed();
    setMeta({ ...r.m }); setStudents([...r.st]);
    setMData(null); setSeeded(true);
    setMonth(now.getMonth() + 1); setYear(now.getFullYear());
  };

  // Load thang khi doi ym (KHONG phu thuoc meta de tranh ghi de khi sua don gia)
  const metaReady = !!meta;
  useEffect(() => { if (!metaReady) return; (async () => {
    const d = await sGet(`mn5:thang:${ym}`);
    // [UX-V] Load diem danh rieng; migrate tu d.att neu la du lieu cu
    let dd = await sGet(`mn5:dd:${ym}`);
    if (!dd && d?.att) { dd = d.att; await sSet(`mn5:dd:${ym}`, dd); }
    setDDData(dd || {});
    const le = await sGet(`mn5:le:${ym}`);
    setLeData(le || {});
    // [UX-X] Diem danh thang truoc (de tru nghi vao thang nay)
    const pm = month === 1 ? 12 : month - 1, py = month === 1 ? year - 1 : year;
    const ddP = await sGet(`mn5:dd:${ymKey(py, pm)}`);
    setDDPrev(ddP || {});
    // [UX-Y] Trang thai chot cua thang SAU (de khoa diem danh thang nay neu thang sau da chot)
    const nm = month === 12 ? 1 : month + 1, ny = month === 12 ? year + 1 : year;
    const nd = await sGet(`mn5:thang:${ymKey(ny, nm)}`);
    setNextChot(!!nd?.daChot);
    if (d) { const { att, ...rest } = d; if (CHOT_MEM[ym] !== undefined) rest.daChot = CHOT_MEM[ym]; setMData({ ...rest, __ym: ym }); }
    else setMData(null);
  })(); setOpenId(null); setPhieuId(null); }, [ym, metaReady]);

  // [ONLINE] Tu dong tai lai diem danh + bang thang moi 10s (chi khi dung Supabase) de thay may khac vua sua
  useEffect(() => {
    if (!SB || !metaReady) return;
    const t = setInterval(async () => {
      delete MEM[`mn5:dd:${ym}`]; const dd = await sGet(`mn5:dd:${ym}`); setDDData(dd || {});
      // [FIX] Không tự động sync mData (thu phí/chốt tháng) mỗi 10s để tránh ghi đè daChot từ server cũ hơn
      // Nếu cần cập nhật từ máy khác, người dùng đổi tháng hoặc refresh
    }, 10000);
    return () => clearInterval(t);
  }, [ym, metaReady]);
  // [UX-P] Doi tab -> dong the dang mo
  useEffect(() => { setOpenId(null); }, [tab]);
  // [PHAN QUYEN] GV chi o tab Diem danh
  useEffect(() => { if (isGV && tab !== "dd") setTab("dd"); }, [isGV, tab]);

  // Dong bo students -> thang dang mo: them HS moi/chuyen sang Dang hoc, doi lop -> tinh lai default
  // [KT3] Dong bo students + don gia/cong tac lop -> thang dang mo (gop 2 effect cu)
  // - Them dong thu cho HS moi / vua chuyen sang Dang hoc
  // - Doi lop/don gia/cong tac -> cap nhat default (chua sua tay), khoan tat -> ep 0
  useEffect(() => {
    if (!meta || !mData || mData.daChot || !students) return;
    if (mData.__ym !== ym) return; // [Bug2] mData chua khop thang dang xem -> bo qua, tranh tao lai thang da xoa
    let changed = false;
    const fees = { ...mData.fees };
    students.forEach((hs) => {
      if (!TT_THU_PHI[hs.trangThai]) return;
      const lop = meta.classes.find((c) => c.id === lopOfMonth(hs, ym)); if (!lop) return;
      if (!fees[hs.id]) {
        const ngayAn = soNgayHoc(year, month, leData);
        const rec = { ngayAn, buoiT7: 0, thucThu: 0, khoan: {}, khoanDefault: {}, phuThu: [] };
        KHOAN.forEach((k) => { const d = isKhongThu(lop, k.key) ? 0 : defaultKhoan(k.key, lop, hs, ngayAn); rec.khoan[k.key] = d; rec.khoanDefault[k.key] = d; });
        fees[hs.id] = rec; changed = true;
      } else {
        const cur = fees[hs.id];
        const nd = { ...cur.khoanDefault }, nk = { ...cur.khoan }; let rc = false;
        KHOAN.forEach((k) => {
          const want = isKhongThu(lop, k.key) ? 0 : defaultKhoan(k.key, lop, hs, cur.ngayAn);
          const od = cur.khoanDefault?.[k.key] ?? 0, ov = cur.khoan?.[k.key] ?? 0;
          if (want !== od) { nd[k.key] = want; if (ov === od || isKhongThu(lop, k.key)) nk[k.key] = want; rc = true; }
        });
        if (rc) { fees[hs.id] = { ...cur, khoan: nk, khoanDefault: nd }; changed = true; }
      }
    });
    if (changed) setMData((m) => { const ndata = { ...m, fees }; flush(`mn5:thang:${ym}`, stripYm(ndata)); return ndata; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, students, ym]);

  // [UX-W] Tu tinh ngay an = so ngay hoc (tru CN + le); HS da sua tay (ngayAnManual) giu nguyen
  useEffect(() => {
    if (!meta || !mData || mData.daChot || !students || leData == null) return;
    if (mData.__ym !== ym) return; // [Bug2] tranh ghi nham thang
    let changed = false;
    const fees = { ...mData.fees };
    Object.keys(fees).forEach((sid) => {
      const cur = fees[sid]; if (cur.ngayAnManual) return;
      const hs = students.find((s) => s.id === sid); if (!hs) return;
      const nhap = ngayNhapHocTrongThang(hs, year, month);
      const snh = nhap <= 26 ? soNgayHoc(year, month, leData, nhap) : 0;
      if (cur.ngayAn === snh) return;
      const lop = meta.classes.find((c) => c.id === lopOfMonth(hs, ym));
      const newDef = isKhongThu(lop, "tienAn") ? 0 : snh * (lop?.tienAn || 0);
      const giuSuaTayTienAn = cur.khoan.tienAn !== cur.khoanDefault.tienAn;
      fees[sid] = { ...cur, ngayAn: snh, khoanDefault: { ...cur.khoanDefault, tienAn: newDef }, khoan: { ...cur.khoan, tienAn: giuSuaTayTienAn ? cur.khoan.tienAn : newDef } };
      changed = true;
    });
    if (changed) setMData((m) => { const ndata = { ...m, fees }; flush(`mn5:thang:${ym}`, stripYm(ndata)); return ndata; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leData, meta, students, ym]);

  // [KT1] No/du luy ke den HET thang truoc.
  // Tim thang da CHOT gan nhat (< ym) -> dung snapshot noLuyKe lam diem xuat phat,
  // chi tinh dong cac thang sau snapshot (chua chot). Khong quet lai tu dau -> nhanh.
  const [prevDebt, setPrevDebt] = useState({});
  useEffect(() => { if (!metaReady || !students) return; (async () => {
    const keys = await sList("mn5:thang:");
    const months = keys.map((k) => k.replace("mn5:thang:", "")).filter((m) => /^\d{4}-\d{2}$/.test(m) && m < ym).sort();
    const datas = await Promise.all(months.map((m) => sGet(`mn5:thang:${m}`)));
    const dds = await Promise.all(months.map((m) => sGet(`mn5:dd:${m}`)));
    // [UX-X] dd cua thang ngay truoc moi thang (de tru nghi); fetch them neu khong nam trong list
    const prevKeys = Array.from(new Set(months.map((m) => { const y = Number(m.slice(0, 4)), mo = Number(m.slice(5)); const pm = mo === 1 ? 12 : mo - 1, py = mo === 1 ? y - 1 : y; return ymKey(py, pm); }).filter((k) => !months.includes(k))));
    const prevVals = await Promise.all(prevKeys.map((k) => sGet(`mn5:dd:${k}`)));
    const ddPrevExtra = {}; prevKeys.forEach((k, i) => { ddPrevExtra[k] = prevVals[i] || {}; });
    // Tim chi so thang chot gan nhat co snapshot
    let snapIdx = -1;
    for (let i = months.length - 1; i >= 0; i--) { if (datas[i]?.daChot && datas[i]?.noLuyKe) { snapIdx = i; break; } }
    const debt = {};
    students.forEach((hs) => { debt[hs.id] = hs.noDauKy || 0; });
    if (snapIdx >= 0) { const snap = datas[snapIdx].noLuyKe; Object.keys(snap).forEach((sid) => { debt[sid] = snap[sid]; }); }
    // Tinh dong cac thang SAU snapshot (chua chot hoac khong co snapshot)
    for (let i = snapIdx + 1; i < months.length; i++) {
      const td = datas[i]; if (!td?.fees) continue;
      const m = months[i], y = Number(m.slice(0, 4)), mo = Number(m.slice(5));
      const ddM = dds[i] || td.att || {};
      // neu thang nay da chot va co snapshot -> lay luon snapshot (chinh xac hon)
      if (td.daChot && td.noLuyKe) { Object.keys(td.noLuyKe).forEach((sid) => { debt[sid] = td.noLuyKe[sid]; }); continue; }
      Object.keys(td.fees).forEach((sid) => {
        const hs = students.find((s) => s.id === sid); if (!hs) return;
        if (debt[sid] === undefined) debt[sid] = hs.noDauKy || 0;
        let rec = td.fees[sid];
        const lop = meta.classes.find((c) => c.id === lopOfMonth(hs, m));
        // [UX-X] tru nghi theo diem danh THANG TRUOC cua thang m
        const ppm = mo === 1 ? 12 : mo - 1, ppy = mo === 1 ? y - 1 : y;
        const ddPrevKey = ymKey(ppy, ppm);
        const idxPrev = months.indexOf(ddPrevKey);
        const ddPrevM = (idxPrev >= 0 ? dds[idxPrev] : null) || ddPrevExtra[ddPrevKey] || {};
        const nghi = Object.keys(ddPrevM[sid] || {}).length;
        if (hs.pl === "T7" && !rec.buoiT7Manual) rec = { ...rec, buoiT7: soBuoiT7Auto(y, mo, ddM[sid]) };
        const ps = tinhPSFromRec(hs, rec, lop, nghi).tong;
        debt[sid] += ps - (Number(rec.thucThu) || 0);
      });
    }
    setPrevDebt(debt);
  })(); }, [ym, metaReady, students, mData, meta]);

  // Luu co debounce, nhung luu THANG ngay lap tuc de tranh mat du lieu khi doi thang
  const q = (k, v) => { clearTimeout(saveT.current[k]); saveT.current[k] = setTimeout(() => sSet(k, v), 400); };
  const flush = (k, v) => { clearTimeout(saveT.current[k]); return sSet(k, v); };
  const upMeta = (m) => { setMeta(m); q("mn5:meta", m); };
  const upStudents = (s) => { setStudents(s); q("mn5:students", s); };
  // Thang: luu NGAY (khong debounce) -> khong bao gio mat khi chuyen thang
  const upMData = (d) => { CHOT_MEM[ym] = !!d.daChot; saveChotMem(); const dd = { ...d, __ym: ym }; setMData(dd); return flush(`mn5:thang:${ym}`, stripYm(dd)); };
  const upDDData = (d) => { setDDData(d); flush(`mn5:dd:${ym}`, d); };
  const upLeData = (d) => { setLeData(d); flush(`mn5:le:${ym}`, d); };

  const getLop = (id) => meta?.classes.find((c) => c.id === id);
  const locked = mData?.daChot;

  const taoThang = async () => {
    // Lay thang truoc de ke thua khoan CO DINH
    const py = month === 1 ? year - 1 : year;
    const pm = month === 1 ? 12 : month - 1;
    const prev = await sGet(`mn5:thang:${ymKey(py, pm)}`);
    const data = seedThangData(ym, students, meta);
    data.fees = {};
    students.forEach((hs) => {
      if (!TT_THU_PHI[hs.trangThai]) return;
      const lop = getLop(lopOfMonth(hs, ym));
      const nhap = ngayNhapHocTrongThang(hs, year, month);
      const ngayAn = nhap <= 26 ? soNgayHoc(year, month, leData, nhap) : 0;
      const rec = { ngayAn, buoiT7: hs.pl === "T7" ? 4 : 0, thucThu: 0, khoan: {}, khoanDefault: {}, phuThu: [] };
      KHOAN.forEach((k) => {
        const d = isKhongThu(lop, k.key) ? 0 : defaultKhoan(k.key, lop, hs, ngayAn);
        rec.khoan[k.key] = d; rec.khoanDefault[k.key] = d;
      });
      // Ke thua khoan CO DINH thang truoc
      const prevRec = prev?.fees?.[hs.id];
      if (prevRec?.phuThu) rec.phuThu = prevRec.phuThu.filter((p) => p.coDinh).map((p) => ({ ...p, id: uid() }));
      data.fees[hs.id] = rec;
    });
    // [CHI CO DINH] Ke thua chi phi CO_DINH thang truoc (reset Da tra ve 0)
    if (prev?.chiPhi?.length) {
      data.chiPhi = prev.chiPhi.filter((c) => c.loai === "CO_DINH").map((c) => ({ id: uid(), noiDung: c.noiDung, soTien: c.soTien, nguoiChi: c.nguoiChi, loai: "CO_DINH", daTra: 0 }));
    }
    upMData(data);
    toast(`Đã tạo tháng ${month}/${year}.`);
    logAction(`Tạo bảng thu tháng ${month}/${year}`);
  };

  const delThang = async () => {
    if (locked) { toast("Tháng đã chốt — mở khóa trước khi xóa."); return; }
    if (await ask(`Xóa toàn bộ bảng THU tháng ${month}/${year}?\nĐiểm danh tháng này vẫn được GIỮ lại.`, { danger: true, okText: "Xóa bảng thu" })) {
      await sDel(`mn5:thang:${ym}`);
      delete CHOT_MEM[ym]; saveChotMem();
      setMData(null);
      logAction(`Xóa bảng thu tháng ${month}/${year}`);
      toast(`Đã xóa bảng thu. Điểm danh tháng ${month}/${year} vẫn còn.`);
    }
  };

  // Cap nhat ngayAn -> recalc default tienAn (giu sua tay neu da sua)
  const setRec = (sid, patch) => {
    if (locked) return;
    const cur = mData.fees[sid];
    let next = { ...cur, ...patch };
    // [UX-W] tra ve tu dong -> tinh lai ngayAn theo so ngay hoc
    if (patch.ngayAnManual === false) { patch = { ...patch, ngayAn: soNgayHoc(year, month, leData) }; next = { ...cur, ...patch }; }
    if (patch.ngayAn != null) {
      const lop = getLop(lopOfMonth(students.find((s) => s.id === sid), ym));
      const newDef = (patch.ngayAn || 0) * (lop?.tienAn || 0);
      next.khoanDefault = { ...next.khoanDefault, tienAn: newDef };
      // neu truoc do tienAn == default cu -> cap nhat theo default moi
      if (cur.khoan.tienAn === cur.khoanDefault.tienAn) next.khoan = { ...next.khoan, tienAn: newDef };
    }
    upMData({ ...mData, fees: { ...mData.fees, [sid]: next } });
  };
  // Thu du HANG LOAT: gop 1 lan ghi (tranh loi chi luu HS cuoi)
  const thuDuNhieu = (pairs) => {
    if (locked) return;
    const fees = { ...mData.fees };
    pairs.forEach(({ sid, thucThu }) => { if (fees[sid]) fees[sid] = { ...fees[sid], thucThu }; });
    upMData({ ...mData, fees });
    if (pairs.length > 1) logAction(`Thu đủ hàng loạt ${pairs.length} HS (T${month}/${year})`);
  };
  const setKhoan = (sid, key, val) => {
    if (locked) return;
    const cur = mData.fees[sid];
    upMData({ ...mData, fees: { ...mData.fees, [sid]: { ...cur, khoan: { ...cur.khoan, [key]: val } } } });
  };
  const resetKhoan = (sid, key) => {
    if (locked) return;
    const cur = mData.fees[sid];
    upMData({ ...mData, fees: { ...mData.fees, [sid]: { ...cur, khoan: { ...cur.khoan, [key]: cur.khoanDefault[key] } } } });
  };
  const resetAllKhoan = (sid) => {
    if (locked) return;
    const cur = mData.fees[sid];
    upMData({ ...mData, fees: { ...mData.fees, [sid]: { ...cur, khoan: { ...cur.khoanDefault } } } });
  };
  // Ap ngay an cho TAT CA HS dang co rec trong thang (chi sua HS chua chinh tay tienAn)
  const setNgayAnAll = (val, onlyIds) => {
    if (locked) return;
    const fees = { ...mData.fees };
    const ids = onlyIds && onlyIds.length ? onlyIds.filter((id) => fees[id]) : Object.keys(fees);
    ids.forEach((sid) => {
      const cur = fees[sid];
      const lop = getLop(lopOfMonth(students.find((s) => s.id === sid), ym));
      const newDef = (val || 0) * (lop?.tienAn || 0);
      const giuSuaTay = cur.khoan.tienAn !== cur.khoanDefault.tienAn;
      fees[sid] = { ...cur, ngayAn: val, ngayAnManual: true, khoanDefault: { ...cur.khoanDefault, tienAn: newDef }, khoan: { ...cur.khoan, tienAn: giuSuaTay ? cur.khoan.tienAn : newDef } };
    });
    upMData({ ...mData, fees });
    toast(`Đã đặt ${val} ngày ăn cho ${ids.length} HS đang hiển thị.`);
  };
  const addPhuThuHS = (sid, ten, soTien) => {
    if (locked) return;
    const cur = mData.fees[sid];
    upMData({ ...mData, fees: { ...mData.fees, [sid]: { ...cur, phuThu: [...(cur.phuThu || []), { id: uid(), ten, soTien: Number(soTien) || 0 }] } } });
  };
  const delPhuThuHS = (sid, pid) => {
    if (locked) return;
    const cur = mData.fees[sid];
    upMData({ ...mData, fees: { ...mData.fees, [sid]: { ...cur, phuThu: (cur.phuThu || []).filter((p) => p.id !== pid) } } });
  };

  const allRows = useMemo(() => {
    if (!mData || !students) return [];
    return students.map((hs) => {
      let rec = mData.fees?.[hs.id];
      const lopId = lopOfMonth(hs, ym);
      const lop = getLop(lopId);
      // [UX-X] Tru nghi theo diem danh THANG TRUOC (thu truoc, bu tru sau)
      const nghi = Object.keys(ddPrev?.[hs.id] || {}).length;
      // Buoi T7 tu diem danh thang HIEN TAI (giu nguyen)
      if (rec && hs.pl === "T7" && !rec.buoiT7Manual) {
        const auto = soBuoiT7Auto(year, month, ddData?.[hs.id]);
        if (auto !== rec.buoiT7) rec = { ...rec, buoiT7: auto };
      }
      const ps = rec ? tinhPSFromRec(hs, rec, lop, nghi) : { tong: 0, dong: [], suaCount: 0 };
      const noTruoc = prevDebt[hs.id] || 0;
      const tongPhaiThu = ps.tong + noTruoc; // gom no cu
      return { hs, rec, lopId, lop, nghi, ps, noTruoc, tongPhaiThu, st: rec ? trangThaiThu(tongPhaiThu, rec.thucThu) : null, conNo: rec ? tongPhaiThu - rec.thucThu : 0, coRec: !!rec };
    });
  }, [students, mData, ddData, ddPrev, meta, year, month, prevDebt]);

  // [DIEM DANH] Danh sach HS de diem danh — dung allRows neu co bang thu, neu khong thi dung students dang hoc
  const ddRows = useMemo(() => {
    if (mData) return allRows;
    if (!students || !meta) return [];
    return students.filter((hs) => TT_THU_PHI[hs.trangThai]).map((hs) => {
      const lopId = lopOfMonth(hs, ym);
      return { hs, lopId, lop: meta.classes.find((c) => c.id === lopId), coRec: true };
    });
  }, [mData, allRows, students, meta, ym]);

  const rows = useMemo(() => {
    const s = noDau(search);
    return allRows.filter((r) => {
      if (!r.coRec) return false;
      if (lopFilter !== "all" && r.lopId !== lopFilter) return false;
      if (s && !noDau(r.hs.ten).includes(s) && !r.hs.id.toLowerCase().includes(s)) return false;
      if (thuFilter === "chuaThu") return r.ps.tong > 0 && (r.rec.thucThu || 0) === 0;
      if (thuFilter === "thieu") return r.conNo > 0 && (r.rec.thucThu || 0) > 0;
      if (thuFilter === "noCu") return r.noTruoc > 0;
      if (thuFilter === "thuThua") return r.conNo < 0;
      return true;
    });
  }, [allRows, lopFilter, search, thuFilter]);

  const tk = useMemo(() => {
    const s = { ps: 0, thu: 0, no: 0, A: 0, B: 0, chiA: 0, chiB: 0, traA: 0, traB: 0, noList: [], noAB_AtoB: 0, noAB_BtoA: 0 };
    allRows.forEach((r) => {
      if (!r.coRec) return;
      s.ps += r.ps.tong; s.thu += r.rec.thucThu; // ps = phat sinh thang nay (doanh thu thang)
      if (r.conNo > 0) { s.no += r.conNo; s.noList.push({ ten: r.hs.ten, so: r.conNo, chua: r.rec.thucThu === 0 }); }
      if (r.hs.nguoiThu === "A") s.A += r.rec.thucThu; else if (r.hs.nguoiThu === "B") s.B += r.rec.thucThu;
    });
    (mData?.thuNgoai || []).forEach((k) => {
      const tt = Number(k.thucThu) || 0; s.ps += Number(k.soTien) || 0; s.thu += tt;
      if (k.nguoiThu === "A") s.A += tt; else if (k.nguoiThu === "B") s.B += tt;
      const no = (Number(k.soTien) || 0) - tt; if (no > 0) { s.no += no; s.noList.push({ ten: "(TN) " + k.ten, so: no, chua: tt === 0 }); }
    });
    (mData?.chiPhi || []).forEach((c) => {
      const e = Number(c.soTien) || 0, kk = Number(c.daTra) || 0;
      if (c.loai === "CHUYEN") { if (c.huong === "A->B") { s.A -= e; s.B += e; } else { s.B -= e; s.A += e; } return; }
      if (c.loai === "NO_AB") { if (c.huong === "A->B") s.noAB_AtoB += e - kk; else s.noAB_BtoA += e - kk; return; }
      if (c.loai === "TRA_NO") {
        // Trả nợ NCC: không tính vào chi phí tháng, chỉ tính tiền đã ra khỏi túi
        if (c.nguoiChi === "A") s.traA += kk; else s.traB += kk;
        return;
      }
      if (c.nguoiChi === "A") { s.chiA += e; s.traA += kk; } else { s.chiB += e; s.traB += kk; }
    });
    const dk = meta?.soDuDauKy || {};
    s.noAB_AtoB += (dk.AnoB || 0); s.noAB_BtoA += (dk.BnoA || 0);
    return s;
  }, [allRows, mData, meta]);

  if (loading || !meta || !students)
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.bg, color: C.sub, fontFamily: font.body }}>Đang tải dữ liệu…</div>;
  if (!auth) return <LoginScreen meta={meta} onLogin={login} />;

  const prevM = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
  const nextM = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };
  const chipsLop = [["all", "Tất cả"], ...meta.classes.map((c) => [c.id, c.ten])];
  const phieuRow = allRows.find((r) => r.hs.id === phieuId && r.coRec) || allRows.find((r) => r.coRec);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font.body, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');
        input[type=number]::-webkit-inner-spin-button{display:none}
        *{box-sizing:border-box}
        button:active{transform:scale(0.97)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @media print { .no-print{display:none!important} #phieu-in{box-shadow:none!important} body{background:#fff} }
      `}</style>

      <div className="no-print" style={{ background: C.pine, padding: "16px 16px 14px", color: "#fff" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, lineHeight: 1.25, maxHeight: 38, overflow: "hidden", wordBreak: "break-word" }}>{meta.tenTruong}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{isGV ? `👩‍🏫 ${gvTen}` : `${students.filter((s) => TT_THU_PHI[s.trangThai]).length} đang học · ${meta.classes.length} lớp`}{locked ? " · 🔒" : ""}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2, background: "rgba(255,255,255,.16)", borderRadius: 999, padding: "4px 4px" }}>
              <button onClick={prevM} style={{ color: "#fff", fontSize: 18, padding: "0 8px", border: "none", background: "none", cursor: "pointer" }}>‹</button>
              <button onClick={() => setMonthPickerOpen(true)} style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14, minWidth: 64, textAlign: "center", color: "#fff", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", gap: 3 }}>Th{month}/{year} <span style={{ fontSize: 9, opacity: 0.8 }}>▾</span></button>
              <button onClick={nextM} style={{ color: "#fff", fontSize: 18, padding: "0 8px", border: "none", background: "none", cursor: "pointer" }}>›</button>
            </div>
            <button onClick={logout} title="Đăng xuất" style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 8, padding: "5px 9px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>↩</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "14px 14px 92px" }}>
        {seeded && <div className="no-print" style={{ background: C.pineSoft, border: `1px solid #BFE0D4`, borderRadius: 12, padding: "9px 12px", marginBottom: 12, fontSize: 12.5, color: C.pine }}>👋 Khởi tạo xong! Bắt đầu: vào ⚙️ Cài đặt → Học sinh để thêm/nhập danh sách, rồi tạo bảng thu cho tháng.</div>}

        {["thu", "phieu", "dash"].includes(tab) && !mData && (
          <div className="no-print" style={{ background: C.card, borderRadius: 16, padding: 28, textAlign: "center", border: `1px dashed ${C.line}` }}>
            <div style={{ fontSize: 32 }}>📅</div>
            <div style={{ fontWeight: 600, margin: "8px 0 4px" }}>Tháng {month}/{year} chưa có dữ liệu</div>
            {isAdmin ? (<>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Tạo bảng thu cho HS đang học.</div>
              <button onClick={taoThang} style={{ background: C.pine, color: "#fff", padding: "11px 24px", borderRadius: 99, fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", fontFamily: font.display }}>+ Tạo tháng {month}/{year}</button>
            </>) : (
              <div style={{ fontSize: 13, color: C.sub }}>Vui lòng liên hệ kế toán để tạo bảng thu (vẫn điểm danh được bên dưới).</div>
            )}
          </div>
        )}

        {tab === "thu" && mData && (
          <ThuPhiTab {...{ rows, tk, allRows, chipsLop, lopFilter, setLopFilter, thuFilter, setThuFilter, search, setSearch, openId, setOpenId, getLop, setRec, setKhoan, resetKhoan, resetAllKhoan, setNgayAnAll, thuDuNhieu, addPhuThuHS, delPhuThuHS, locked, mData, upMData, setPhieuId, setTab, isWide }} />
        )}
        {tab === "dd" && (
          <DiemDanhTab {...{ allRows: ddRows, chipsLop, lopFilter, setLopFilter, search, setSearch, ddData, upDDData, leData, upLeData, year, month, locked: nextChot, ddLockReason: nextChot, isWide, ym, isGV, gvLopId, gvTen, students }} />
        )}
        {tab === "phieu" && mData && phieuRow && (
          <PhieuThu {...{ phieuRow, allRows, setPhieuId, getLop, meta, month, year, upMeta, mData, upMData }} />
        )}
        {tab === "dash" && mData && (
          <DashTab {...{ tk, mData, upMData, month, year, locked, meta, allRows, delThang, students, ym, upMeta, setTab }} />
        )}
        {tab === "no" && (
          <CongNoTab {...{ students, meta, ym, mData }} />
        )}
        {tab === "caidat" && (
          <CaiDat {...{ meta, upMeta, students, upStudents, ym, reseedAll, isWide }} />
        )}
      </div>

      <div className="no-print" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "center", zIndex: 20 }}>
        <div style={{ display: "flex", width: "100%", maxWidth: 640 }}>
          {(isAdmin ? [["thu", "Thu phí", "₫"], ["dd", "Điểm danh", "✓"], ["no", "Công nợ", "📕"], ["dash", "Tổng quan", "📊"], ["phieu", "Phiếu", "🧾"], ["caidat", "Cài đặt", "⚙️"]] : [["dd", "Điểm danh", "✓"]]).map(([id, lb, ic]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "9px 0 11px", border: "none", background: "none", cursor: "pointer", color: tab === id ? C.pine : C.gray, fontFamily: font.body, fontSize: 10, fontWeight: tab === id ? 700 : 500 }}>
              <div style={{ fontSize: 15, marginBottom: 1 }}>{ic}</div>{lb}
            </button>
          ))}
        </div>
      </div>
      <BottomSheet open={monthPickerOpen} onClose={() => setMonthPickerOpen(false)} title="Chọn tháng xem báo cáo">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(() => {
            const base = new Date();
            const items = [];
            for (let i = -1; i <= 17; i++) { const d = new Date(base.getFullYear(), base.getMonth() - i, 1); items.push({ m: d.getMonth() + 1, y: d.getFullYear() }); }
            return items.map(({ m, y }) => {
              const active = m === month && y === year;
              const isNow = m === base.getMonth() + 1 && y === base.getFullYear();
              return (
                <button key={`${y}-${m}`} onClick={() => { setMonth(m); setYear(y); setMonthPickerOpen(false); }} style={{ flex: "1 1 28%", minWidth: 96, padding: "11px 6px", borderRadius: 11, border: `1.5px solid ${active ? C.pine : C.line}`, background: active ? C.pine : C.card, color: active ? "#fff" : C.ink, fontFamily: font.display, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  Th{m}/{y}
                  {isNow && <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? "#fff" : C.green }}>● hiện tại</span>}
                </button>
              );
            });
          })()}
        </div>
        <button onClick={() => setMonthPickerOpen(false)} style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 11, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>✓ Xong</button>
      </BottomSheet>
      <ConfirmHost />
      <ToastHost />
    </div>
  );
}

// ====================================================================
// Khoan thu rieng cua 1 HS trong thang (dau nam, dong phuc le...)
function PhuThuHS({ r, locked, addPhuThuHS, delPhuThuHS }) {
  const [ten, setTen] = useState(""); const [so, setSo] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const list = r.rec.phuThu || [];
  const add = () => { if (!ten.trim() || !so) return; addPhuThuHS(r.hs.id, ten.trim(), Number(so)); setTen(""); setSo(""); };
  return (
    <div style={{ marginBottom: 10, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 4 }}>Khoản riêng (đầu năm, đồng phục…)</div>
      {list.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 13 }}>
          <span style={{ flex: 1, color: C.ink }}>{p.ten}{p.lop && <span style={{ color: C.blueA, fontSize: 10.5 }}> (cả lớp)</span>}</span>
          <span style={{ fontWeight: 600 }}>{fmt(p.soTien)}</span>
          {!locked && (confirmId === p.id
            ? <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><button onClick={() => { delPhuThuHS(r.hs.id, p.id); setConfirmId(null); }} style={{ border: "none", background: C.coral, color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Xóa</button><button onClick={() => setConfirmId(null)} style={{ border: "none", background: "none", color: C.sub, fontSize: 11, cursor: "pointer" }}>Hủy</button></span>
            : <button onClick={() => setConfirmId(p.id)} style={{ border: "none", background: "none", color: C.coral, cursor: "pointer", fontSize: 14 }}>🗑</button>)}
        </div>
      ))}
      {!locked && (
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên khoản (VD: Đầu năm)" style={{ flex: "2 1 130px", padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 12.5, minWidth: 0, fontFamily: font.body }} />
          <input type="number" value={so} onChange={(e) => setSo(e.target.value)} placeholder="Số tiền" style={{ flex: "1 1 80px", padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 12.5, minWidth: 0, fontFamily: font.body }} />
          <button onClick={add} style={{ background: C.pineSoft, color: C.pine, fontWeight: 700, fontSize: 12.5, padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer" }}>+ Thêm</button>
        </div>
      )}
    </div>
  );
}

// [UX-M] Empty state
function EmptyState({ search, onClear }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: C.sub }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
      <div style={{ fontSize: 14, marginBottom: 12 }}>{search ? "Không tìm thấy học sinh phù hợp" : "Không có học sinh trong bộ lọc này"}</div>
      <button onClick={onClear} style={{ padding: "8px 16px", borderRadius: 9, border: `1.5px solid ${C.line}`, background: C.card, color: C.pine, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: font.body }}>Xóa bộ lọc</button>
    </div>
  );
}

// Thanh "ngay an ca thang"
function NgayAnBar({ onApply, rows }) {
  const [v, setV] = useState(24);
  return (
    <Card style={{ marginBottom: 10, background: C.pineSoft, borderColor: "#BFE0D4", padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.pine }}>🍽️ Số ngày ăn trong tháng:</span>
        <NumInput value={v} onChange={setV} w={62} />
        <span style={{ fontSize: 12.5, color: C.pine }}>ngày</span>
        <button onClick={() => onApply(v, rows.map((r) => r.hs.id))} style={{ background: C.pine, color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 14px", borderRadius: 9, border: "none", cursor: "pointer" }}>Áp dụng cho {rows.length} HS đang hiển thị</button>
      </div>
      <div style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>Tiền ăn = số ngày ăn × đơn giá. Chỉ áp cho HS đang lọc; HS đã sửa tay vẫn giữ riêng.</div>
    </Card>
  );
}

// ====== Chi tiết HS trong Thu phí (UI/UX tối ưu mobile) ======
function HSCardDetail({ r, locked, setRec, setKhoan, resetKhoan, resetAllKhoan, addPhuThuHS, delPhuThuHS, setPhieuId, setTab }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKhoan, setSheetKhoan] = useState(null);
  const [sheetVal, setSheetVal] = useState("");
  const [sheetLabel, setSheetLabel] = useState("");
  const [ptTen, setPtTen] = useState("");
  const [ptSo, setPtSo] = useState("");
  const [showPtInput, setShowPtInput] = useState(false);
  const [showChiTiet, setShowChiTiet] = useState(false);

  const openSheet = (k, label) => {
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
    setPtTen(""); setPtSo(""); setShowPtInput(false);
  };

  const tienAn = r.rec.khoan?.tienAn ?? 0;
  const giaAn = r.rec.ngayAn > 0 ? Math.round(tienAn / r.rec.ngayAn) : (r.lop?.tienAn || 0);

  return (
    <div className="fade-in" style={{ borderTop: `1px dashed ${C.line}`, background: "#FBFDFB", animation: "fadeIn .2s ease" }}>
      {/* Thực thu + Thu đủ cùng hàng */}
      <div style={{ padding: "14px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>Thực thu:</span>
          <NumInput value={r.rec.thucThu} onChange={(v) => setRec(r.hs.id, { thucThu: v })} w={140} disabled={locked} />
          {!locked && (r.rec.thucThu || 0) < r.tongPhaiThu && (
            <button onClick={() => setRec(r.hs.id, { thucThu: r.tongPhaiThu })} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
              ✓ Thu đủ
            </button>
          )}
          {!locked && (r.rec.thucThu || 0) >= r.tongPhaiThu && r.tongPhaiThu > 0 && (
            <span style={{ padding: "10px 14px", borderRadius: 10, background: C.greenSoft, color: C.green, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>✓ Đã thu đủ</span>
          )}
        </div>
      </div>

      {/* BODY */}
      <div style={{ padding: "0 14px 14px" }}>
        {/* Ngày ăn — số trái, nhãn phải, click để sửa */}
        <div onClick={() => !locked && openSheet(null, "Ngày ăn")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.line}`, cursor: locked ? "default" : "pointer" }}>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 20, color: C.ink, minWidth: 36, textAlign: "center" }}>{r.rec.ngayAn}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Ngày ăn</div>
            <div style={{ fontSize: 12, color: C.sub }}>{fmt(tienAn)} đ{r.rec.ngayAnManual && <span style={{ color: C.amber, marginLeft: 4 }}>· tay</span>}</div>
          </div>
          {!locked && <span style={{ fontSize: 16, color: C.sub }}>✏️</span>}
        </div>

        {/* Khoản phí — icon bút cạnh tên, click mở sheet */}
        {r.hs.pl !== "GV" && r.hs.pl !== "T7" && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>Khoản phí</div>
              {!locked && r.ps.suaCount > 0 && (
                <button onClick={() => resetAllKhoan(r.hs.id)} style={{ fontSize: 11, color: C.pine, border: "none", background: "none", cursor: "pointer", fontWeight: 600 }}>↺ Khôi phục</button>
              )}
            </div>
            {KHOAN.filter((k) => k.key !== "tienAn").map((k) => {
              const val = r.rec.khoan?.[k.key] ?? 0;
              const def = r.rec.khoanDefault?.[k.key] ?? 0;
              const sua = val !== def;
              if (val === 0 && def === 0 && k.key !== "hocPhi") return null;
              return (
                <div key={k.key} onClick={() => !locked && openSheet(k)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.line}`, cursor: locked ? "default" : "pointer" }}>
                  <span style={{ flex: 1, fontSize: 14, color: sua ? C.amber : C.ink }}>{k.label}{sua && <span style={{ fontSize: 11, color: C.amber, marginLeft: 4 }}>· đã sửa</span>}</span>
                  <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, color: C.ink }}>{fmt(val)}</span>
                  {!locked && <span style={{ fontSize: 14, color: C.sub }}>✏️</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Khoản riêng (phuThu) */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, whiteSpace: "nowrap" }}>Khoản riêng</span>
            <div style={{ flex: 1, height: 1, background: C.line }} />
            {!locked && !showPtInput && (
              <button onClick={() => setShowPtInput(true)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 9, border: `1.5px solid ${C.pine}`, background: C.pineSoft, color: C.pine, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>➕ Thêm</button>
            )}
          </div>
          {(r.rec.phuThu || []).map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ flex: 1, fontSize: 14, color: C.ink }}>{p.ten}{p.lop && <span style={{ color: C.blueA, fontSize: 10 }}> (cả lớp)</span>}</span>
              <span style={{ fontWeight: 700 }}>{fmt(p.soTien)}</span>
              {!locked && (
                <button onClick={(e) => { e.stopPropagation(); delPhuThuHS(r.hs.id, p.id); }} style={{ border: "none", background: "none", color: C.coral, cursor: "pointer", fontSize: 14 }}>🗑</button>
              )}
            </div>
          ))}
          {(r.rec.phuThu || []).length === 0 && !showPtInput && <div style={{ fontSize: 12, color: C.gray, padding: "2px 0 4px" }}>Chưa có khoản riêng.</div>}
          {!locked && showPtInput && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <input value={ptTen} onChange={(e) => setPtTen(e.target.value)} placeholder="Tên khoản" style={{ flex: 2, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 13, fontFamily: font.body }} />
              <input type="number" value={ptSo} onChange={(e) => setPtSo(e.target.value)} placeholder="Số tiền" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 13, fontFamily: font.body }} />
              <button onClick={addPT} style={{ background: C.pine, color: "#fff", fontWeight: 700, fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer" }}>Thêm</button>
              <button onClick={() => { setShowPtInput(false); setPtTen(""); setPtSo(""); }} style={{ background: "none", color: C.sub, fontWeight: 700, fontSize: 12, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.line}`, cursor: "pointer" }}>Hủy</button>
            </div>
          )}
        </div>

        {/* Chi tiết — nhấn vào mở ra hiện tất cả khoản */}
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: C.card, border: `1px solid ${C.line}` }}>
          <div onClick={() => setShowChiTiet((v) => !v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Chi tiết</div>
            <span style={{ fontSize: 12, color: C.sub, transition: "transform .2s", transform: showChiTiet ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </div>

          {showChiTiet && (
            <div style={{ marginTop: 8 }}>
              {r.ps.dong.map(([l, v, sua], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 13, color: v < 0 ? C.green : C.ink }}>
                  <span style={{ color: C.sub }}>{l}{sua && <span style={{ color: C.amber }}> ⚠</span>}</span>
                  <span>{fmt(v)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: C.sub, marginTop: 4, borderTop: `1px dashed ${C.line}` }}>
                <span>Phát sinh tháng này</span><span>{fmt(r.ps.tong)}</span>
              </div>
              {r.noTruoc !== 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 13, color: r.noTruoc > 0 ? C.coral : C.green }}>
                  <span>{r.noTruoc > 0 ? "+ Nợ tháng trước" : "− Dư tháng trước"}</span>
                  <span>{r.noTruoc > 0 ? fmt(r.noTruoc) : "−" + fmt(-r.noTruoc)}</span>
                </div>
              )}
            </div>
          )}

          {!showChiTiet && (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: C.sub }}>
                <span>Phát sinh tháng này</span><span>{fmt(r.ps.tong)}</span>
              </div>
              {r.noTruoc !== 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 13, color: r.noTruoc > 0 ? C.coral : C.green }}>
                  <span>{r.noTruoc > 0 ? "+ Nợ tháng trước" : "− Dư tháng trước"}</span>
                  <span>{r.noTruoc > 0 ? fmt(r.noTruoc) : "−" + fmt(-r.noTruoc)}</span>
                </div>
              )}
            </div>
          )}

          {/* Tổng phải thu */}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, marginTop: 6, borderTop: `1.5px solid ${C.line}`, fontWeight: 800, fontSize: 16, fontFamily: font.display }}>
            <span>TỔNG PHẢI THU</span>
            <span>{fmt(r.tongPhaiThu)} đ</span>
          </div>
        </div>
      </div>

      {/* FOOTER STICKY */}
      <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: `1.5px solid ${C.line}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, zIndex: 5 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.sub }}>Phát sinh {fmt(r.ps.tong)} · Nợ cũ {fmt(r.noTruoc)}</div>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 16, color: C.ink }}>Tổng {fmt(r.tongPhaiThu)} đ</div>
        </div>
        <button onClick={() => { setPhieuId(r.hs.id); setTab("phieu"); }} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          Đến thu tiền →
        </button>
      </div>

      {/* BOTTOM SHEET sửa khoản / ngày ăn */}
      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setSheetOpen(false)} style={{ flex: 1, background: "rgba(0,0,0,.4)" }} />
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 24px", boxShadow: "0 -4px 20px rgba(0,0,0,.15)" }}>
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 14 }}>
              Sửa {sheetLabel}
            </div>
            {sheetKhoan && (
              <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Mặc định: {fmt(r.rec.khoanDefault?.[sheetKhoan.key] ?? 0)}</div>
            )}
            {!sheetKhoan && (
              <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>Giá: {fmt(giaAn)} đ/ngày · Tự tính: {soNgayHoc(new Date().getFullYear(), new Date().getMonth()+1, {})} ngày</div>
            )}
            <input type="number" inputMode="numeric" autoFocus value={sheetVal} onChange={(e) => setSheetVal(e.target.value)} placeholder="0" style={{ width: "100%", padding: "14px 12px", borderRadius: 12, border: `1.5px solid ${C.pine}`, fontSize: 18, fontFamily: font.display, fontWeight: 700, color: C.ink, textAlign: "right", marginBottom: 14, outline: "none" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSheetOpen(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1.5px solid ${C.line}`, background: C.card, color: C.sub, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Hủy</button>
              <button onClick={saveSheet} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: C.pine, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Lưu</button>
            </div>
            {sheetKhoan && (
              <button onClick={() => { resetKhoan(r.hs.id, sheetKhoan.key); setSheetOpen(false); }} style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 10, border: "none", background: "none", color: C.pine, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                ↺ Khôi phục mặc định
              </button>
            )}
            {!sheetKhoan && (
              <button onClick={() => { setRec(r.hs.id, { ngayAnManual: false }); setSheetOpen(false); }} style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 10, border: "none", background: "none", color: C.pine, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                ↺ Trả về tự tính
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Bottom Sheet cơ sở =====
function BottomSheet({ open, onClose, title, children }) {
  const sheetRef = useRef(null);
  const startYRef = useRef(null);
  const startTimeRef = useRef(null);
  const dyRef = useRef(0);
  const draggingRef = useRef(false);

  // dat transform truc tiep len DOM -> bam ngon tay 1:1, khong cho React render, khong tre
  const setT = (y, anim) => {
    const el = sheetRef.current; if (!el) return;
    el.style.transition = anim ? "transform .22s cubic-bezier(.32,.72,.35,1)" : "none";
    el.style.transform = `translateY(${y}px)`;
  };

  useEffect(() => { if (open) { dyRef.current = 0; draggingRef.current = false; requestAnimationFrame(() => setT(0, false)); } }, [open]);

  if (!open) return null;

  const onStart = (y) => { startYRef.current = y; startTimeRef.current = Date.now(); dyRef.current = 0; draggingRef.current = true; setT(0, false); };
  const onMove = (y) => {
    if (startYRef.current == null) return;
    const dy = Math.max(0, y - startYRef.current);
    dyRef.current = dy;
    setT(dy, false); // theo ngon tay tuc thi, khong transition
  };
  const onEnd = () => {
    if (startYRef.current == null) return;
    const dy = dyRef.current;
    const dt = Date.now() - (startTimeRef.current || 0);
    const velocity = dy / (dt || 1);
    startYRef.current = null; startTimeRef.current = null; draggingRef.current = false;
    if (dy > 90 || (dy > 30 && velocity > 0.35)) {
      setT((typeof window !== "undefined" ? window.innerHeight : 800), true); // truot xuong roi dong
      setTimeout(onClose, 160);
    } else {
      setT(0, true); // bat lai vi tri cu
    }
  };

  const dragProps = {
    onTouchStart: (e) => onStart(e.touches[0].clientY),
    onTouchMove: (e) => onMove(e.touches[0].clientY),
    onTouchEnd: () => onEnd(),
    onMouseDown: (e) => onStart(e.clientY),
    onMouseMove: (e) => { if (e.buttons === 1) onMove(e.clientY); },
    onMouseUp: () => onEnd(),
    onMouseLeave: (e) => { if (draggingRef.current && e.buttons === 1) onEnd(); },
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,.45)" }} />
      <div ref={sheetRef} style={{
        background: "#fff", borderRadius: "20px 20px 0 0", padding: "0 16px 24px",
        maxHeight: "82vh", overflowY: "auto", boxShadow: "0 -4px 24px rgba(0,0,0,.18)", willChange: "transform",
      }}>
        {/* Vung vuot: nut keo + tieu de, rong rai, touch-action none -> vuot la an lien */}
        <div {...dragProps} style={{ touchAction: "none", cursor: "grab", margin: "0 -16px", padding: "10px 16px 2px", position: "sticky", top: 0, background: "#fff", zIndex: 2 }}>
          <div style={{ width: 44, height: 5, borderRadius: 99, background: C.line, margin: "0 auto 12px" }} />
          {title && <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>{title}</div>}
          <button onClick={onClose} aria-label="Đóng" style={{ position: "absolute", top: 8, right: 10, width: 32, height: 32, borderRadius: 99, border: "none", background: C.graySoft, color: C.sub, fontSize: 17, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ paddingTop: 8 }}>{children}</div>
      </div>
    </div>
  );
}

// ===== Sheet chọn lớp =====
function LopFilterSheet({ open, onClose, chipsLop, lopFilter, setLopFilter, allRows }) {
  const [q, setQ] = useState("");
  const stats = useMemo(() => {
    const s = {};
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

  return (
    <BottomSheet open={open} onClose={onClose} title="Chọn lớp học">
      <div>
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
              <div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${active ? C.pine : C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "border-color .2s" }}>
                {active && <div style={{ width: 12, height: 12, borderRadius: 99, background: C.pine }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: active ? C.pine : C.ink, transition: "color .2s" }}>
                  {id === "all" ? "Tất cả lớp" : ten}
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                  {count} học sinh · Nợ: {fmt(no)} đ
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 20, color: C.sub, fontSize: 13 }}>Không tìm thấy lớp</div>
        )}
      </div>
    </BottomSheet>
  );
}

function ThuPhiTab({ rows, tk, allRows, chipsLop, lopFilter, setLopFilter, thuFilter, setThuFilter, search, setSearch, openId, setOpenId, getLop, setRec, setKhoan, resetKhoan, resetAllKhoan, setNgayAnAll, thuDuNhieu, addPhuThuHS, delPhuThuHS, locked, mData, upMData, setPhieuId, setTab, isWide }) {
  const [fastMode, setFastMode] = useState(false);
  const [lopSheetOpen, setLopSheetOpen] = useState(false);
  const [thuSheetOpen, setThuSheetOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [showNgayAn, setShowNgayAn] = useState(false);
  const [thuLimit, setThuLimit] = useState(50);
  const inputRefs = useRef({});
  const { sentinelRef, shrunk } = useStickyShrink();
  // [UX-I] dem trang thai
  const cnt = { chuaThu: 0, thieu: 0, xong: 0 };
  rows.forEach((r) => {
    if (r.ps.tong > 0 && (r.rec.thucThu || 0) === 0) cnt.chuaThu++;
    else if (r.conNo > 0) cnt.thieu++;
    else if ((r.rec.thucThu || 0) > 0 && r.conNo <= 0) cnt.xong++;
  });
  const batchThuDu = async (onlyNo) => {
    const pairs = rows.filter((r) => !onlyNo || r.conNo > 0).map((r) => ({ sid: r.hs.id, thucThu: r.tongPhaiThu }));
    if (pairs.length === 0) return;
    if (!(await ask(`Đánh "thu đủ" cho ${pairs.length} HS đang hiển thị?\nThao tác này ghi đè số đã thu của từng em.`, { okText: "Thu đủ" }))) return;
    thuDuNhieu(pairs);
    toast(onlyNo ? `Đã thu đủ ${pairs.length} HS còn nợ.` : `Đã thu đủ ${pairs.length} HS đang hiển thị.`);
  };
  const cfgItem = { width: "100%", textAlign: "left", padding: "11px 12px", borderRadius: 9, border: "none", background: "none", color: C.ink, fontWeight: 700, fontSize: 13.5, fontFamily: font.body, cursor: "pointer" };
  const selStyle = { padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, fontFamily: font.body, color: C.ink, background: C.card, minWidth: 0, cursor: "pointer" };
  return (
    <>
      {/* [Tong gop] Thẻ tổng toàn trường: Phải thu + % đã thu + Còn nợ + số HS chưa thu */}
      {(() => {
        const pct = tk.ps > 0 ? Math.min(100, Math.round(tk.thu / tk.ps * 100)) : 0;
        const soChuaThu = (tk.noList || []).filter((x) => x.chua).length;
        return (
          <Card style={{ marginBottom: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 12, color: C.sub }}>Phải thu (toàn trường)</span>
              <span style={{ fontFamily: font.display, fontWeight: 800, fontSize: 20, color: C.ink }}>{fmt(tk.ps)} đ</span>
            </div>
            <div style={{ height: 9, borderRadius: 99, background: C.line, overflow: "hidden", margin: "9px 0 5px" }}>
              <div style={{ width: pct + "%", height: "100%", background: pct >= 100 ? C.green : C.pine, borderRadius: 99, transition: "width .3s" }} />
            </div>
            <div style={{ fontSize: 12.5, color: C.green, fontWeight: 700 }}>Đã thu {pct}% · {fmt(tk.thu)} đ</div>
            <div style={{ display: "flex", gap: 16, marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.line}`, fontSize: 12.5 }}>
              <span style={{ color: tk.no > 0 ? C.coral : C.green, fontWeight: 700 }}>● Còn nợ: {fmt(tk.no)} đ</span>
              <button onClick={() => setThuFilter(thuFilter === "chuaThu" ? "all" : "chuaThu")} style={{ border: "none", background: "none", color: thuFilter === "chuaThu" ? C.pine : C.coral, fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0, textDecoration: thuFilter === "chuaThu" ? "underline" : "none" }}>● {soChuaThu} chưa thu</button>
            </div>
          </Card>
        );
      })()}
      <div ref={sentinelRef} style={{ height: 1 }} />
      <StickyBar shrunk={shrunk}>
      <SearchBar value={search} onChange={setSearch} />
      {/* Lọc gọn: Lớp + Tình trạng thu */}
      {isWide ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <select value={lopFilter} onChange={(e) => setLopFilter(e.target.value)} style={{ ...selStyle, flex: "1 1 110px" }}>
            {chipsLop.map(([id, ten]) => <option key={id} value={id}>{id === "all" ? "Tất cả lớp" : ten}</option>)}
          </select>
          <select value={thuFilter} onChange={(e) => setThuFilter(e.target.value)} style={{ ...selStyle, flex: "1 1 110px" }}>
            {[["all", "Mọi tình trạng"], ["chuaThu", "Chưa thu"], ["thieu", "Thiếu"], ["noCu", "Nợ cũ"], ["thuThua", "Thu thừa"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {!locked && !fastMode && (
            <button onClick={() => setCfgOpen((v) => !v)} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 9, border: `1.5px solid ${C.pine}`, cursor: "pointer", fontWeight: 700, fontSize: 12.5, fontFamily: font.body, background: cfgOpen ? C.pine : C.pineSoft, color: cfgOpen ? "#fff" : C.pine }}>⚙️ Cấu hình</button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <button onClick={() => setLopSheetOpen(true)} style={{ ...selStyle, flex: "1 1 110px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lopFilter === "all" ? "Tất cả lớp" : getLop(lopFilter)?.ten}
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
              <button onClick={() => setCfgOpen((v) => !v)} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 9, border: `1.5px solid ${C.pine}`, cursor: "pointer", fontWeight: 700, fontSize: 12.5, fontFamily: font.body, background: cfgOpen ? C.pine : C.pineSoft, color: cfgOpen ? "#fff" : C.pine }}>⚙️ Cấu hình</button>
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
          <BottomSheet open={thuSheetOpen} onClose={() => setThuSheetOpen(false)} title="Tình trạng thu">
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
          </BottomSheet>
        </>
      )}
      </StickyBar>
      {/* [Cấu hình] gom thao tác hàng loạt vào 1 menu */}
      {!locked && fastMode && (
        <button onClick={() => { setFastMode(false); }} style={{ width: "100%", marginBottom: 10, padding: "11px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5, fontFamily: font.body, background: C.pine, color: "#fff" }}>⛔ Tắt chế độ Tích thu nhanh</button>
      )}
      {!locked && !fastMode && cfgOpen && (
        <Card style={{ marginBottom: 10, padding: 6 }}>
          <button onClick={() => setShowNgayAn((v) => !v)} style={{ ...cfgItem, color: showNgayAn ? C.pine : C.ink }}>🍽️ Áp ngày ăn hàng loạt {showNgayAn ? "▲" : "▼"}</button>
          {showNgayAn && <div style={{ padding: "2px 2px 6px" }}><NgayAnBar onApply={setNgayAnAll} rows={rows} /></div>}
          <button onClick={() => { setFastMode(true); setCfgOpen(false); }} style={cfgItem}>⚡ Bật chế độ Tích thu nhanh</button>
          {(() => { const soNo = rows.filter((r) => r.conNo > 0).length; return (
            <button onClick={() => { if (soNo > 0) { batchThuDu(true); setCfgOpen(false); } }} disabled={soNo === 0} style={{ ...cfgItem, color: soNo > 0 ? C.green : C.gray, cursor: soNo > 0 ? "pointer" : "default" }}>💵 Thu đủ {soNo} HS còn nợ đang hiển thị</button>
          ); })()}
        </Card>
      )}
      {locked && <LockNote />}
      {rows.length === 0 && <EmptyState search={search} onClear={() => { setSearch(""); setLopFilter("all"); setThuFilter("all"); }} />}
      {rows.slice(0, thuLimit).map((r) => {
        const open = openId === r.hs.id;
        if (fastMode) {
          const idx = rows.findIndex((x) => x.hs.id === r.hs.id);
          return (
            <div key={r.hs.id} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, marginBottom: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.hs.ten}</div>
                <div style={{ fontSize: 11.5, color: C.sub }}>cần {fmt(r.tongPhaiThu)}{r.noTruoc > 0 ? ` · 🔴 nợ ${fmt(r.noTruoc)}` : ""}</div>
              </div>
              <input ref={(el) => (inputRefs.current[r.hs.id] = el)} type="text" inputMode="numeric"
                defaultValue={r.rec.thucThu ? Number(r.rec.thucThu).toLocaleString("vi-VN") : ""}
                onFocus={(e) => { e.target.value = r.rec.thucThu ? String(r.rec.thucThu) : ""; e.target.select(); }}
                onBlur={(e) => { const d = e.target.value.replace(/[^\d]/g, ""); setRec(r.hs.id, { thucThu: d === "" ? 0 : Number(d) }); e.target.value = d ? Number(d).toLocaleString("vi-VN") : ""; }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.target.blur(); const next = rows[idx + 1]; if (next) setTimeout(() => inputRefs.current[next.hs.id]?.focus(), 30); } }}
                placeholder="0" style={{ width: 110, padding: "9px 8px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontFamily: font.body, fontSize: 14, color: C.ink, background: "#FAFCFA", textAlign: "right", outline: "none" }} />
              <button onClick={() => { setRec(r.hs.id, { thucThu: r.tongPhaiThu }); if (inputRefs.current[r.hs.id]) inputRefs.current[r.hs.id].value = Number(r.tongPhaiThu).toLocaleString("vi-VN"); }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, width: 40, height: 40, fontSize: 16, cursor: "pointer", flexShrink: 0 }}>✓</button>
            </div>
          );
        }
        return (
          <div key={r.hs.id} style={{ background: C.card, borderRadius: 16, border: `1px solid ${open ? C.pine : C.line}`, marginBottom: 10, overflow: "hidden" }}>
            <div onClick={() => setOpenId(open ? null : r.hs.id)} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: r.hs.nguoiThu === "B" ? C.violetBSoft : C.blueASoft, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontWeight: 700, fontSize: 13, color: r.hs.nguoiThu === "B" ? C.violetB : C.blueA }}>{r.hs.nguoiThu}</div>
                {r.noTruoc > 0 && <div title="có nợ tháng trước" style={{ position: "absolute", top: -3, right: -3, width: 11, height: 11, borderRadius: 99, background: C.coral, border: "2px solid #fff" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{r.hs.ten}{r.ps.suaCount > 0 && <span title="có khoản đã sửa" style={{ color: C.amber, fontSize: 12 }}> ⚠</span>}</div>
                <div style={{ fontSize: 11.5, color: C.sub, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 1 }}><span>{r.lop?.ten}</span><PLBadge pl={r.hs.pl} />{r.nghi > 0 ? <span>· nghỉ {r.nghi}</span> : null}</div>
                {r.noTruoc !== 0 && <div style={{ fontSize: 11, fontWeight: 700, marginTop: 1, color: r.noTruoc > 0 ? C.coral : C.green }}>{r.noTruoc > 0 ? `🔴 Nợ cũ ${fmt(r.noTruoc)}` : `🟢 Dư cũ ${fmt(-r.noTruoc)}`}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "right" }}><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 16, color: C.ink }}>{fmt(r.tongPhaiThu)}</div><Badge s={r.st} /></div>
                <button onClick={(e) => { e.stopPropagation(); setPhieuId(r.hs.id); setTab("phieu"); }} title="Xem phiếu thu" style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", padding: 2 }}>🧾</button>
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
        <button onClick={() => setThuLimit((l) => l + 50)} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1.5px solid ${C.pine}`, background: C.pineSoft, color: C.pine, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>Hiện thêm 50 HS ({Math.min(thuLimit, rows.length)}/{rows.length})</button>
      )}
      <ThuNgoai mData={mData} upMData={upMData} locked={locked} />
      <KhoanThuLop mData={mData} upMData={upMData} locked={locked} classes={chipsLop.slice(1).map(([id, ten]) => ({ id, ten }))} rows={rows} lopFilter={lopFilter} />
    </>
  );
}

function ThuNgoai({ mData, upMData, locked }) {
  const tn = mData.thuNgoai || [];
  const [ten, setTen] = useState(""); const [so, setSo] = useState("");
  const add = () => { if (!ten.trim()) return; upMData({ ...mData, thuNgoai: [...tn, { id: uid(), ten: ten.trim(), soTien: Number(so) || 0, thucThu: 0, nguoiThu: "A" }] }); setTen(""); setSo(""); };
  const set = (id, p) => upMData({ ...mData, thuNgoai: tn.map((k) => (k.id === id ? { ...k, ...p } : k)) });
  const del = (id) => upMData({ ...mData, thuNgoai: tn.filter((k) => k.id !== id) });
  return (
    <Card style={{ marginTop: 4 }}>
      <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, marginBottom: 8 }}>💧 Thu ngoài (KV4)</div>
      {tn.map((k) => (
        <div key={k.id} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ flex: "1 1 120px", fontSize: 13.5, fontWeight: 600, minWidth: 0 }}>{k.ten} <span style={{ color: C.sub, fontWeight: 400 }}>({fmt(k.soTien)})</span></div>
          <NumInput value={k.thucThu} onChange={(v) => set(k.id, { thucThu: v })} w={100} disabled={locked} />
          <ABBtn val={k.nguoiThu} set={(p) => set(k.id, { nguoiThu: p })} small disabled={locked} />
          {!locked && <button onClick={() => del(k.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", padding: 4 }}>🗑</button>}
        </div>
      ))}
      {!locked && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên khoản (VD: Quỹ CSVC)" style={{ flex: "2 1 140px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, minWidth: 0, fontFamily: font.body }} />
          <input type="number" value={so} onChange={(e) => setSo(e.target.value)} placeholder="Số tiền" style={{ flex: "1 1 90px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, minWidth: 0, fontFamily: font.body }} />
          <button onClick={add} style={{ background: C.pine, color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer" }}>+ Thêm</button>
        </div>
      )}
    </Card>
  );
}

// Khoan thu ap cho 1 LOP cu the -> them phuThu vao HS thuoc lop do trong thang
function KhoanThuLop({ mData, upMData, locked, classes, rows, lopFilter }) {
  if (locked) return null;
  const [ten, setTen] = useState(""); const [so, setSo] = useState("");
  const [coDinh, setCoDinh] = useState(false);
  const [lopAp, setLopAp] = useState(lopFilter !== "all" ? lopFilter : (classes[0]?.id || ""));
  const targets = rows.filter((r) => r.lopId === lopAp);
  const apply = () => {
    if (!ten.trim() || !so || !lopAp) return;
    const ids = targets.map((r) => r.hs.id);
    if (ids.length === 0) { toast("Lớp này chưa có HS trong tháng."); return; }
    const fees = { ...mData.fees };
    ids.forEach((sid) => {
      const cur = fees[sid]; if (!cur) return;
      fees[sid] = { ...cur, phuThu: [...(cur.phuThu || []), { id: uid(), ten: ten.trim() + (coDinh ? " (cố định)" : ""), soTien: Number(so), lop: lopAp, coDinh }] };
    });
    upMData({ ...mData, fees });
    setTen(""); setSo("");
    toast(`Đã thêm "${ten.trim()}" cho ${ids.length} HS lớp ${classes.find((c) => c.id === lopAp)?.ten}.`);
  };
  return (
    <Card style={{ marginTop: 10, background: C.blueASoft, borderColor: "#C7DCF3" }}>
      <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, marginBottom: 4, color: C.blueA }}>➕ Khoản thu áp cho cả lớp</div>
      <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 8 }}>Chọn lớp + nhập khoản → cộng vào mọi HS lớp đó tháng này. <b>Cố định</b> = khoản lặp hàng tháng; <b>không cố định</b> = chỉ tháng này. Sửa/xóa lẻ ở thẻ HS.</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        <select value={lopAp} onChange={(e) => setLopAp(e.target.value)} style={{ flex: "1 1 120px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid #C7DCF3`, fontSize: 13, minWidth: 0, fontFamily: font.body, background: "#fff" }}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.ten} ({rows.filter((r) => r.lopId === c.id).length} HS)</option>)}
        </select>
        <div style={{ display: "inline-flex", borderRadius: 9, overflow: "hidden", border: `1.5px solid #C7DCF3` }}>
          <button onClick={() => setCoDinh(false)} style={{ padding: "8px 12px", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer", background: !coDinh ? C.blueA : "#fff", color: !coDinh ? "#fff" : C.sub, fontFamily: font.body }}>Không cố định</button>
          <button onClick={() => setCoDinh(true)} style={{ padding: "8px 12px", fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer", background: coDinh ? C.blueA : "#fff", color: coDinh ? "#fff" : C.sub, fontFamily: font.body }}>Cố định</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên khoản (VD: Dã ngoại / Đầu năm)" style={{ flex: "2 1 150px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid #C7DCF3`, fontSize: 13, minWidth: 0, fontFamily: font.body }} />
        <input type="number" value={so} onChange={(e) => setSo(e.target.value)} placeholder="Số tiền" style={{ flex: "1 1 90px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid #C7DCF3`, fontSize: 13, minWidth: 0, fontFamily: font.body }} />
        <button onClick={apply} style={{ background: C.blueA, color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer" }}>Áp dụng</button>
      </div>
    </Card>
  );
}

// ====================================================================
function CongNoTab({ students, meta, ym, mData }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tongNo, setTongNo] = useState(0);
  const [tongDu, setTongDu] = useState(0);
  const [noFilter, setNoFilter] = useState("all");
  const [showDetail, setShowDetail] = useState(null);
  const { sentinelRef, shrunk } = useStickyShrink();

  useEffect(() => { (async () => {
    setLoading(true);
    const keys = await sList("mn5:thang:");
    const months = keys.map((k) => k.replace("mn5:thang:", "")).filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
    const perHS = {};
    students.forEach((hs) => { perHS[hs.id] = { hs, phaiThu: 0, daThu: 0, chiTiet: [], noDauKy: hs.noDauKy || 0 }; });
    for (const m of months) {
      const td = await sGet(`mn5:thang:${m}`);
      if (!td?.fees) continue;
      // [UX-X] tru nghi theo diem danh thang TRUOC cua m
      const y = Number(m.slice(0, 4)), mo = Number(m.slice(5));
      const pm = mo === 1 ? 12 : mo - 1, py = mo === 1 ? y - 1 : y;
      const ddPrevM = (await sGet(`mn5:dd:${ymKey(py, pm)}`)) || {};
      Object.keys(td.fees).forEach((sid) => {
        if (!perHS[sid]) return;
        const rec = td.fees[sid];
        const hs = perHS[sid].hs;
        const lopId = lopOfMonth(hs, m);
        const lop = meta.classes.find((c) => c.id === lopId);
        const nghi = Object.keys(ddPrevM[sid] || {}).length;
        const ps = tinhPSFromRec(hs, rec, lop, nghi).tong;
        const tt = Number(rec.thucThu) || 0;
        perHS[sid].phaiThu += ps; perHS[sid].daThu += tt;
        perHS[sid].chiTiet.push({ thang: m, ps, tt, no: ps - tt });
      });
    }
    let tNo = 0, tDu = 0;
    const arr = Object.values(perHS).map((x) => {
      const luyKe = x.noDauKy + x.phaiThu - x.daThu; // >0 no, <0 du
      if (luyKe > 0) tNo += luyKe; else tDu += -luyKe;
      return { ...x, luyKe };
    }).sort((a, b) => b.luyKe - a.luyKe);
    setData(arr); setTongNo(tNo); setTongDu(tDu); setLoading(false);
  })(); }, [students, meta, ym, mData]);

  if (loading) return <div style={{ textAlign: "center", color: C.sub, fontSize: 13.5, padding: 30 }}>Đang tính công nợ lũy kế…</div>;
  const noList = data.filter((x) => x.luyKe > 0);
  const duList = data.filter((x) => x.luyKe < 0);

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <Card style={{ flex: 1, background: C.coralSoft, borderColor: "#EFC9BF", padding: "12px 14px" }}>
          <div style={{ fontSize: 12, color: C.coral, fontWeight: 600 }}>Tổng nợ ({noList.length} HS)</div>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 20, color: C.coral }}>{fmt(tongNo)} đ</div>
        </Card>
        <Card style={{ flex: 1, background: C.greenSoft, borderColor: "#BFE3CC", padding: "12px 14px" }}>
          <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Đóng dư ({duList.length} HS)</div>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 20, color: C.green }}>{fmt(tongDu)} đ</div>
        </Card>
      </div>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>Lũy kế xuyên tháng, bù trừ thừa/thiếu. Bao gồm cả HS đã nghỉ học còn nợ.</div>
      <div ref={sentinelRef} style={{ height: 1 }} />
      <StickyBar shrunk={shrunk}>
        <Chips items={[["all", "Tất cả"], ["g500", "Nợ > 500k"], ["g1tr", "Nợ > 1 triệu"], ["m3", "Nợ ≥ 3 tháng"], ["thua", "Thu thừa"]]} val={noFilter} set={setNoFilter} />
      </StickyBar>

      {(() => {
        const soThangNo = (x) => (x.chiTiet || []).filter((c) => c.no > 0).length;
        const filtered = data.filter((x) => {
          if (noFilter === "thua") return x.luyKe < 0;
          if (noFilter === "g500") return x.luyKe > 500000;
          if (noFilter === "g1tr") return x.luyKe > 1000000;
          if (noFilter === "m3") return x.luyKe > 0 && soThangNo(x) >= 3;
          return x.luyKe !== 0;
        });
        if (filtered.length === 0) return <div style={{ textAlign: "center", color: C.green, fontSize: 14, fontWeight: 600, padding: 20 }}>✓ Không có HS phù hợp bộ lọc</div>;
        return filtered.map((x) => {
        const open = showDetail === x.hs.id;
        return (
          <div key={x.hs.id} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.line}`, marginBottom: 8, overflow: "hidden" }}>
            <div onClick={() => setShowDetail(open ? null : x.hs.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{x.hs.ten}</div>
                <div style={{ fontSize: 11.5, color: TT_COLOR[x.hs.trangThai] }}>{x.hs.trangThai}{x.noDauKy ? ` · nợ đầu kỳ ${fmt(x.noDauKy)}` : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, color: x.luyKe > 0 ? C.coral : C.green }}>{x.luyKe > 0 ? fmt(x.luyKe) : "+" + fmt(-x.luyKe)}</div>
                <div style={{ fontSize: 11, color: C.sub }}>{x.luyKe > 0 ? "còn nợ" : "đóng dư"}</div>
              </div>
            </div>
            {open && (
              <div style={{ borderTop: `1px dashed ${C.line}`, padding: "10px 14px", background: "#FBFDFB", fontSize: 12.5 }}>
                {x.noDauKy > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: C.sub }}><span>Nợ đầu kỳ</span><b>{fmt(x.noDauKy)}</b></div>}
                {x.chiTiet.map((c) => (
                  <div key={c.thang} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: c.no > 0 ? C.coral : c.no < 0 ? C.green : C.sub }}>
                    <span>Th{c.thang.slice(5)}: phải {fmt(c.ps)} · thu {fmt(c.tt)}</span>
                    <b>{c.no > 0 ? fmt(c.no) : c.no < 0 ? "+" + fmt(-c.no) : "0"}</b>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTop: `1px solid ${C.line}`, fontWeight: 700 }}><span>Lũy kế</span><span style={{ color: x.luyKe > 0 ? C.coral : C.green }}>{x.luyKe > 0 ? fmt(x.luyKe) : "+" + fmt(-x.luyKe)} đ</span></div>
              </div>
            )}
          </div>
        );
      });
      })()}
    </>
  );
}

// ====================================================================
// [UX-Q] Ma BIN ngan hang cho VietQR
const BANK_BIN = { "vietcombank": "970436", "vcb": "970436", "techcombank": "970407", "tcb": "970407", "bidv": "970418", "vietinbank": "970415", "ctg": "970415", "agribank": "970405", "mbbank": "970422", "mb": "970422", "acb": "970416", "vpbank": "970432", "vpb": "970432", "tpbank": "970423", "tpb": "970423", "sacombank": "970403", "stb": "970403", "hdbank": "970437", "vib": "970441", "shb": "970443", "ocb": "970448", "msb": "970426", "scb": "970429", "eximbank": "970431", "lienvietpostbank": "970449", "lpbank": "970449", "seabank": "970440", "bacabank": "970409", "vietabank": "970427", "namabank": "970428", "pgbank": "970430", "vietbank": "970433", "baovietbank": "970438", "kienlongbank": "970452", "abbank": "970425", "dongabank": "970406", "gpbank": "970408", "ncb": "970419", "saigonbank": "970400", "pvcombank": "970412" };
function binOf(nh) { const k = noDau(nh || "").replace(/[^a-z]/g, ""); return BANK_BIN[k] || null; }
function QRBox({ bank, amount, noiDung }) {
  const bin = binOf(bank?.nh);
  const [err, setErr] = useState(false);
  if (!bin || !bank?.stk || err) {
    return <div style={{ width: 88, height: 88, borderRadius: 8, background: "#fff", border: `1.5px solid ${C.pine}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.sub, textAlign: "center", flexShrink: 0, padding: 4 }}>{bin ? "QR" : "QR (ngân hàng chưa hỗ trợ)"}</div>;
  }
  const url = `https://img.vietqr.io/image/${bin}-${bank.stk}-compact.png?` + (amount > 0 ? `amount=${Math.round(amount)}&` : "") + `addInfo=${encodeURIComponent(noiDung || "")}`;
  return <img src={url} alt="QR chuyển khoản" onError={() => setErr(true)} style={{ width: 88, height: 88, borderRadius: 8, background: "#fff", border: `1.5px solid ${C.pine}`, flexShrink: 0, objectFit: "contain" }} />;
}

function PhieuThu({ phieuRow, allRows, setPhieuId, getLop, meta, month, year, upMeta, mData, upMData }) {
  const nguoiThu = phieuRow.hs.nguoiThu;
  const bienLai = phieuRow.rec.bienLai || null; // da co so bien lai chua
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
      <select className="no-print" value={phieuRow.hs.id} onChange={(e) => setPhieuId(e.target.value)} style={{ width: "100%", padding: "11px 12px", borderRadius: 12, marginBottom: 14, border: `1.5px solid ${C.line}`, fontFamily: font.body, fontSize: 14, color: C.ink, background: C.card }}>
        {allRows.filter((r) => r.coRec).map((r) => <option key={r.hs.id} value={r.hs.id}>{r.hs.ten} — {r.lop?.ten}</option>)}
      </select>
      <div id="phieu-in" style={{ background: "#FFFEF9", borderRadius: 4, padding: "0 0 18px", boxShadow: "0 4px 18px rgba(28,53,48,.12)" }}>
        <div style={{ height: 10, background: `linear-gradient(45deg, transparent 33.33%, #FFFEF9 33.33%, #FFFEF9 66.66%, transparent 66.66%), linear-gradient(-45deg, transparent 33.33%, #FFFEF9 33.33%, #FFFEF9 66.66%, transparent 66.66%)`, backgroundColor: C.bg, backgroundSize: "14px 20px" }} />
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: C.sub }}>{bienLai ? <b style={{ color: C.ink, fontSize: 12 }}>{bienLai}</b> : "Số: (cấp khi in)"}</div>
            <div style={{ fontSize: 11, color: C.sub }}>Ngày: {new Date().toLocaleDateString("vi-VN")}</div>
          </div>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 19, color: C.pine }}>PHIẾU THU HỌC PHÍ</div>
            <div style={{ fontSize: 12.5, color: C.sub }}>Tháng {month}/{year} — {meta.tenTruong}</div>
          </div>
          <div style={{ fontSize: 13.5, marginBottom: 10 }}><b>{phieuRow.hs.ten}</b> · {phieuRow.lop?.ten} · Mã {phieuRow.hs.id.toUpperCase()}</div>
          <div style={{ fontSize: 13.5 }}>
            {phieuRow.ps.dong.map(([l, v], i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3.5px 0", borderBottom: `1px dotted ${C.line}` }}><span style={{ color: C.sub }}>{l}</span><span>{fmt(v)}</span></div>))}
            {phieuRow.noTruoc !== 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "3.5px 0", borderBottom: `1px dotted ${C.line}`, color: phieuRow.noTruoc > 0 ? C.coral : C.green }}><span>{phieuRow.noTruoc > 0 ? "Nợ tháng trước" : "Dư tháng trước"}</span><span>{phieuRow.noTruoc > 0 ? fmt(phieuRow.noTruoc) : "−" + fmt(-phieuRow.noTruoc)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0 3px", fontFamily: font.display, fontWeight: 800, fontSize: 16 }}><span>TỔNG PHẢI THU</span><span>{fmt(phieuRow.tongPhaiThu)} đ</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: C.sub }}>Đã thu</span><span>{fmt(phieuRow.rec.thucThu)} đ</span></div>
            {phieuRow.conNo !== 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: phieuRow.conNo > 0 ? C.coral : C.amber, fontWeight: 600 }}><span>{phieuRow.conNo > 0 ? "Còn nợ" : "Thu thừa"}</span><span>{fmt(Math.abs(phieuRow.conNo))} đ</span></div>}
          </div>
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: C.pineSoft, display: "flex", gap: 12, alignItems: "center" }}>
            <QRBox bank={meta.bank[nguoiThu]} amount={Math.max(0, phieuRow.conNo)} noiDung={`Hoc phi ${phieuRow.hs.ten} T${month}`} />
            <div style={{ fontSize: 12.5, lineHeight: 1.5 }}><b>Chuyển khoản cho {nguoiThu}</b><br />{meta.bank[nguoiThu].chu}<br />{meta.bank[nguoiThu].stk} · {meta.bank[nguoiThu].nh}</div>
          </div>
        </div>
      </div>
      <button className="no-print" onClick={inPhieu} style={{ marginTop: 14, width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>{bienLai ? "🖨 In / Lưu PDF" : "✓ Cấp số biên lai & In"}</button>
    </>
  );
}

// ====================================================================
// [UX-R] Donut chart SVG
function Donut({ pct, color, size = 76 }) {
  const r = (size - 10) / 2, c = size / 2, circ = 2 * Math.PI * r;
  const dash = circ * Math.min(100, pct) / 100;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={C.graySoft} strokeWidth={8} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} />
      <text x={c} y={c + 5} textAnchor="middle" fontSize={16} fontWeight={800} fill={C.ink} fontFamily={font.display}>{pct}%</text>
    </svg>
  );
}

function DashTab({ tk, mData, upMData, month, year, locked, meta, allRows, delThang, students, ym, upMeta, setTab }) {
  // [COLLAPSE] Trang thai dong/mo cac khoi
  const [openCards, setOpenCards] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("dashOpenCards") : null;
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return { vanHanh: true, kd: true, tienMat: false, loiNhuan: false, lichSu: false, chiPhi: true };
  });
  const toggleCard = (key) => {
    setOpenCards((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("dashOpenCards", JSON.stringify(next));
      return next;
    });
  };
  // [DELETE PROTECT] Bao ve nut xoa bang thu
  const [showDelConfirm, setShowDelConfirm] = useState(false);
  const [delConfirmText, setDelConfirmText] = useState("");
  // [TOP NO] Thu gon top HS no
  const [topNoLimit, setTopNoLimit] = useState(3);
  // [DU NO] Luy ke "dang giu" + lich su lai theo tung thang
  const [luyKe, setLuyKe] = useState(null);
  const [lichSu, setLichSu] = useState(null);
  // [Dot1] 4 bottom sheet: canh bao / chi phi / loi nhuan / lich su
  const [sheetCB, setSheetCB] = useState(false);
  const [sheetCP, setSheetCP] = useState(false);
  const [sheetLN, setSheetLN] = useState(false);
  const [sheetLS, setSheetLS] = useState(false);
  useEffect(() => {
    let huy = false;
    (async () => {
      const dk = meta?.soDuDauKy || {};
      let giuA = dk.tienMatA || 0, giuB = dk.tienMatB || 0;
      let noNCC = 0; // luy ke no nha cung cap
      const keys = (await sList("mn5:thang:")).filter((k) => /mn5:thang:\d{4}-\d{2}$/.test(k)).map((k) => k.replace("mn5:thang:", "")).filter((m) => m <= ym).sort();
      const ls = [];
      for (const m of keys) {
        const td = await sGet(`mn5:thang:${m}`); if (!td) continue;
        const my = Number(m.slice(0, 4)), mmo = Number(m.slice(5));
        const pmo = mmo === 1 ? 12 : mmo - 1, pyy = mmo === 1 ? my - 1 : my;
        const ddPrevM = (await sGet(`mn5:dd:${ymKey(pyy, pmo)}`)) || {};
        let thuA = 0, thuB = 0, chiA = 0, chiB = 0, traA = 0, traB = 0, psA = 0, psB = 0;
        let thangNoNCC = 0;
        Object.entries(td.fees || {}).forEach(([sid, rec]) => {
          const hs = students.find((s) => s.id === sid); if (!hs) return;
          const tt = Number(rec.thucThu) || 0;
          if (hs.nguoiThu === "A") thuA += tt; else if (hs.nguoiThu === "B") thuB += tt;
          const lop = meta.classes.find((c) => c.id === lopOfMonth(hs, m));
          const nghi = Object.keys(ddPrevM[sid] || {}).length;
          const ps = tinhPSFromRec(hs, rec, lop, nghi).tong;
          if (hs.nguoiThu === "A") psA += ps; else if (hs.nguoiThu === "B") psB += ps;
        });
        (td.thuNgoai || []).forEach((k) => {
          const tt = Number(k.thucThu) || 0, st = Number(k.soTien) || 0;
          if (k.nguoiThu === "A") { thuA += tt; psA += st; } else if (k.nguoiThu === "B") { thuB += tt; psB += st; }
        });
        (td.chiPhi || []).forEach((c) => {
          const e = Number(c.soTien) || 0, kk = Number(c.daTra) || 0;
          if (c.loai === "CHUYEN") { if (c.huong === "A->B") { thuA -= e; thuB += e; } else { thuB -= e; thuA += e; } return; }
          if (c.loai === "NO_AB") return;
          if (c.nguoiChi === "A") { chiA += e; traA += kk; } else { chiB += e; traB += kk; }
          thangNoNCC += (e - kk); // chi chua tra
        });
        noNCC += thangNoNCC;
        giuA += thuA - traA; giuB += thuB - traB;
        const [yy, mm] = m.split("-");
        const psThang = psA + psB, chiThang = chiA + chiB, thuThang = thuA + thuB, traThang = traA + traB;
        ls.push({ thang: `T${Number(mm)}/${yy}`, mm: Number(mm), yy: Number(yy), laiKeToan: psThang - chiThang, laiTienMat: thuThang - traThang, psThang, chiThang, thuThang, traThang, noNCC, thuA, thuB, traA, traB, chiA, chiB, giuACum: giuA, giuBCum: giuB, deltaA: thuA - traA, deltaB: thuB - traB });
      }
      if (!huy) { setLuyKe({ giuA, giuB, noNCC }); setLichSu(ls); }
    })();
    return () => { huy = true; };
  }, [meta, students, ym, mData]);

  const cp = mData.chiPhi || [];
  const [nd, setNd] = useState(""); const [so, setSo] = useState(""); const [ng, setNg] = useState("A"); const [loai, setLoai] = useState("PHAT_SINH"); const [huong, setHuong] = useState("A->B");
  const [showCoDinh, setShowCoDinh] = useState(true);
  const add = () => {
    if (loai === "TRA_NO") {
      if (!nd.trim()) return;
      upMData({ ...mData, chiPhi: [...cp, { id: uid(), noiDung: nd.trim(), soTien: 0, nguoiChi: ng, daTra: Number(so) || 0, loai: "TRA_NO" }] });
      setNd(""); setSo(""); return;
    }
    if (!so) return;
    if (loai === "CHUYEN") { upMData({ ...mData, chiPhi: [...cp, { id: uid(), noiDung: nd.trim() || "Chuyển tiền", soTien: Number(so), loai: "CHUYEN", huong, daTra: 0 }] }); setNd(""); setSo(""); return; }
    if (!nd.trim()) return;
    const item = { id: uid(), noiDung: nd.trim(), soTien: Number(so), nguoiChi: ng, daTra: 0, loai }; if (loai === "NO_AB") item.huong = huong;
    upMData({ ...mData, chiPhi: [...cp, item] }); setNd(""); setSo("");
  };
  const set = (id, p) => upMData({ ...mData, chiPhi: cp.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const del = (id) => upMData({ ...mData, chiPhi: cp.filter((c) => c.id !== id) });
  // [Dot2] tra du tat ca khoan co dinh + phat sinh dang con thieu
  const traDuTatCa = async () => {
    const targets = cp.filter((c) => (c.loai === "CO_DINH" || c.loai === "PHAT_SINH") && (Number(c.soTien) || 0) > 0 && (Number(c.daTra) || 0) < (Number(c.soTien) || 0));
    if (targets.length === 0) { toast("Không còn khoản nào cần trả đủ."); return; }
    if (!(await ask(`Đánh "đã trả đủ" cho ${targets.length} khoản đang còn thiếu?\n(chỉ áp khoản Cố định + Phát sinh đã nhập số tiền)`, { okText: "Trả đủ hết" }))) return;
    const ids = new Set(targets.map((c) => c.id));
    upMData({ ...mData, chiPhi: cp.map((c) => ids.has(c.id) ? { ...c, daTra: Number(c.soTien) || 0 } : c) });
    logAction(`Trả đủ hàng loạt ${targets.length} khoản chi (T${ym})`);
    toast(`Đã đánh trả đủ ${targets.length} khoản.`);
  };
  const themCoDinhMau = () => {
    const co = ["Lương giáo viên", "Thực phẩm 1", "Thực phẩm 2", "Tiền điện", "Tiền nước"].filter((t) => !cp.some((c) => c.noiDung === t && c.loai === "CO_DINH"));
    if (!co.length) { setShowCoDinh((v) => !v); return; }
    upMData({ ...mData, chiPhi: [...cp, ...co.map((t) => ({ id: uid(), noiDung: t, soTien: 0, nguoiChi: "A", loai: "CO_DINH", daTra: 0 }))] });
    toast(`Đã thêm ${co.length} khoản cố định.`);
    setShowCoDinh(true);
  };
  const tongChi = tk.chiA + tk.chiB, tongTra = tk.traA + tk.traB;
  const lnKeToan = tk.ps - tongChi;
  const lnTienMat = tk.thu - tongTra;
  const tyLeA = meta?.tyLeLaiA ?? 50;
  const noAB = tk.noAB_AtoB - tk.noAB_BtoA;
  const noNCC = tongChi - tongTra;
  const tongTienMat = (luyKe ? luyKe.giuA + luyKe.giuB : (tk.A - tk.traA) + (tk.B - tk.traB));

  const chotThang = async () => {
    const chuaThu = allRows.filter((r) => r.coRec && r.ps.tong > 0 && (r.rec.thucThu || 0) === 0).length;
    const ngayAn0 = allRows.filter((r) => r.coRec && r.hs.pl !== "GV" && r.hs.pl !== "T7" && (r.rec.ngayAn || 0) === 0).length;
    let cb = [];
    if (ngayAn0) cb.push(`• ${ngayAn0} HS có ngày ăn = 0`);
    if (chuaThu) cb.push(`• ${chuaThu} HS chưa thu`);
    const msg = `Chốt tháng ${month}/${year}?\n` + (cb.length ? "\nLưu ý:\n" + cb.join("\n") + "\n" : "") + "\nSau khi chốt sẽ khóa (mở lại được).";
    if (await ask(msg, { okText: "Chốt tháng" })) {
      const noLuyKe = {};
      allRows.forEach((r) => { if (r.coRec) noLuyKe[r.hs.id] = r.conNo; });
      await upMData({ ...mData, daChot: true, noLuyKe });
      logAction(`Chốt tháng ${month}/${year}`);
      toast("Đã chốt tháng.");
    }
  };
  const moChot = async () => { if (await ask("Mở khóa tháng đã chốt để chỉnh sửa lại?", { okText: "Mở khóa" })) { const { noLuyKe, ...rest } = mData; await upMData({ ...rest, daChot: false }); logAction(`Mở khóa tháng ${month}/${year}`); toast("Đã mở khóa."); } };

  const giuThangA = tk.A - tk.traA, giuThangB = tk.B - tk.traB;

  // [CARD HEADER] Helper
  const CardHeader = ({ icon, title, cardKey, children }) => (
    <div onClick={() => toggleCard(cardKey)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "12px 14px", borderBottom: openCards[cardKey] ? `1px solid ${C.line}` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, color: C.ink }}>{title}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {children}
        <span style={{ fontSize: 14, color: C.sub, transition: "transform .2s", transform: openCards[cardKey] ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </div>
    </div>
  );

  // [Dot1] So lieu cho cac the tom tat Dashboard
  const recRows0 = allRows.filter((r) => r.coRec);
  const dashTong = students.length;
  const dashDangHoc = students.filter((s) => s.trangThai === "Đang học").length;
  const canThuAll = recRows0.reduce((a, r) => a + r.tongPhaiThu, 0);
  const daThuAll = recRows0.reduce((a, r) => a + (r.rec.thucThu || 0), 0);
  const tyLeThu = canThuAll > 0 ? Math.round(daThuAll / canThuAll * 100) : 100;
  const noRows = recRows0.filter((r) => r.conNo > 0);
  const conNoAll = noRows.reduce((a, r) => a + r.conNo, 0);
  const cpKhoan = cp.filter((c) => c.loai === "CO_DINH" || c.loai === "PHAT_SINH");
  const cpXong = (c) => (Number(c.soTien) || 0) > 0 && (Number(c.daTra) || 0) >= (Number(c.soTien) || 0);
  const cpDone = cpKhoan.filter(cpXong);
  const cpChua = cpKhoan.filter((c) => !cpXong(c));
  const cpPct = cpKhoan.length > 0 ? Math.round(cpDone.length / cpKhoan.length * 100) : 0;
  const cbGroups = [
    ["Học phí/khoản sửa tay", recRows0.filter((r) => r.ps.suaCount > 0), C.amber],
    ["Thu thừa", recRows0.filter((r) => r.conNo < 0), C.blueA],
    ["Ngày ăn = 0", recRows0.filter((r) => r.hs.pl !== "GV" && r.hs.pl !== "T7" && (r.rec.ngayAn || 0) === 0), C.coral],
  ].filter((g) => g[1].length > 0);
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
          <Donut pct={tyLeThu} color={tyLeThu >= 80 ? C.green : tyLeThu >= 50 ? C.amber : C.coral} size={66} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 18, marginBottom: 8 }}>
              <div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 19, color: C.ink }}>{dashTong}</div><div style={{ fontSize: 10.5, color: C.sub }}>Tổng HS</div></div>
              <div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 19, color: C.green }}>{dashDangHoc}</div><div style={{ fontSize: 10.5, color: C.sub }}>Đang học</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "1px 0" }}><span style={{ color: C.sub }}>Cần thu</span><b>{fmt(canThuAll)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "1px 0" }}><span style={{ color: C.sub }}>Đã thu ({tyLeThu}%)</span><b style={{ color: C.green }}>{fmt(daThuAll)}</b></div>
          </div>
        </div>
        {noRows.length > 0 && (
          <button onClick={() => setTab && setTab("no")} style={{ width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 9, border: `1px solid #EFC9BF`, background: C.coralSoft, color: C.coral, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>🔴 {noRows.length} HS còn nợ — {fmt(conNoAll)} đ ❯</button>
        )}
      </Card>

      {/* ===== KHỐI 3: THANH CẢNH BÁO ===== */}
      {cbGroups.length > 0 && (
        <button onClick={() => setSheetCB(true)} style={{ width: "100%", textAlign: "left", marginBottom: 12, padding: "10px 14px", borderRadius: 12, border: `1px solid #EAD8A0`, background: C.amberSoft, color: "#7A5E12", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🚨 Cảnh báo: {cbGroups.map((g) => `${g[0]} (${g[1].length})`).join(" · ")}</span>
          <span style={{ flexShrink: 0, fontWeight: 700 }}>❯</span>
        </button>
      )}

      {/* ===== KHỐI 4: THẺ CHI PHÍ CHECKLIST ===== */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>💸</span><span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>Chi phí tháng {month}</span></div>
          <span style={{ fontSize: 12, color: C.sub }}>Tổng chi: <b style={{ color: C.ink }}>{fmt(tongChi)}</b></span>
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 6 }}>📊 {cpDone.length}/{cpKhoan.length} khoản đã xử lý</div>
        <div style={{ height: 8, borderRadius: 99, background: C.line, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: cpPct + "%", height: "100%", background: cpPct >= 100 ? C.green : C.pine, borderRadius: 99, transition: "width .3s" }} />
        </div>
        {cpChua.slice(0, 2).map((c) => (
          <div key={c.id} style={{ fontSize: 13, color: C.ink, padding: "3px 0" }}>🔴 {c.noiDung}: <span style={{ color: C.coral, fontWeight: 600 }}>{(Number(c.daTra) || 0) > 0 ? "Trả 1 phần" : "Chưa trả"}</span></div>
        ))}
        {cpKhoan.length > 0 && cpChua.length === 0 && <div style={{ fontSize: 13, color: C.green, fontWeight: 600, padding: "3px 0" }}>✓ Đã xử lý hết các khoản chi</div>}
        {cpKhoan.length === 0 && <div style={{ fontSize: 13, color: C.sub, padding: "3px 0" }}>Chưa có khoản chi nào — bấm Quản lý để thêm.</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={() => setSheetCP(true)} style={drillBtn}>Quản lý ❯</button>
        </div>
      </Card>

      {/* ===== KHỐI 5: THẺ LỢI NHUẬN & CHIA QUỸ ===== */}
      <Card style={{ marginBottom: 12, background: C.greenSoft, borderColor: "#BFE3CC" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><span style={{ fontSize: 16 }}>🤝</span><span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>Lợi nhuận & chia quỹ</span></div>
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: C.card, borderRadius: 10 }}><div style={{ fontSize: 10.5, color: C.green, fontWeight: 600 }}>LN kế toán</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: lnKeToan < 0 ? C.coral : C.green }}>{fmt(lnKeToan)}</div></div>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: C.card, borderRadius: 10 }}><div style={{ fontSize: 10.5, color: C.blueA, fontWeight: 600 }}>LN tiền mặt</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: lnTienMat < 0 ? C.coral : C.blueA }}>{fmt(lnTienMat)}</div></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: C.card, borderRadius: 10 }}><div style={{ fontSize: 10.5, color: C.blueA, fontWeight: 600 }}>Quỹ A giữ</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: (luyKe?.giuA ?? 0) < 0 ? C.coral : C.blueA }}>{luyKe ? fmt(luyKe.giuA) : "…"}</div></div>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: C.card, borderRadius: 10 }}><div style={{ fontSize: 10.5, color: C.violetB, fontWeight: 600 }}>Quỹ B giữ</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: (luyKe?.giuB ?? 0) < 0 ? C.coral : C.violetB }}>{luyKe ? fmt(luyKe.giuB) : "…"}</div></div>
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
        ? <button onClick={chotThang} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.gold}`, background: C.goldSoft, color: "#7A5E12", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>🔒 Chốt tháng {month}/{year}</button>
        : <button onClick={moChot} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.card, color: C.sub, fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>🔓 Mở khóa tháng {month}/{year}</button>}
      {!locked && (
        <div style={{ marginTop: 8 }}>
          {!showDelConfirm ? (
            <button onClick={() => setShowDelConfirm(true)} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1.5px solid ${C.coralSoft}`, background: C.card, color: C.coral, fontFamily: font.body, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>🗑 Xóa bảng thu tháng này (tạo lại)</button>
          ) : (
            <div style={{ background: C.coralSoft, borderRadius: 12, padding: 12, border: `1.5px solid ${C.coral}` }}>
              <div style={{ fontSize: 13, color: C.coral, fontWeight: 700, marginBottom: 8 }}>⚠️ Nhập "XOA" để xác nhận xóa bảng thu tháng {month}/{year}</div>
              <input value={delConfirmText} onChange={(e) => setDelConfirmText(e.target.value)} placeholder="Nhập XOA" style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 8, textAlign: "center", fontWeight: 700, textTransform: "uppercase" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowDelConfirm(false); setDelConfirmText(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${C.line}`, background: C.card, color: C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Hủy</button>
                <button onClick={() => { if (delConfirmText.trim().toUpperCase() === "XOA") { delThang(); setShowDelConfirm(false); setDelConfirmText(""); } else { toast("Nhập sai — gõ XOA để xác nhận"); } }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: delConfirmText.trim().toUpperCase() === "XOA" ? C.coral : C.graySoft, color: "#fff", fontWeight: 700, fontSize: 13, cursor: delConfirmText.trim().toUpperCase() === "XOA" ? "pointer" : "default" }}>🗑 Xóa</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ BOTTOM SHEETS ============ */}
      {/* Sheet cảnh báo */}
      <BottomSheet open={sheetCB} onClose={() => setSheetCB(false)} title={`Cảnh báo bất thường — T${month}/${year}`}>
        {cbGroups.length === 0 ? <div style={{ color: C.green, fontSize: 14, padding: 10 }}>✓ Không có bất thường.</div> : cbGroups.map((g) => (
          <div key={g[0]} style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: g[2], marginBottom: 4 }}>{g[0]} ({g[1].length})</div>
            {g[1].map((r) => (
              <div key={r.hs.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
                <span>{r.hs.ten} <span style={{ color: C.sub, fontSize: 11 }}>· {r.lop?.ten}</span></span>
              </div>
            ))}
          </div>
        ))}
      </BottomSheet>

      {/* Sheet chi phí (nội dung nhập liệu đầy đủ) */}
      <BottomSheet open={sheetCP} onClose={() => setSheetCP(false)} title={`Chi tiết chi phí — T${month}/${year}`}>
        <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: C.sub, marginBottom: 10, flexWrap: "wrap" }}>
          <span>Tổng chi <b style={{ color: C.ink }}>{fmt(tongChi)}</b></span>
          <span>Đã trả <b style={{ color: C.green }}>{fmt(tongTra)}</b></span>
          <span>Nợ NCC <b style={{ color: noNCC > 0 ? C.coral : C.green }}>{fmt(noNCC)}</b></span>
          {!locked && <button onClick={themCoDinhMau} style={{ marginLeft: "auto", background: C.pineSoft, color: C.pine, border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{cp.filter((c) => c.loai === "CO_DINH").length === 5 ? (showCoDinh ? "Ẩn" : "Hiện") + " 5 cố định" : "+ 5 khoản cố định"}</button>}
        </div>
        {!locked && (
          <button onClick={traDuTatCa} style={{ width: "100%", marginBottom: 10, padding: "9px 0", borderRadius: 9, border: `1.5px solid ${C.green}`, background: C.greenSoft, color: C.green, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>✓ Trả đủ tất cả khoản còn thiếu</button>
        )}
        {cp.map((c) => {
          const e = Number(c.soTien) || 0, k = Number(c.daTra) || 0; const isNoAB = c.loai === "NO_AB"; const isCT = c.loai === "CHUYEN";
          if (c.loai === "CO_DINH" && !showCoDinh) return null;
          if (c.loai === "TRA_NO") return (
            <div key={c.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
              <div style={{ fontWeight: 600 }}>💰 Trả nợ NCC · <b style={{ color: c.nguoiChi === "A" ? C.blueA : C.violetB }}>[{c.nguoiChi}]</b> {c.noiDung} · {fmt(k)} đ</div>
              {!locked && <button onClick={() => del(c.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", padding: 4 }}>🗑</button>}
            </div>
          );
          if (isCT) return (
            <div key={c.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
              <div style={{ fontWeight: 600 }}>🔄 Chuyển tiền <b style={{ color: c.huong === "A->B" ? C.blueA : C.violetB }}>{c.huong === "A->B" ? "A → B" : "B → A"}</b> · {fmt(e)} đ</div>
              {!locked && <button onClick={() => del(c.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", padding: 4 }}>🗑</button>}
            </div>
          );
          const st = k === 0 ? { t: "Chưa trả", c: C.coral, bg: C.coralSoft } : k < e ? { t: "Trả 1 phần", c: C.amber, bg: C.amberSoft } : { t: "Đã trả", c: C.green, bg: C.greenSoft };
          return (
            <div key={c.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{!isNoAB && <span style={{ color: c.nguoiChi === "A" ? C.blueA : C.violetB, fontWeight: 800 }}>[{c.nguoiChi}]</span>} {c.noiDung}{isNoAB && <span style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}> · NỢ {c.huong}</span>}{c.loai === "CO_DINH" && <span style={{ color: C.sub, fontSize: 11 }}> · cố định</span>}</div>
                <Badge s={st} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, color: C.sub }}>
                  <span style={{ minWidth: 52 }}>Phải trả</span>
                  {c.loai === "CO_DINH" && !locked
                    ? (<><NumInput value={c.soTien} onChange={(v) => set(c.id, { soTien: v })} w={120} /><ABBtn val={c.nguoiChi} set={(p) => set(c.id, { nguoiChi: p })} small disabled={locked} /></>)
                    : (<b style={{ color: C.ink }}>{fmt(e)}</b>)}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, color: C.sub }}>
                  <span style={{ minWidth: 52 }}>Đã trả</span>
                  <NumInput value={c.daTra} onChange={(v) => set(c.id, { daTra: v })} w={120} disabled={locked} />
                  {!locked && <button onClick={() => set(c.id, { daTra: e })} style={{ background: C.greenSoft, color: C.green, fontWeight: 700, fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "none", cursor: "pointer" }}>Trả đủ</button>}
                  {!locked && <button onClick={() => del(c.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", marginLeft: "auto", padding: 4 }}>🗑</button>}
                </div>
                {k > e && <div style={{ fontSize: 11.5, color: C.amber, background: C.amberSoft, borderRadius: 7, padding: "4px 8px" }}>⚠️ Đã trả nhiều hơn phải trả {fmt(k - e)} đ</div>}
              </div>
            </div>
          );
        })}
        {!locked && (
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <input value={nd} onChange={(e) => setNd(e.target.value)} placeholder={loai === "TRA_NO" ? "Tên nợ (VD: Thực phẩm T4)" : "Khoản chi"} style={{ flex: "2 1 150px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, minWidth: 0, fontFamily: font.body }} />
              {loai !== "TRA_NO" && (
                <input type="number" value={so} onChange={(e) => setSo(e.target.value)} placeholder="Số tiền" style={{ flex: "1 1 90px", padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, minWidth: 0, fontFamily: font.body }} />
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <select value={loai} onChange={(e) => { setLoai(e.target.value); if (e.target.value === "TRA_NO") { setSo("0"); } }} style={{ padding: "8px 8px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 12.5, fontFamily: font.body, background: "#fff" }}>{LOAI_CHI.map((l) => <option key={l} value={l}>{l === "PHAT_SINH" ? "Phát sinh" : l === "CO_DINH" ? "Cố định" : l === "NO_AB" ? "Nợ A↔B" : l === "TRA_NO" ? "💰 Trả nợ NCC" : "🔄 Chuyển tiền"}</option>)}</select>
              {(loai === "NO_AB" || loai === "CHUYEN") ? <select value={huong} onChange={(e) => setHuong(e.target.value)} style={{ padding: "8px 8px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 12.5, fontFamily: font.body, background: "#fff" }}><option value="A->B">A → B</option><option value="B->A">B → A</option></select> : <ABBtn val={ng} set={setNg} small />}
              <button onClick={() => { if (loai === "TRA_NO" && !nd.trim()) { toast("Nhập tên nợ cần trả"); return; } add(); }} style={{ background: C.pine, color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 16px", borderRadius: 9, border: "none", cursor: "pointer", marginLeft: "auto" }}>+ Thêm</button>
            </div>
          </div>
        )}
        {locked && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 10, textAlign: "center" }}>🔒 Tháng đã chốt — chỉ xem.</div>}
        <button onClick={() => setSheetCP(false)} style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 11, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>✓ Hoàn thành</button>
      </BottomSheet>

      {/* Sheet lợi nhuận & chia quỹ chi tiết */}
      <BottomSheet open={sheetLN} onClose={() => setSheetLN(false)} title={`Lợi nhuận & chia quỹ — T${month}/${year}`}>
        {/* Thực thu A/B */}
        <div style={{ background: "#FAFCFA", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>🧾 Doanh thu (thực thu)</span>
            <b style={{ fontFamily: font.display, fontSize: 17, color: C.ink }}>{fmt(tk.thu)} đ</b>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12.5 }}>
            <span style={{ flex: 1 }}>A thu: <b style={{ color: C.blueA }}>{fmt(tk.A)}</b></span>
            <span style={{ flex: 1 }}>B thu: <b style={{ color: C.violetB }}>{fmt(tk.B)}</b></span>
          </div>
        </div>
        {/* Đã chi A/B */}
        <div style={{ background: "#FAFCFA", borderRadius: 12, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>💸 Đã chi (tiền mặt ra)</span>
            <b style={{ fontFamily: font.display, fontSize: 17, color: C.ink }}>{fmt(tongTra)} đ</b>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12.5 }}>
            <span style={{ flex: 1 }}>A chi: <b style={{ color: C.blueA }}>{fmt(tk.traA)}</b></span>
            <span style={{ flex: 1 }}>B chi: <b style={{ color: C.violetB }}>{fmt(tk.traB)}</b></span>
          </div>
        </div>
        {/* LN kế toán / tiền mặt */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "9px 4px", background: C.greenSoft, borderRadius: 10 }}><div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>LN kế toán</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 16, color: lnKeToan < 0 ? C.coral : C.green }}>{fmt(lnKeToan)}</div><div style={{ fontSize: 9.5, color: C.sub }}>Phải thu − Chi phí</div></div>
          <div style={{ flex: 1, textAlign: "center", padding: "9px 4px", background: C.blueASoft, borderRadius: 10 }}><div style={{ fontSize: 11, color: C.blueA, fontWeight: 600 }}>LN tiền mặt</div><div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 16, color: lnTienMat < 0 ? C.coral : C.blueA }}>{fmt(lnTienMat)}</div><div style={{ fontSize: 9.5, color: C.sub }}>Đã thu − Đã trả</div></div>
        </div>

        {/* Phân chia tài chính + tỷ lệ */}
        <div style={sheetTitle}>📊 Phân chia tài chính T{month}</div>
        <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 8 }}>Tổng LN kế toán toàn trường: <b style={{ color: lnKeToan < 0 ? C.coral : C.green, fontSize: 14 }}>{fmt(lnKeToan)} đ</b></div>
        {!locked && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: C.goldSoft, borderRadius: 10, padding: "8px 10px" }}>
            <span style={{ fontSize: 12, color: "#7A5E12", fontWeight: 600 }}>Tỷ lệ chia</span>
            <button onClick={() => upMeta({ ...meta, tyLeLaiA: Math.max(0, tyLeA - 5) })} style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink, fontWeight: 800, fontSize: 17, cursor: "pointer", lineHeight: 1 }}>−</button>
            <span style={{ minWidth: 92, textAlign: "center", fontSize: 13, fontWeight: 700 }}>A {tyLeA}% / B {100 - tyLeA}%</span>
            <button onClick={() => upMeta({ ...meta, tyLeLaiA: Math.min(100, tyLeA + 5) })} style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink, fontWeight: 800, fontSize: 17, cursor: "pointer", lineHeight: 1 }}>+</button>
          </div>
        )}
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ display: "flex", background: "#FAFCFA", fontSize: 11.5, color: C.sub, fontWeight: 700, padding: "7px 10px" }}>
            <span style={{ flex: 1.5 }}>Nội dung</span>
            <span style={{ flex: 1, textAlign: "right", color: C.blueA }}>Người A</span>
            <span style={{ flex: 1, textAlign: "right", color: C.violetB }}>Người B</span>
          </div>
          <div style={{ display: "flex", fontSize: 12.5, padding: "8px 10px", borderTop: `1px solid ${C.line}` }}>
            <span style={{ flex: 1.5 }}>💰 Lãi được chia</span>
            <b style={{ flex: 1, textAlign: "right", color: C.blueA }}>{fmt(Math.round(lnKeToan * tyLeA / 100))}</b>
            <b style={{ flex: 1, textAlign: "right", color: C.violetB }}>{fmt(lnKeToan - Math.round(lnKeToan * tyLeA / 100))}</b>
          </div>
          <div style={{ display: "flex", fontSize: 12.5, padding: "8px 10px", borderTop: `1px solid ${C.line}` }}>
            <div style={{ flex: 1.5 }}>🏦 Quỹ trường đang giữ<div style={{ fontSize: 10, color: C.sub }}>(lũy kế đến hết tháng)</div></div>
            <div style={{ flex: 1, textAlign: "right" }}><b style={{ color: (luyKe?.giuA ?? 0) < 0 ? C.coral : C.blueA }}>{luyKe ? fmt(luyKe.giuA) : "…"}</b><div style={{ fontSize: 10, color: giuThangA < 0 ? C.coral : C.sub }}>T{month}: {fmt(giuThangA)}</div></div>
            <div style={{ flex: 1, textAlign: "right" }}><b style={{ color: (luyKe?.giuB ?? 0) < 0 ? C.coral : C.violetB }}>{luyKe ? fmt(luyKe.giuB) : "…"}</b><div style={{ fontSize: 10, color: giuThangB < 0 ? C.coral : C.sub }}>T{month}: {fmt(giuThangB)}</div></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 2 }}><span style={{ color: C.sub }}>Tổng quỹ trường đang giữ</span><b style={{ color: tongTienMat < 0 ? C.coral : C.pine }}>{fmt(tongTienMat)} đ</b></div>
        <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>Quỹ âm = A/B đang ứng tiền túi, trường nợ lại.</div>

        {(tk.noAB_AtoB > 0 || tk.noAB_BtoA > 0) && (<>
          <div style={sheetTitle}>Nợ nội bộ A ↔ B</div>
          {noAB > 0 && <div style={{ fontSize: 13.5 }}>A đang nợ B: <b style={{ color: C.gold }}>{fmt(noAB)} đ</b></div>}
          {noAB < 0 && <div style={{ fontSize: 13.5 }}>B đang nợ A: <b style={{ color: C.gold }}>{fmt(-noAB)} đ</b></div>}
          {noAB === 0 && <div style={{ fontSize: 13.5, color: C.green }}>Đã cấn trừ xong.</div>}
        </>)}

        <button onClick={() => setSheetLN(false)} style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 11, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>✓ Hoàn thành</button>
      </BottomSheet>

      {/* Sheet lịch sử các tháng */}
      <BottomSheet open={sheetLS} onClose={() => setSheetLS(false)} title="Lịch sử các tháng trước">
        {!lichSu || lichSu.length === 0 ? <div style={{ color: C.sub, fontSize: 14, padding: 10, textAlign: "center" }}>Chưa có dữ liệu các tháng.</div> : (() => {
          const splitA = (v) => Math.round(v * tyLeA / 100);
          const rev = [...lichSu].reverse(); // moi nhat len dau
          const tongLKT = lichSu.reduce((a, r) => a + r.laiKeToan, 0);
          const tongLTM = lichSu.reduce((a, r) => a + r.laiTienMat, 0);
          const rowLine = { display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "1px 0" };
          const sub2 = (la, va, lb, vb) => (
            <div style={{ display: "flex", gap: 10, marginTop: 3, fontSize: 12 }}>
              <span style={{ flex: 1, color: C.sub }}>{la} <b style={{ color: C.blueA }}>{fmt(va)}</b></span>
              <span style={{ flex: 1, color: C.sub }}>{lb} <b style={{ color: C.violetB }}>{fmt(vb)}</b></span>
            </div>
          );
          return (
          <div>
            {rev.map((r) => {
              const aKT = splitA(r.laiKeToan), bKT = r.laiKeToan - aKT;
              return (
              <div key={r.thang} style={{ border: `1px solid ${C.line}`, borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ background: C.pineSoft, padding: "8px 12px", fontFamily: font.display, fontWeight: 800, fontSize: 14.5, color: C.pine }}>📅 Tháng {r.mm}/{r.yy}</div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={rowLine}><span style={{ color: C.sub, fontWeight: 600 }}>🧾 Doanh thu (thực thu)</span><b style={{ color: C.ink }}>{fmt(r.thuThang)} đ</b></div>
                  {sub2("A thu:", r.thuA, "B thu:", r.thuB)}
                  <div style={{ ...rowLine, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}` }}><span style={{ color: C.sub, fontWeight: 600 }}>💸 Chi phí xử lý (đã chi)</span><b style={{ color: C.ink }}>{fmt(r.traThang)} đ</b></div>
                  {sub2("A chi:", r.traA, "B chi:", r.traB)}
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
                    <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 600, marginBottom: 6 }}>📊 Phân chia tài chính · LN kế toán: <b style={{ color: r.laiKeToan < 0 ? C.coral : C.green }}>{fmt(r.laiKeToan)} đ</b></div>
                    <div style={{ border: `1px solid ${C.line}`, borderRadius: 9, overflow: "hidden" }}>
                      <div style={{ display: "flex", background: "#FAFCFA", fontSize: 11, color: C.sub, fontWeight: 700, padding: "5px 9px" }}>
                        <span style={{ flex: 1.5 }}>Nội dung</span>
                        <span style={{ flex: 1, textAlign: "right", color: C.blueA }}>Người A</span>
                        <span style={{ flex: 1, textAlign: "right", color: C.violetB }}>Người B</span>
                      </div>
                      <div style={{ display: "flex", fontSize: 12, padding: "6px 9px", borderTop: `1px solid ${C.line}` }}>
                        <span style={{ flex: 1.5 }}>💰 Lãi chia ({tyLeA}/{100 - tyLeA})</span>
                        <b style={{ flex: 1, textAlign: "right", color: C.blueA }}>{fmt(aKT)}</b>
                        <b style={{ flex: 1, textAlign: "right", color: C.violetB }}>{fmt(bKT)}</b>
                      </div>
                      <div style={{ display: "flex", fontSize: 12, padding: "6px 9px", borderTop: `1px solid ${C.line}` }}>
                        <div style={{ flex: 1.5 }}>🏦 Quỹ trường giữ<div style={{ fontSize: 9.5, color: C.sub }}>(lũy kế)</div></div>
                        <div style={{ flex: 1, textAlign: "right" }}><b style={{ color: r.giuACum < 0 ? C.coral : C.blueA }}>{fmt(r.giuACum)}</b><div style={{ fontSize: 9.5, color: r.deltaA < 0 ? C.coral : C.sub }}>T{r.mm}: {fmt(r.deltaA)}</div></div>
                        <div style={{ flex: 1, textAlign: "right" }}><b style={{ color: r.giuBCum < 0 ? C.coral : C.violetB }}>{fmt(r.giuBCum)}</b><div style={{ fontSize: 9.5, color: r.deltaB < 0 ? C.coral : C.sub }}>T{r.mm}: {fmt(r.deltaB)}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
            <div style={{ background: C.goldSoft, border: `1px solid #EAD8A0`, borderRadius: 12, padding: "10px 12px", marginBottom: 4 }}>
              <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 13.5, color: "#7A5E12", marginBottom: 4 }}>Σ Cộng tất cả các tháng</div>
              <div style={rowLine}><span style={{ color: C.sub }}>Tổng LN kế toán</span><b style={{ color: tongLKT < 0 ? C.coral : C.green }}>{fmt(tongLKT)} đ</b></div>
              <div style={rowLine}><span style={{ color: C.sub }}>Tổng LN tiền mặt</span><b style={{ color: tongLTM < 0 ? C.coral : C.blueA }}>{fmt(tongLTM)} đ</b></div>
              <div style={rowLine}><span style={{ color: C.sub }}>Chia lãi · A {tyLeA}% / B {100 - tyLeA}%</span><b><span style={{ color: C.blueA }}>{fmt(splitA(tongLKT))}</span> / <span style={{ color: C.violetB }}>{fmt(tongLKT - splitA(tongLKT))}</span></b></div>
            </div>
          </div>
          );
        })()}
        <button onClick={() => setSheetLS(false)} style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 11, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>✓ Hoàn thành</button>
      </BottomSheet>
    </>
  );
}
function ImportHSExcel({ meta, students, upStudents, ym }) {
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState("");
  const [tplText, setTplText] = useState("");
  const HEADERS = ["Họ tên", "Lớp", "Phân loại", "Người thu", "SĐT", "Nợ đầu kỳ"];
  const buildTpl = () => {
    const l0 = meta.classes[0]?.ten || "Sóc Nhí", l1 = meta.classes[1]?.ten || l0;
    const rows = [HEADERS, ["Bé Na", l0, "Bthg", "A", "0912000111", "0"], ["Bé Bo", l1, "AE", "B", "", "0"], ["Bé Bi", l0, "", "A", "", "0"]];
    return rows.map((r) => r.join(",")).join("\n");
  };
  const downloadTpl = () => {
    const csv = buildTpl();
    try { const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `mau-nhap-hoc-sinh.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch {}
    setTplText(csv);
  };
  const splitLine = (line) => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if ((ch === "," || ch === "\t") && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((s) => s.trim()); };
  const parse = (text) => {
    const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/); if (lines.length < 2) return [];
    const hd = splitLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) { if (!lines[i].trim()) continue; const cells = splitLine(lines[i]); const o = {}; hd.forEach((h, idx) => (o[h.replace(/^\uFEFF/, "")] = cells[idx] || "")); rows.push(o); }
    return rows;
  };
  const get = (o, keys) => { for (const k of keys) if (o[k] != null && o[k] !== "") return o[k]; return ""; };
  const doImport = async (text) => {
    const rows = parse(text);
    if (!rows.length) { toast("Không đọc được dòng nào."); return; }
    setBusy(true);
    let added = 0, skip = 0; const ns = [...students];
    rows.forEach((r) => {
      const ten = get(r, ["Họ tên", "Ho ten", "Ten"]); if (!ten) { skip++; return; }
      const lopTen = get(r, ["Lớp", "Lop"]);
      const lop = meta.classes.find((c) => c.ten === lopTen || noDau(c.ten) === noDau(lopTen)); if (!lop) { skip++; return; }
      const pl = get(r, ["Phân loại (Bthg/AE/GV/T7)", "Phân loại", "Phan loai"]) || "Bthg";
      const nguoiThu = get(r, ["Người thu (A/B)", "Người thu", "Nguoi thu"]) || "A";
      const tt = get(r, ["Trạng thái", "Trang thai"]) || "Đang học";
      const ngayNhap = get(r, ["Ngày nhập học (YYYY-MM-DD)", "Ngày nhập học", "Ngay nhap hoc"]) || ym;
      const ngaySinh = get(r, ["Ngày sinh (YYYY-MM-DD)", "Ngày sinh", "Ngay sinh"]);
      const sdt = get(r, ["SĐT phụ huynh", "SDT phu huynh", "SĐT"]);
      const noDauKy = Number(get(r, ["Nợ đầu kỳ", "No dau ky"]) || 0) || 0;
      ns.push({ id: "hs" + uid(), ten, ngaySinh, lopHistory: [{ tuThang: ngayNhap || ym, lop: lop.id }], pl: PHAN_LOAI.includes(pl) ? pl : "Bthg", nguoiThu: nguoiThu === "B" ? "B" : "A", trangThai: TRANG_THAI.includes(tt) ? tt : "Đang học", ngayNhapHoc: ngayNhap || ym, ngayNghiHoc: "", noDauKy, phuHuynh: { ten: "", sdt } });
      added++;
    });
    upStudents(ns);
    toast(`Đã thêm ${added} HS${skip ? `, bỏ qua ${skip} dòng (thiếu tên/sai lớp)` : ""}.`);
    setPaste(""); setBusy(false);
  };
  const importFile = async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; doImport(await f.text()); };

  return (
    <Card style={{ marginBottom: 12, background: C.blueASoft, borderColor: "#C7DCF3" }}>
      <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, color: C.blueA, marginBottom: 6 }}>📥 Nhập hàng loạt từ Excel/CSV</div>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 10, lineHeight: 1.5 }}>Mỗi dòng = 1 học sinh, cách nhau bằng dấu phẩy, theo thứ tự: <b>Họ tên, Lớp, Phân loại, Người thu, SĐT, Nợ</b>. Chỉ <b>Họ tên</b> + <b>Lớp</b> bắt buộc; ô trống cứ để 2 dấu phẩy liền. Giữ nguyên dòng tiêu đề đầu tiên.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={downloadTpl} style={{ padding: "9px 14px", borderRadius: 9, border: `1.5px solid ${C.blueA}`, background: C.card, color: C.blueA, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>📄 File mẫu CSV</button>
        <label style={{ display: "inline-block", padding: "9px 14px", borderRadius: 9, border: `1.5px dashed ${C.line}`, background: C.card, color: C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{busy ? "Đang xử lý…" : "📂 Chọn file CSV"}<input type="file" accept=".csv,text/csv" onChange={importFile} disabled={busy} style={{ display: "none" }} /></label>
      </div>
      {tplText && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>Nếu máy không tải được, copy nội dung mẫu dưới đây dán vào Excel/Sheets:</div>
          <textarea readOnly value={tplText} onFocus={(e) => e.target.select()} style={{ width: "100%", height: 70, fontSize: 11, fontFamily: "monospace", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: 6, background: "#FAFCFA" }} />
        </div>
      )}
      <div style={{ fontSize: 12, color: C.sub, margin: "6px 0 4px" }}>Hoặc dán nội dung CSV đã điền vào đây rồi bấm Nhập:</div>
      <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Họ tên,Lớp,Phân loại,Người thu,SĐT,Nợ đầu kỳ\nBé Na,Sóc Nhí,Bthg,A,0912000111,0\nBé Bo,Sơn Ca,,B,,0'} style={{ width: "100%", height: 80, fontSize: 11, fontFamily: "monospace", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: 6, marginBottom: 8 }} />
      <button onClick={() => doImport(paste)} disabled={busy || !paste.trim()} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: paste.trim() ? C.pine : C.graySoft, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: paste.trim() ? "pointer" : "default" }}>+ Nhập danh sách</button>
    </Card>
  );
}

function HSDetail({ s, meta, ym, setHS, chuyenLop, inp }) {
  const lopThang = lopOfMonth(s, ym);
  const lab = { fontSize: 11.5, color: C.sub, display: "block", marginBottom: 2 };
  const wrap = { flex: "1 1 140px", minWidth: 0 };
  const sel = { ...inp, width: "100%", marginTop: 2 };
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div style={wrap}>
        <label style={lab}>Lớp (từ tháng {ym})</label>
        <select value={lopThang || ""} onChange={(e) => chuyenLop(s.id, e.target.value)} style={sel}>
          {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}
        </select>
      </div>
      <div style={wrap}>
        <label style={lab}>Phân loại</label>
        <select value={s.pl} onChange={(e) => { setHS(s.id, { pl: e.target.value }); logAction(`Đổi phân loại HS "${s.ten}" → ${e.target.value} (T${ym})`); }} style={sel}>
          {PHAN_LOAI.map((p) => <option key={p} value={p}>{PL_LABEL[p] || p}</option>)}
        </select>
      </div>
      <div style={wrap}>
        <label style={lab}>Trạng thái</label>
        <select value={s.trangThai} onChange={(e) => { setHS(s.id, { trangThai: e.target.value }); logAction(`Đổi trạng thái HS "${s.ten}" → ${e.target.value} (T${ym})`); }} style={sel}>
          {TRANG_THAI.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={wrap}>
        <label style={lab}>Nợ đầu kỳ (đ)</label>
        <NumInput value={s.noDauKy || 0} onChange={(v) => setHS(s.id, { noDauKy: v })} w={130} />
      </div>
      <div style={wrap}>
        <label style={lab}>Ngày sinh</label>
        <input type="date" value={s.ngaySinh || ""} onChange={(e) => setHS(s.id, { ngaySinh: e.target.value })} style={sel} />
      </div>
      <div style={wrap}>
        <label style={lab}>Ngày nhập học</label>
        <input type="date" value={s.ngayNhapHoc || ""} onChange={(e) => setHS(s.id, { ngayNhapHoc: e.target.value })} style={sel} />
      </div>
      <div style={wrap}>
        <label style={lab}>Ngày nghỉ học</label>
        <input type="date" value={s.ngayNghiHoc || ""} onChange={(e) => setHS(s.id, { ngayNghiHoc: e.target.value })} style={sel} />
      </div>
      <div style={wrap}>
        <label style={lab}>SĐT phụ huynh</label>
        <input type="tel" inputMode="tel" value={s.phuHuynh?.sdt || ""} onChange={(e) => setHS(s.id, { phuHuynh: { ...(s.phuHuynh || {}), sdt: e.target.value } })} placeholder="(không bắt buộc)" style={sel} />
      </div>
    </div>
  );
}

function AuditLog() {
  const [log, setLog] = useState(null);
  const [limit, setLimit] = useState(100);
  const load = async () => { setLog((await sGet("mn5:log")) || []); setLimit(100); };
  useEffect(() => { load(); }, []);
  const fmtT = (iso) => { try { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; } catch { return iso; } };
  const clear = async () => { if (await ask("Xóa toàn bộ nhật ký thao tác?", { danger: true, okText: "Xóa" })) { await sSet("mn5:log", []); setLog([]); toast("Đã xóa nhật ký."); } };
  if (log == null) return <div style={{ textAlign: "center", color: C.sub, fontSize: 13.5, padding: 24 }}>Đang tải nhật ký…</div>;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: C.sub }}>Ghi lại các thao tác quan trọng (thêm/xóa/chuyển lớp/chốt tháng…). Lưu tối đa 800 dòng gần nhất.</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={load} style={{ padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${C.pine}`, background: C.pineSoft, color: C.pine, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>↻ Tải lại</button>
        {log.length > 0 && <button onClick={clear} style={{ padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${C.coral}`, background: C.card, color: C.coral, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>🗑 Xóa nhật ký</button>}
      </div>
      {log.length === 0 ? (
        <div style={{ textAlign: "center", color: C.sub, fontSize: 13.5, padding: 24 }}>Chưa có thao tác nào được ghi.</div>
      ) : (<>
        {log.slice(0, limit).map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "9px 12px", marginBottom: 6, background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13 }}>
            <div style={{ color: C.sub, fontSize: 11.5, whiteSpace: "nowrap", flexShrink: 0, minWidth: 76 }}>{fmtT(e.t)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: e.who === "Admin" ? C.pine : C.blueA }}>{e.who}</span>
              <span style={{ color: C.ink }}> · {e.act}</span>
            </div>
          </div>
        ))}
        {log.length > limit && (
          <button onClick={() => setLimit((l) => l + 100)} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1.5px solid ${C.pine}`, background: C.pineSoft, color: C.pine, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Xem thêm ({Math.min(limit, log.length)}/{log.length})
          </button>
        )}
      </>)}
    </>
  );
}

function CaiDat({ meta, upMeta, students, upStudents, ym, reseedAll, isWide }) {
  const [sec, setSec] = useState("hs");
  const [ten, setTen] = useState("");
  const [lop, setLop] = useState(meta.classes[0]?.id || "");
  const [pl, setPl] = useState("Bthg");
  const [nguoiThu, setNguoiThu] = useState("A");
  const [ngaySinh, setNgaySinh] = useState("");
  const [phSdt, setPhSdt] = useState("");
  const [ngayNhap, setNgayNhap] = useState(new Date().toISOString().slice(0, 10));
  const [tenLopMoi, setTenLopMoi] = useState("");
  const [gvTen, setGvTen] = useState("");
  const [gvPin, setGvPin] = useState("");
  const [gvLop, setGvLop] = useState(meta.classes[0]?.id || "");
  const [editHS, setEditHS] = useState(null);
  const [hsFilter, setHsFilter] = useState("all");
  const [hsSearch, setHsSearch] = useState("");
  const [showAddHS, setShowAddHS] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [hsStatusFilter, setHsStatusFilter] = useState("all");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedHS, setSelectedHS] = useState([]);
  const [bulkTargetLop, setBulkTargetLop] = useState(meta.classes[0]?.id || "");
  const [bulkTargetTT, setBulkTargetTT] = useState("Đang học");
  const [hsLimit, setHsLimit] = useState(50);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragOverPos, setDragOverPos] = useState(null);
  const [lopSheetOpen, setLopSheetOpen] = useState(false);
  const [ttSheetOpen, setTtSheetOpen] = useState(false);
  const longPressRef = useRef(null);
  const sentinelRef = useRef(null);
  const [headerShrunk, setHeaderShrunk] = useState(false);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderShrunk(!entry.isIntersecting),
      { root: null, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const addHS = () => { const t = ten.trim(); if (!t || !lop) return; upStudents([...students, { id: "hs" + uid(), ten: t, ngaySinh, lopHistory: [{ tuThang: ym, lop }], pl, nguoiThu, trangThai: "Đang học", ngayNhapHoc: ngayNhap || new Date().toISOString().slice(0, 10), ngayNghiHoc: "", noDauKy: 0, phuHuynh: { ten: "", sdt: phSdt.trim() } }]); setTen(""); setNgaySinh(""); setPhSdt(""); logAction(`Thêm HS "${t}"`); toast("Đã thêm học sinh."); };
  const delHS = async (id) => { const hs = students.find((s) => s.id === id); if (await ask("Xóa học sinh này? (mất cả lịch sử)", { danger: true, okText: "Xóa" })) { const newList = students.filter((s) => s.id !== id); upStudents(newList); logAction(`Xóa HS "${hs?.ten || id}"`); toast("Đã xóa học sinh", hs ? () => upStudents([...newList, hs]) : undefined); } };
  const setHS = (id, p) => upStudents(students.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const chuyenLop = (id, lopMoi) => {
    const hs = students.find((s) => s.id === id);
    const tenLop = meta.classes.find((c) => c.id === lopMoi)?.ten || lopMoi;
    upStudents(students.map((s) => {
      if (s.id !== id) return s;
      const hist = (s.lopHistory || []).filter((h) => h.tuThang !== ym);
      hist.push({ tuThang: ym, lop: lopMoi });
      hist.sort((a, b) => a.tuThang.localeCompare(b.tuThang));
      return { ...s, lopHistory: hist };
    }));
    if (hs) logAction(`Chuyển lớp HS "${hs.ten}" → ${tenLop} (từ T${ym})`);
  };
  const themLop = () => { const t = tenLopMoi.trim(); if (!t) return; upMeta({ ...meta, classes: [...meta.classes, { id: "c" + uid(), ten: t, hocPhi: 800000, banTru: 200000, tienAn: 30000, t7: 80000, veSinh: 20000, tiengAnh: 100000, ngoaiKhoa: 100000, dauNam: 1200000 }] }); setTenLopMoi(""); logAction(`Thêm lớp "${t}"`); };
  const xoaLop = async (id) => { if (students.some((s) => lopHienTai(s) === id)) { toast("Lớp còn HS — chuyển HS trước."); return; } if (meta.classes.length === 1) { toast("Phải còn ít nhất 1 lớp."); return; } const lopCu = meta.classes.find((c) => c.id === id); if (await ask("Xóa lớp này?", { danger: true, okText: "Xóa" })) { const newClasses = meta.classes.filter((c) => c.id !== id); upMeta({ ...meta, classes: newClasses }); logAction(`Xóa lớp "${lopCu?.ten || id}"`); toast("Đã xóa lớp", lopCu ? () => upMeta({ ...meta, classes: [...newClasses, lopCu] }) : undefined); } };
  const setLopGia = (id, k, v) => upMeta({ ...meta, classes: meta.classes.map((c) => (c.id === id ? { ...c, [k]: v } : c)) });
  const cycleKhoan = (id, key) => {
    const cur = khoanMode(meta.classes.find((c) => c.id === id), key);
    const next = cur === "thu" ? "khong" : "thu";
    upMeta({ ...meta, classes: meta.classes.map((c) => (c.id === id ? { ...c, lapLai: { ...(c.lapLai || {}), [key]: next } } : c)) });
  };
  const setBank = (p, k, v) => upMeta({ ...meta, bank: { ...meta.bank, [p]: { ...meta.bank[p], [k]: v } } });
  const themGV = () => { const t = gvTen.trim(), p = gvPin.trim(); if (!t || !p || !gvLop) { toast("Nhập đủ tên, PIN, lớp."); return; } if ((meta.giaoVien || []).some((g) => g.pin === p)) { toast("PIN này đã dùng — chọn PIN khác."); return; } upMeta({ ...meta, giaoVien: [...(meta.giaoVien || []), { id: "gv" + uid(), ten: t, pin: p, lopId: gvLop }] }); setGvTen(""); setGvPin(""); logAction(`Thêm giáo viên "${t}"`); toast("Đã thêm giáo viên."); };
  const xoaGV = async (id) => { const gv = (meta.giaoVien || []).find((g) => g.id === id); if (await ask("Xóa giáo viên này?", { danger: true, okText: "Xóa" })) { const newGV = (meta.giaoVien || []).filter((g) => g.id !== id); upMeta({ ...meta, giaoVien: newGV }); logAction(`Xóa giáo viên "${gv?.ten || id}"`); toast("Đã xóa giáo viên", gv ? () => upMeta({ ...meta, giaoVien: [...newGV, gv] }) : undefined); } };
  const setDK = (k, v) => upMeta({ ...meta, soDuDauKy: { ...meta.soDuDauKy, [k]: v } });

  const inp = { padding: "9px 10px", borderRadius: 9, border: "1.5px solid " + C.line, fontSize: 13, fontFamily: font.body, color: C.ink, background: "#FAFCFA", outline: "none" };

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
        {[
          ["hs", "Học sinh"],
          ["lop", "Lớp"],
          ["gv", "Giáo viên"],
          ["bank", "Tài khoản"],
          ["dk", "Số dư đầu kỳ"],
          ["backup", "Sao lưu"],
          ["log", "Nhật ký"],
          ["data", "Dữ liệu"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setSec(k)} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 10, border: `1.5px solid ${sec === k ? C.pine : C.line}`, background: sec === k ? C.pine : C.card, color: sec === k ? "#fff" : C.sub, fontFamily: font.body, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
      {sec === "hs" && (
        <>
          {/* Sentinel để detect scroll */}
          <div ref={sentinelRef} style={{ height: 1, margin: 0 }} />

          {/* ===== STICKY ACTION BAR ===== */}
          <div style={{
            position: "sticky",
            top: 0,
            zIndex: 25,
            background: headerShrunk ? "rgba(245,247,243,.95)" : "transparent",
            backdropFilter: headerShrunk ? "blur(6px)" : "none",
            margin: "0 -14px",
            padding: headerShrunk ? "8px 14px" : "0 0 10px",
            borderBottom: headerShrunk ? `1px solid ${C.line}` : "none",
            transition: "all .2s ease",
          }}>
            <div style={{ display: "flex", gap: 8, marginBottom: headerShrunk ? 8 : 12 }}>
              <button onClick={() => setShowAddHS((v) => !v)} style={{ flex: 1, padding: headerShrunk ? "9px 6px" : "11px 8px", borderRadius: 12, border: `1.5px solid ${showAddHS ? C.pine : C.line}`, background: showAddHS ? C.pine : C.card, color: showAddHS ? "#fff" : C.pine, fontFamily: font.display, fontWeight: 700, fontSize: headerShrunk ? 12 : 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {headerShrunk ? "＋" : (showAddHS ? "▲ Thu gọn" : "＋ Thêm 1 HS")}
              </button>
              <button onClick={() => setShowImport((v) => !v)} style={{ flex: 1, padding: headerShrunk ? "9px 6px" : "11px 8px", borderRadius: 12, border: `1.5px solid ${showImport ? C.blueA : C.line}`, background: showImport ? C.blueA : C.card, color: showImport ? "#fff" : C.blueA, fontFamily: font.display, fontWeight: 700, fontSize: headerShrunk ? 12 : 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {headerShrunk ? "📥" : (showImport ? "▲ Thu gọn" : "📥 Nhập hàng loạt")}
              </button>
            </div>

            {showImport && <ImportHSExcel meta={meta} students={students} upStudents={upStudents} ym={ym} />}

            {/* [Cong cu 1 lan] Dat ngay nhap hoc dong loat */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={async () => {
                if (await ask("Đặt NGÀY NHẬP HỌC = 01/01/2026 cho TẤT CẢ học sinh?\nSẽ GHI ĐÈ ngày nhập học hiện tại của mọi em (kể cả em đang có ngày khác). Không hoàn tác được.", { danger: true, okText: "Ghi đè tất cả" })) {
                  upStudents(students.map((s) => ({ ...s, ngayNhapHoc: "2026-01-01" })));
                  logAction(`Đặt ngày nhập học = 01/01/2026 cho tất cả HS (${students.length} em)`);
                  toast(`Đã đặt ngày nhập học 01/01/2026 cho ${students.length} HS.`);
                }
              }} style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${C.amber}`, background: C.amberSoft, color: C.amber, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>🗓️ Đặt ngày nhập học = 01/01/2026 cho tất cả HS</button>
            </div>
            {showAddHS && (<>
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, marginBottom: 8 }}>+ Thêm học sinh</div>
              <input value={ten} onChange={(e) => setTen(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addHS()} placeholder="Họ tên học sinh…" style={{ ...inp, width: "100%", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                <select value={lop} onChange={(e) => setLop(e.target.value)} style={{ ...inp, flex: "1 1 110px", minWidth: 0 }}>{meta.classes.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}</select>
                <select value={pl} onChange={(e) => setPl(e.target.value)} style={{ ...inp, width: 96 }}>{PHAN_LOAI.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                <ABBtn val={nguoiThu} set={setNguoiThu} small />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <label style={{ fontSize: 11.5, color: C.sub, flex: "1 1 130px" }}>Ngày sinh<br /><input type="date" value={ngaySinh} onChange={(e) => setNgaySinh(e.target.value)} style={{ ...inp, marginTop: 2, width: "100%" }} /></label>
                <label style={{ fontSize: 11.5, color: C.sub, flex: "1 1 130px" }}>Ngày nhập học<br /><input type="date" value={ngayNhap} onChange={(e) => setNgayNhap(e.target.value)} style={{ ...inp, marginTop: 2, width: "100%" }} /></label>
                <label style={{ fontSize: 11.5, color: C.sub, flex: "1 1 130px" }}>SĐT phụ huynh<br /><input type="tel" inputMode="tel" value={phSdt} onChange={(e) => setPhSdt(e.target.value)} placeholder="(không bắt buộc)" style={{ ...inp, marginTop: 2, width: "100%" }} /></label>
                <button onClick={addHS} style={{ background: C.pine, color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer", flexShrink: 0 }}>Thêm</button>
              </div>
            </Card>
            </>)}

            {/* Search + Bulk cùng hàng */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.gray, fontSize: 14 }}>🔍</span>
                  <input value={hsSearch} onChange={(e) => setHsSearch(e.target.value)} placeholder="Tìm tên học sinh…"
                    style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 12, border: `1.5px solid ${C.line}`, fontFamily: font.body, fontSize: 14, color: C.ink, background: C.card, outline: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = C.pine)} onBlur={(e) => (e.target.style.borderColor = C.line)} />
                  {hsSearch && <button onClick={() => setHsSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: C.gray, cursor: "pointer", fontSize: 16 }}>×</button>}
                </div>
              </div>
              <button onClick={() => { setBulkMode((v) => !v); setSelectedHS([]); }} style={{ flexShrink: 0, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${bulkMode ? C.pine : C.line}`, background: bulkMode ? C.pine : C.card, color: bulkMode ? "#fff" : C.sub, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: font.body }}>{bulkMode ? "⛔ Thoát" : "☑ Chọn nhiều"}</button>
            </div>

            {bulkMode && selectedHS.length > 0 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: C.sub }}><b>{selectedHS.length}</b> đã chọn</span>
                <select value={bulkTargetLop} onChange={(e) => setBulkTargetLop(e.target.value)} style={{ ...inp, width: 110 }}>{meta.classes.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}</select>
                <button onClick={() => { const tenLop = meta.classes.find((c) => c.id === bulkTargetLop)?.ten; upStudents(students.map((s) => { if (!selectedHS.includes(s.id)) return s; const hist = (s.lopHistory || []).filter((h) => h.tuThang !== ym); hist.push({ tuThang: ym, lop: bulkTargetLop }); hist.sort((a, b) => a.tuThang.localeCompare(b.tuThang)); return { ...s, lopHistory: hist }; })); logAction(`Chuyển lớp hàng loạt ${selectedHS.length} HS → ${tenLop} (từ T${ym})`); toast(`Đã chuyển ${selectedHS.length} HS sang lớp ${tenLop}`); setSelectedHS([]); }} style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: C.blueA, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Chuyển</button>
                <select value={bulkTargetTT} onChange={(e) => setBulkTargetTT(e.target.value)} style={{ ...inp, width: 120 }}>{TRANG_THAI.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                <button onClick={() => { upStudents(students.map((s) => selectedHS.includes(s.id) ? { ...s, trangThai: bulkTargetTT } : s)); logAction(`Đổi trạng thái hàng loạt ${selectedHS.length} HS → ${bulkTargetTT} (T${ym})`); toast(`Đã đổi ${selectedHS.length} HS sang "${bulkTargetTT}"`); setSelectedHS([]); }} style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: C.amber, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Đổi TT</button>
              </div>
            )}

            <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>{reorderMode ? "Dùng ▲ ▼ để xê dịch, ⤒ đưa lên đầu (theo danh sách đang lọc). Máy tính vẫn kéo-thả được." : bulkMode ? "Chạm để chọn/bỏ chọn nhiều em." : "Chạm HS để sửa. Chuyển lớp áp dụng từ tháng " + ym + "."}</div>

            {/* Lọc gọn: Lớp + Trạng thái */}
            {isWide ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                <select value={hsFilter} onChange={(e) => setHsFilter(e.target.value)} style={{ ...inp, flex: "1 1 130px", minWidth: 0 }}>
                  <option value="all">Tất cả lớp</option>
                  {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}
                </select>
                <select value={hsStatusFilter} onChange={(e) => setHsStatusFilter(e.target.value)} style={{ ...inp, flex: "1 1 130px", minWidth: 0 }}>
                  <option value="all">Mọi trạng thái</option>
                  {TRANG_THAI.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={() => { setReorderMode((v) => !v); setDragId(null); }} style={{ flexShrink: 0, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${reorderMode ? C.pine : C.line}`, background: reorderMode ? C.pine : C.card, color: reorderMode ? "#fff" : C.sub, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{reorderMode ? "⛔ Xong" : "⇅ Sắp xếp"}</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setLopSheetOpen(true)} style={{ ...inp, flex: "1 1 130px", minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {hsFilter === "all" ? "Tất cả lớp" : meta.classes.find((c) => c.id === hsFilter)?.ten}
                    </span>
                    <span style={{ fontSize: 10, color: C.sub, marginLeft: 6 }}>▼</span>
                  </button>
                  <button onClick={() => setTtSheetOpen(true)} style={{ ...inp, flex: "1 1 130px", minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {hsStatusFilter === "all" ? "Mọi trạng thái" : hsStatusFilter}
                    </span>
                    <span style={{ fontSize: 10, color: C.sub, marginLeft: 6 }}>▼</span>
                  </button>
                  <button onClick={() => { setReorderMode((v) => !v); setDragId(null); }} style={{ flexShrink: 0, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${reorderMode ? C.pine : C.line}`, background: reorderMode ? C.pine : C.card, color: reorderMode ? "#fff" : C.sub, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{reorderMode ? "⛔ Xong" : "⇅ Sắp xếp"}</button>
                </div>
                {/* Bottom Sheet Lớp */}
                <BottomSheet open={lopSheetOpen} onClose={() => setLopSheetOpen(false)} title="Chọn lớp">
                  {[{id:"all", ten:"Tất cả lớp"}, ...meta.classes.map((c)=>({id:c.id, ten:c.ten}))].map((item) => {
                    const active = hsFilter === item.id;
                    const count = item.id === "all" ? students.length : students.filter((s) => lopHienTai(s) === item.id).length;
                    return (
                      <div key={item.id} onClick={() => { setHsFilter(item.id); setLopSheetOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 4px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${active ? C.pine : C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {active && <div style={{ width: 12, height: 12, borderRadius: 99, background: C.pine }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: active ? C.pine : C.ink }}>{item.ten}</div>
                          <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{count} học sinh</div>
                        </div>
                      </div>
                    );
                  })}
                </BottomSheet>
                {/* Bottom Sheet Trạng thái */}
                <BottomSheet open={ttSheetOpen} onClose={() => setTtSheetOpen(false)} title="Chọn trạng thái">
                  {[{id:"all", ten:"Mọi trạng thái"}, ...TRANG_THAI.map((t)=>({id:t, ten:t}))].map((item) => {
                    const active = hsStatusFilter === item.id;
                    const count = item.id === "all" ? students.length : students.filter((s) => s.trangThai === item.id).length;
                    return (
                      <div key={item.id} onClick={() => { setHsStatusFilter(item.id); setTtSheetOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 4px", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${active ? C.pine : C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {active && <div style={{ width: 12, height: 12, borderRadius: 99, background: C.pine }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: active ? C.pine : C.ink }}>{item.ten}</div>
                          <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{count} học sinh</div>
                        </div>
                      </div>
                    );
                  })}
                </BottomSheet>
              </>
            )}
            <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 4 }}>
              {(() => { const f = students.filter((s) => (hsFilter === "all" || lopHienTai(s) === hsFilter) && (!hsSearch || noDau(s.ten).includes(noDau(hsSearch))) && (hsStatusFilter === "all" || s.trangThai === hsStatusFilter)); return `${f.length} HS đang hiển thị`; })()}
            </div>

          </div>

          {/* ===== STUDENT LIST ===== */}
          {(() => {
            const filtered = students.filter((s) => (hsFilter === "all" || lopHienTai(s) === hsFilter) && (!hsSearch || noDau(s.ten).includes(noDau(hsSearch))) && (hsStatusFilter === "all" || s.trangThai === hsStatusFilter));
            const shown = filtered.slice(0, hsLimit);
            // [Sap xep] di chuyen 1 HS theo danh sach DANG LOC (vi tri tuong doi giua cac em cung lop)
            const ordBtn = { border: `1px solid ${C.line}`, background: C.card, color: C.pine, cursor: "pointer", padding: "4px 7px", fontSize: 13, borderRadius: 7, lineHeight: 1 };
            const moveHS = (sid, dir) => {
              const fIdx = filtered.findIndex((x) => x.id === sid);
              if (fIdx < 0) return;
              let anchorId = null, after = false;
              if (dir === "up") { if (fIdx === 0) return; anchorId = filtered[fIdx - 1].id; }
              else if (dir === "down") { if (fIdx >= filtered.length - 1) return; anchorId = filtered[fIdx + 1].id; after = true; }
              else if (dir === "top") { if (fIdx === 0) return; anchorId = filtered[0].id; }
              const moved = students.find((x) => x.id === sid);
              if (!moved) return;
              const rest = students.filter((x) => x.id !== sid);
              let insertIdx = rest.findIndex((x) => x.id === anchorId);
              if (insertIdx < 0) insertIdx = rest.length;
              if (after) insertIdx += 1;
              rest.splice(insertIdx, 0, moved);
              upStudents(rest);
            };
            return (<>
            {filtered.length === 0 && <div style={{ textAlign: "center", color: C.sub, fontSize: 13.5, padding: 20 }}>Không có học sinh phù hợp.</div>}
            {shown.map((s, idx) => {
            const edit = editHS === s.id;
            const lh = lopHienTai(s);
            const isSel = selectedHS.includes(s.id);
            const isDragging = dragId === s.id;
            return (
              <Card key={s.id} style={{ marginBottom: 8, padding: 0, overflow: "hidden", border: bulkMode && isSel ? `2px solid ${C.pine}` : isDragging ? `2px dashed ${C.pine}` : undefined, opacity: isDragging ? 0.6 : 1, transition: "margin .2s ease" }}>
                {dragOverId === s.id && dragOverPos === "before" && (
                  <div style={{ height: 4, background: C.pine, borderRadius: 2, margin: "2px 8px", boxShadow: "0 1px 4px rgba(23,107,91,.35)" }} />
                )}
                <div
                  draggable={reorderMode}
                  onDragStart={(e) => { if (!reorderMode) return; e.dataTransfer.setData("text/plain", s.id); setDragId(s.id); }}
                  onDragOver={(e) => {
                    if (!reorderMode) return;
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    setDragOverId(s.id);
                    setDragOverPos(e.clientY < midY ? "before" : "after");
                  }}
                  onDrop={(e) => {
                    if (!reorderMode) return;
                    e.preventDefault();
                    const sourceId = e.dataTransfer.getData("text/plain");
                    if (sourceId === s.id) { setDragOverId(null); setDragOverPos(null); return; }
                    const sourceIdx = students.findIndex((x) => x.id === sourceId);
                    const targetIdx = students.findIndex((x) => x.id === s.id);
                    if (sourceIdx < 0 || targetIdx < 0) return;
                    const next = [...students];
                    const [moved] = next.splice(sourceIdx, 1);
                    let insertIdx = targetIdx;
                    if (sourceIdx < targetIdx) insertIdx = targetIdx - 1;
                    if (dragOverPos === "after") insertIdx++;
                    next.splice(insertIdx, 0, moved);
                    upStudents(next);
                    setDragId(null);
                    setDragOverId(null);
                    setDragOverPos(null);
                  }}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); setDragOverPos(null); }}
                  onDragLeave={() => { setDragOverId(null); setDragOverPos(null); }}
                  onClick={() => { if (reorderMode) return; if (bulkMode) setSelectedHS((prev) => isSel ? prev.filter((id) => id !== s.id) : [...prev, s.id]); else setEditHS(edit ? null : s.id); }}
                  onMouseDown={() => { if (reorderMode || bulkMode) return; longPressRef.current = setTimeout(() => { setReorderMode(true); setDragId(s.id); }, 2000); }}
                  onMouseUp={() => { clearTimeout(longPressRef.current); }}
                  onMouseLeave={() => { clearTimeout(longPressRef.current); }}
                  onTouchStart={() => { if (reorderMode || bulkMode) return; longPressRef.current = setTimeout(() => { setReorderMode(true); setDragId(s.id); }, 2000); }}
                  onTouchEnd={() => { clearTimeout(longPressRef.current); }}
                  style={{ padding: "12px 14px", cursor: reorderMode ? "grab" : "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      {reorderMode && <span style={{ fontSize: 16, color: C.gray, userSelect: "none" }}>⋮⋮</span>}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{s.ten}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
                          <span style={{ fontSize: 11.5, color: C.sub }}>{meta.classes.find((c) => c.id === lh)?.ten}</span>
                          <PLBadge pl={s.pl} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: TT_COLOR[s.trangThai], background: TT_COLOR[s.trangThai] + "18", padding: "2px 8px", borderRadius: 99 }}>{s.trangThai}</span>
                        </div>
                      </div>
                    </div>
                    {!bulkMode && !reorderMode && <ABBtn val={s.nguoiThu} set={(p) => setHS(s.id, { nguoiThu: p })} small />}
                    {bulkMode && <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSel ? C.pine : C.line}`, background: isSel ? C.pine : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{isSel ? "✓" : ""}</div>}
                    {reorderMode && (
                      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); moveHS(s.id, "top"); }} title="Lên đầu" style={ordBtn}>⤒</button>
                        <button onClick={(e) => { e.stopPropagation(); moveHS(s.id, "up"); }} title="Lên" style={ordBtn}>▲</button>
                        <button onClick={(e) => { e.stopPropagation(); moveHS(s.id, "down"); }} title="Xuống" style={ordBtn}>▼</button>
                        <button onClick={(e) => { e.stopPropagation(); delHS(s.id); }} title="Xóa" style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", padding: 4, fontSize: 18 }}>🗑</button>
                      </div>
                    )}
                  </div>
                </div>
                {dragOverId === s.id && dragOverPos === "after" && (
                  <div style={{ height: 4, background: C.pine, borderRadius: 2, margin: "2px 8px", boxShadow: "0 1px 4px rgba(23,107,91,.35)" }} />
                )}
                {edit && !bulkMode && !reorderMode && (
                  <div style={{ borderTop: `1px dashed ${C.line}`, padding: "12px", background: "#FBFDFB" }}>
                    <HSDetail s={s} meta={meta} ym={ym} setHS={setHS} chuyenLop={chuyenLop} inp={inp} />
                  </div>
                )}
              </Card>
            );
          })}
            {filtered.length > hsLimit && (
              <button onClick={() => setHsLimit((l) => l + 50)} style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: `1.5px solid ${C.pine}`, background: C.pineSoft, color: C.pine, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Hiện thêm 50 HS ({shown.length}/{filtered.length})</button>
            )}
            </>);
          })()}
        </>
      )}

      {sec === "lop" && (
        <>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 12, lineHeight: 1.55 }}>Thêm lớp = thêm 1 dòng, mọi tính toán tự nhận lớp mới.</div>
          {meta.classes.map((l) => (
            <Card key={l.id} style={{ padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <input value={l.ten} onChange={(e) => setLopGia(l.id, "ten", e.target.value)} style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, border: "none", background: "none", color: C.ink, outline: "none", width: "70%" }} />
                <button onClick={() => xoaLop(l.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>🗑</button>
              </div>
              {/* Buoi T7: chi co gia, khong co cong tac (tinh theo so buoi) */}
              <label style={{ fontSize: 11, color: C.sub, display: "block", marginBottom: 10 }}>Buổi T7 (giá/buổi)
                <input type="number" value={l.t7 || 0} onFocus={(e) => e.target.select()} onChange={(e) => setLopGia(l.id, "t7", Number(e.target.value) || 0)} style={{ width: "100%", marginTop: 3, padding: "6px 7px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontFamily: font.body, fontSize: 13, color: C.ink, background: "#FAFCFA", outline: "none" }} /></label>
              {/* Cac khoan co cong tac ngay canh */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {KHOAN.map((k) => {
                  const mode = khoanMode(l, k.key);
                  const badge = mode === "thu" ? { t: "✓ Thu", bg: C.greenSoft, fg: C.green } : { t: "🚫 Không thu", bg: C.coralSoft, fg: C.coral };
                  return (
                    <div key={k.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <label style={{ flex: 1, fontSize: 11, color: C.sub }}>{k.label}
                        <input type="number" value={l[k.key] || 0} disabled={mode === "khong"}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setLopGia(l.id, k.key, Number(e.target.value) || 0)}
                          style={{ width: "100%", marginTop: 3, padding: "6px 7px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontFamily: font.body, fontSize: 13, color: C.ink, background: mode === "khong" ? C.graySoft : "#FAFCFA", outline: "none" }} /></label>
                      <button onClick={() => cycleKhoan(l.id, k.key)} title="Chạm để đổi: Thu / Không thu"
                        style={{ alignSelf: "flex-end", marginBottom: 1, whiteSpace: "nowrap", padding: "6px 9px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: font.body, background: badge.bg, color: badge.fg, minWidth: 92, textAlign: "center" }}>
                        {badge.t}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10.5, color: C.sub, marginTop: 8 }}>Chạm nút bên phải để bật/tắt. Đổi giá hoặc tắt khoản sẽ cập nhật ngay vào tháng đang xem (trừ HS đã sửa tay & tháng đã chốt).</div>
            </Card>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={tenLopMoi} onChange={(e) => setTenLopMoi(e.target.value)} placeholder="Tên lớp mới" style={{ ...inp, flex: 1, minWidth: 0 }} />
            <button onClick={themLop} style={{ padding: "0 18px", borderRadius: 12, border: "none", background: C.pine, color: "#fff", fontFamily: font.display, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Thêm lớp</button>
          </div>
        </>
      )}

      {sec === "gv" && (
        <>
          <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 12 }}>Mỗi giáo viên có 1 PIN + 1 lớp. Khi đăng nhập bằng PIN, GV chỉ điểm danh lớp được giao (không thấy tiền, không đặt ngày lễ).</div>
          {(meta.giaoVien || []).map((gv) => (
            <Card key={gv.id} style={{ marginBottom: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{gv.ten}</div>
                <div style={{ fontSize: 12, color: C.sub }}>PIN: <b style={{ color: C.ink }}>{gv.pin}</b> · Lớp: {meta.classes.find((c) => c.id === gv.lopId)?.ten || "?"}</div>
              </div>
              <button onClick={() => xoaGV(gv.id)} style={{ color: C.coral, border: "none", background: "none", cursor: "pointer", fontSize: 16 }}>🗑</button>
            </Card>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <input value={gvTen} onChange={(e) => setGvTen(e.target.value)} placeholder="Tên GV" style={{ ...inp, flex: "2 1 120px", minWidth: 0 }} />
            <input value={gvPin} onChange={(e) => setGvPin(e.target.value)} placeholder="PIN" inputMode="numeric" style={{ ...inp, flex: "1 1 70px", width: 80, minWidth: 0 }} />
            <select value={gvLop} onChange={(e) => setGvLop(e.target.value)} style={{ ...inp, flex: "1 1 100px" }}>{meta.classes.map((c) => <option key={c.id} value={c.id}>{c.ten}</option>)}</select>
            <button onClick={themGV} style={{ padding: "0 16px", borderRadius: 10, border: "none", background: C.pine, color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ Thêm</button>
          </div>
        </>
      )}

      {sec === "bank" && (
        <>
          <input value={meta.tenTruong} onChange={(e) => upMeta({ ...meta, tenTruong: e.target.value })} placeholder="Tên trường" style={{ ...inp, width: "100%", marginBottom: 12, fontFamily: font.display, fontWeight: 700 }} />
          {["A", "B"].map((p) => (
            <Card key={p} style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, color: p === "A" ? C.blueA : C.violetB, marginBottom: 8 }}>Người {p} (in lên phiếu)</div>
              {[["Chủ TK", "chu"], ["Số TK", "stk"], ["Ngân hàng", "nh"]].map(([lb, k]) => (<label key={k} style={{ fontSize: 12, color: C.sub, display: "block", marginBottom: 7 }}>{lb}<input value={meta.bank[p][k]} onChange={(e) => setBank(p, k, e.target.value)} style={{ ...inp, width: "100%", marginTop: 3 }} /></label>))}
            </Card>
          ))}
        </>
      )}

      {sec === "dk" && (
        <Card>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>Số dư đầu kỳ (tiền & nợ nội bộ)</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>A nợ B và B nợ A không cùng &gt; 0 (cấn trừ trước). Nợ học phí đầu kỳ của từng HS nhập ở thẻ HS.</div>
          {[["Tiền mặt A đang giữ", "tienMatA"], ["Tiền mặt B đang giữ", "tienMatB"], ["A nợ B", "AnoB"], ["B nợ A", "BnoA"]].map(([lb, k]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: `1px solid ${C.line}` }}><span style={{ fontSize: 13.5, color: C.sub }}>{lb}</span><NumInput value={(meta.soDuDauKy || {})[k] || 0} onChange={(v) => setDK(k, v)} w={130} /></div>
          ))}
        </Card>
      )}

      {sec === "backup" && <BackupExport meta={meta} students={students} />}

      {sec === "log" && <AuditLog />}

      {sec === "data" && (
        <Card>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>Xóa sạch & bắt đầu lại</div>
          <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 14, lineHeight: 1.5 }}>Đưa app về trạng thái mới: giữ 6 lớp + đơn giá + tài khoản + giáo viên mẫu, nhưng <b style={{ color: C.coral }}>xóa toàn bộ học sinh, điểm danh và các tháng đã nhập.</b> Dùng khi muốn làm lại từ đầu.</div>
          <button onClick={async () => { if (await ask("Xóa TOÀN BỘ học sinh + điểm danh + các tháng, đưa về trạng thái mới?\n⚠️ Không hoàn tác. Nên Sao lưu trước.", { danger: true, okText: "Xóa sạch" })) { await reseedAll(); toast("Đã xóa sạch. Bắt đầu thêm học sinh ở Cài đặt → Học sinh."); } }}
            style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.coral}`, background: C.coralSoft, color: C.coral, fontFamily: font.display, fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
            ↻ Xóa sạch & bắt đầu lại
          </button>
        </Card>
      )}
    </>
  );
}
