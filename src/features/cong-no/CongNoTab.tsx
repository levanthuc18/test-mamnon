import { useState, useEffect } from "react";
import { Card, useStickyShrink, StickyBar } from "../../components/ui";
import { C, font, TT_COLOR } from "../../constants/colors";
import { sList, sGet } from "../../services/storage";
import { ymKey, fmt } from "../../utils/format";
import { tinhPSFromRec } from "../../utils/finance";
import { lopOfMonth } from "../../utils/lop";
import type { HocSinh, Meta } from "../../types";

interface CongNoTabProps {
  students: HocSinh[];
  meta: Meta;
  ym: string;
  mData: any;
}

export function CongNoTab({ students, meta, ym, mData }: CongNoTabProps) {
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
