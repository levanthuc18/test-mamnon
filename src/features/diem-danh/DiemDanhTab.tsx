import { useMemo, useState } from "react";
import { Card, Chips, SearchBar, StickyBar, useStickyShrink } from "../../components/ui";
import { C, font } from "../../constants/colors";
import { soNgayHoc, ngayNhapHocTrongThang } from "../../utils/dates";
import { noDau } from "../../utils/format";
import { TT_THU_PHI } from "../../utils/finance";
import { DiemDanhBang } from "./DiemDanhBang";
import type { HocSinh, MonthData } from "../../types";

interface DiemDanhTabProps {
  students: HocSinh[];
  classes: { id: string; ten: string }[];
  ddData: Record<string, Record<number, boolean>>;
  upDDData: (d: Record<string, Record<number, boolean>>) => void;
  leData: Record<number, boolean>;
  upLeData: (d: Record<number, boolean>) => void;
  year: number;
  month: number;
  locked: boolean;
  isWide: boolean;
  isGV: boolean;
  gvLopId: string | null;
  gvTen: string;
  ym: string;
}

export function DiemDanhTab({
  students,
  classes,
  ddData,
  upDDData,
  leData,
  upLeData,
  year,
  month,
  locked,
  isWide,
  isGV,
  gvLopId,
  gvTen,
}: DiemDanhTabProps) {
  const today = new Date();
  const isCurMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const days = new Date(year, month, 0).getDate();
  const [viewDay, setViewDay] = useState(isCurMonth ? today.getDate() : 1);
  const [mode, setMode] = useState(isWide ? "thang" : "ngay");
  const [search, setSearch] = useState("");
  const [lopFilter, setLopFilter] = useState(isGV ? (gvLopId || "all") : "all");
  const att = ddData || {};
  const { sentinelRef, shrunk } = useStickyShrink();

  const studentRows = useMemo(() => {
    const s = noDau(search);
    const effLop = isGV ? gvLopId : lopFilter;
    return students
      .filter((hs) => TT_THU_PHI[hs.trangThai])
      .map((hs) => {
        const hist = (hs.lopHistory || [])
          .filter((h) => h.tuThang <= ym)
          .sort((a, b) => a.tuThang.localeCompare(b.tuThang));
        const lopId = hist.length ? hist[hist.length - 1].lop : null;
        return { hs, lopId, coRec: true };
      })
      .filter(
        (r) =>
          (effLop === "all" || r.lopId === effLop) &&
          (!s || noDau(r.hs.ten).includes(s))
      );
  }, [students, lopFilter, search, isGV, gvLopId, ym]);

  const toggle = (sid: string, d: number) => {
    if (locked) return;
    const hs = studentRows.find((r) => r.hs.id === sid)?.hs;
    const nhap = ngayNhapHocTrongThang(hs, year, month);
    if (nhap !== 1 && d < nhap) return;
    if (nhap === 99) return;
    const cur = { ...(att[sid] || {}) };
    if (cur[d]) delete cur[d];
    else cur[d] = true;
    upDDData({ ...att, [sid]: cur });
  };

  const toggleLe = (d: number) => {
    if (locked || isGV) return;
    const cur = { ...(leData || {}) };
    if (cur[d]) delete cur[d];
    else cur[d] = true;
    upLeData(cur);
  };

  const lopTen =
    isGV
      ? classes.find((c) => c.id === gvLopId)?.ten || "?"
      : "";

  const dow = new Date(year, month - 1, viewDay).getDay();
  const dowLabel = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][dow];
  const soNghiNgay = studentRows.filter((r) => att[r.hs.id]?.[viewDay]).length;
  const isLeNgay = (leData || {})[viewDay];

  const chipsLop: [string, string][] = [
    ["all", "Tất cả"],
    ...classes.map((c) => [c.id, c.ten] as [string, string]),
  ];

  return (
    <>
      {isGV && (
        <div
          style={{
            fontSize: 13.5,
            color: C.pine,
            fontWeight: 700,
            marginBottom: 10,
            padding: "10px 14px",
            background: C.pineSoft,
            borderRadius: 10,
          }}
        >
          👩‍🏫 {gvTen} — Lớp {lopTen}
          <div
            style={{
              fontSize: 12,
              color: C.sub,
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            {studentRows.length} cháu trong lớp · Toàn trường{" "}
            {students.filter((s) => TT_THU_PHI[s.trangThai]).length} cháu đang học
          </div>
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />

      <StickyBar shrunk={shrunk}>
        {!isGV && (
          <>
            <SearchBar value={search} onChange={setSearch} />
            <Chips items={chipsLop} val={lopFilter} set={setLopFilter} />
          </>
        )}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button
            onClick={() => setMode("ngay")}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: `1.5px solid ${mode === "ngay" ? C.pine : C.line}`,
              background: mode === "ngay" ? C.pine : C.card,
              color: mode === "ngay" ? "#fff" : C.sub,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: font.body,
            }}
          >
            Theo ngày
          </button>
          <button
            onClick={() => setMode("thang")}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: `1.5px solid ${mode === "thang" ? C.pine : C.line}`,
              background: mode === "thang" ? C.pine : C.card,
              color: mode === "thang" ? "#fff" : C.sub,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: font.body,
            }}
          >
            Cả tháng (bảng)
          </button>
        </div>
      </StickyBar>

      {locked && (
        <div
          style={{
            background: C.goldSoft,
            border: `1px solid #EAD8A0`,
            borderRadius: 10,
            padding: "8px 12px",
            marginBottom: 10,
            fontSize: 12.5,
            color: "#7A5E12",
          }}
        >
          🔒 Điểm danh đã khóa. Mở khóa tháng sau để sửa.
        </div>
      )}

      {mode === "ngay" ? (
        <>
          <Card style={{ marginBottom: 12, padding: "10px 12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <button
                onClick={() => setViewDay(Math.max(1, viewDay - 1))}
                style={{
                  fontSize: 20,
                  color: C.pine,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: "0 6px",
                }}
              >
                ‹
              </button>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: font.display,
                    fontWeight: 700,
                    fontSize: 16,
                    color: dow === 0 ? C.gray : isLeNgay ? C.amber : C.ink,
                  }}
                >
                  {dowLabel}, {viewDay}/{month}
                </div>
                <div style={{ fontSize: 11.5, color: C.sub }}>
                  {dow === 0
                    ? "Chủ nhật — nghỉ"
                    : isLeNgay
                    ? "Ngày lễ — nghỉ cả trường"
                    : `Nghỉ: ${soNghiNgay}/${studentRows.length} cháu`}
                  {isCurMonth && viewDay === today.getDate() ? " · hôm nay" : ""}
                </div>
              </div>
              <button
                onClick={() => setViewDay(Math.min(days, viewDay + 1))}
                style={{
                  fontSize: 20,
                  color: C.pine,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: "0 6px",
                }}
              >
                ›
              </button>
            </div>
            <input
              type="range"
              min={1}
              max={days}
              value={viewDay}
              onChange={(e) => setViewDay(Number(e.target.value))}
              style={{ width: "100%", marginTop: 8, accentColor: C.pine }}
            />
            {dow !== 0 && !locked && !isGV && (
              <button
                onClick={() => toggleLe(viewDay)}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "8px 0",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12.5,
                  fontFamily: font.body,
                  background: isLeNgay ? C.amber : C.amberSoft,
                  color: isLeNgay ? "#fff" : C.amber,
                }}
              >
                {isLeNgay
                  ? "✓ Đang là ngày lễ — chạm để bỏ"
                  : "📅 Đặt ngày này là ngày lễ (nghỉ cả trường)"}
              </button>
            )}
          </Card>

          {dow === 0 || isLeNgay ? (
            <div
              style={{
                textAlign: "center",
                color: isLeNgay ? C.amber : C.gray,
                fontSize: 13.5,
                padding: 24,
              }}
            >
              {isLeNgay
                ? "Ngày lễ — cả trường nghỉ, không điểm danh."
                : "Chủ nhật — không điểm danh."}
            </div>
          ) : studentRows.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: C.sub,
                fontSize: 13.5,
                padding: 20,
              }}
            >
              Không có học sinh.
            </div>
          ) : (
            studentRows.map((r) => {
              const nhap = ngayNhapHocTrongThang(r.hs, year, month);
              const chuaNhap = nhap !== 1 && viewDay < nhap;
              const chuaNhapThang = nhap === 99;
              const nghi = !chuaNhap && !chuaNhapThang ? att[r.hs.id]?.[viewDay] : false;
              const disabled = locked || chuaNhap || chuaNhapThang;

              return (
                <div
                  key={r.hs.id}
                  onClick={() => !disabled && toggle(r.hs.id, viewDay)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    marginBottom: 8,
                    borderRadius: 14,
                    background: C.card,
                    border: `1.5px solid ${
                      disabled ? C.gray : nghi ? C.coral : C.line
                    }`,
                    cursor: disabled ? "default" : "pointer",
                    opacity: disabled ? 0.65 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: disabled
                        ? C.graySoft
                        : nghi
                        ? C.coralSoft
                        : C.greenSoft,
                      color: disabled ? C.gray : nghi ? C.coral : C.green,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {disabled ? "·" : nghi ? "✕" : "✓"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {r.hs.ten}
                    </div>
                    <div style={{ fontSize: 12, color: C.sub }}>
                      {classes.find((c) => c.id === r.lopId)?.ten}
                      {chuaNhap && (
                        <span style={{ color: C.amber, marginLeft: 4 }}>
                          · nhập {nhap}
                        </span>
                      )}
                      {chuaNhapThang && (
                        <span style={{ color: C.amber, marginLeft: 4 }}>
                          · chưa nhập
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 9px",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      background: disabled
                        ? C.graySoft
                        : nghi
                        ? C.coralSoft
                        : C.greenSoft,
                      color: disabled ? C.gray : nghi ? C.coral : C.green,
                    }}
                  >
                    {disabled ? "—" : nghi ? "Nghỉ" : "Đi học"}
                  </span>
                </div>
              );
            })
          )}
        </>
      ) : (
        <DiemDanhBang
          studentRows={studentRows}
          att={att}
          toggle={toggle}
          le={leData || {}}
          toggleLe={toggleLe}
          year={year}
          month={month}
          days={days}
          locked={locked}
          isGV={isGV}
        />
      )}
    </>
  );
}
