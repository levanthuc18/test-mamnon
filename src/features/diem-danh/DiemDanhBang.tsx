import { Card } from "../../components/ui";
import { C, font } from "../../constants/colors";
import { TUAN } from "../../utils/dates";
import DDRow from "./DDRow";
import type { HocSinh } from "../../types";

interface DiemDanhBangProps {
  studentRows: { hs: HocSinh; coRec: boolean; lopId?: string | null }[];
  att: Record<string, Record<number, boolean>>;
  toggle: (sid: string, d: number) => void;
  le: Record<number, boolean>;
  toggleLe: (d: number) => void;
  year: number;
  month: number;
  days: number;
  locked: boolean;
  isGV: boolean;
}

export function DiemDanhBang({
  studentRows,
  att,
  toggle,
  le,
  toggleLe,
  year,
  month,
  days,
  locked,
  isGV,
}: DiemDanhBangProps) {
  const dayArr = Array.from({ length: days }, (_, i) => i + 1);
  const today = new Date();
  const isCurMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayD = isCurMonth ? today.getDate() : null;

  if (studentRows.length === 0)
    return (
      <div style={{ textAlign: "center", color: C.sub, fontSize: 13.5, padding: 20 }}>
        Không có học sinh.
      </div>
    );

  return (
    <Card style={{ padding: 8, overflowX: "auto" }}>
      <div style={{ fontSize: 12, color: C.sub, margin: "2px 0 6px 4px" }}>
        Chạm ô để đánh <b style={{ color: C.coral }}>nghỉ ✕</b>
        {!isGV && (
          <>
            {" "}
            · chạm <b style={{ color: C.amber }}>số ngày trên đầu cột</b> để đặt ngày lễ
          </>
        )}
      </div>
      <table
        style={{
          borderCollapse: "collapse",
          fontSize: 11.5,
          fontFamily: font.body,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                position: "sticky",
                left: 0,
                background: C.card,
                textAlign: "left",
                padding: "4px 6px",
                minWidth: 106,
                zIndex: 2,
              }}
            >
              Học sinh
            </th>
            {dayArr.map((d) => {
              const dw = new Date(year, month - 1, d).getDay();
              const isCN = dw === 0;
              const isLe = le[d];
              return (
                <th
                  key={d}
                  onClick={() => !isCN && !locked && toggleLe(d)}
                  title={isCN ? "Chủ nhật" : "Chạm đặt/bỏ ngày lễ"}
                  style={{
                    padding: "2px 0",
                    width: 34,
                    minWidth: 34,
                    cursor: isCN || locked ? "default" : "pointer",
                    background: isLe
                      ? C.amberSoft
                      : d === todayD
                      ? C.pineSoft
                      : "transparent",
                    color: isCN
                      ? "#B6BDB8"
                      : isLe
                      ? C.amber
                      : d === todayD
                      ? C.pine
                      : dw === 6
                      ? C.blueA
                      : C.sub,
                    fontWeight: 600,
                    borderBottom: d === todayD ? `2px solid ${C.pine}` : undefined,
                  }}
                >
                  <div style={{ fontSize: 9, opacity: 0.8 }}>{TUAN[dw]}</div>
                  <div>{d}</div>
                  {isLe && <div style={{ fontSize: 8 }}>lễ</div>}
                </th>
              );
            })}
            <th style={{ padding: "0 6px", color: C.coral, fontWeight: 700 }}>
              Nghỉ
            </th>
          </tr>
        </thead>
        <tbody>
          {studentRows.map((r, ri) => (
            <DDRow
              key={r.hs.id}
              r={r}
              att={att}
              toggle={toggle}
              le={le}
              year={year}
              month={month}
              days={days}
              locked={locked}
              index={ri}
              todayD={todayD}
            />
          ))}
        </tbody>
      </table>
    </Card>
  );
}
