import { memo } from "react";
import { C, font } from "../../constants/colors";
import { TUAN } from "../../utils/dates";
import { ngayNhapHocTrongThang } from "../../utils/dates";
import type { HocSinh } from "../../types";

interface DDRowProps {
  r: { hs: HocSinh };
  att: Record<string, Record<number, boolean>>;
  toggle: (sid: string, d: number) => void;
  le: Record<number, boolean>;
  year: number;
  month: number;
  days: number;
  locked: boolean;
  index: number;
  todayD: number | null;
}

const DDRow = memo(function DDRow({
  r,
  att,
  toggle,
  le,
  year,
  month,
  days,
  locked,
  index,
  todayD,
}: DDRowProps) {
  const a = att[r.hs.id] || {};
  const soNghi = Object.keys(a).length;
  const nhap = ngayNhapHocTrongThang(r.hs, year, month);

  return (
    <tr style={{ background: index % 2 ? "#FAFCFA" : "#fff" }}>
      <td
        style={{
          position: "sticky",
          left: 0,
          background: "inherit",
          padding: "5px 6px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          zIndex: 1,
          borderRight: `1px solid ${C.line}`,
        }}
      >
        {r.hs.ten}
        {nhap > 1 && nhap < 99 && (
          <span style={{ fontSize: 9, color: C.amber, marginLeft: 4 }}>
            (nhập {nhap})
          </span>
        )}
      </td>
      {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
        const dw = new Date(year, month - 1, d).getDay();
        const isCN = dw === 0;
        const isLe = le[d];
        const off = a[d];
        const closed = isCN || isLe;
        const chuaNhap = nhap !== 1 && d < nhap;
        const chuaNhapThang = nhap === 99;
        const disabled = closed || locked || chuaNhap || chuaNhapThang;

        return (
          <td
            key={d}
            onClick={() => !disabled && toggle(r.hs.id, d)}
            title={chuaNhap || chuaNhapThang ? "Chưa nhập học" : ""}
            style={{
              width: 34,
              height: 38,
              fontSize: 15,
              textAlign: "center",
              cursor: disabled ? "default" : "pointer",
              background: isCN
                ? "#EFEFEC"
                : isLe
                ? C.amberSoft
                : chuaNhap || chuaNhapThang
                ? C.graySoft
                : off
                ? C.coralSoft
                : "transparent",
              color: chuaNhap || chuaNhapThang ? C.gray : C.coral,
              fontWeight: 700,
              border: `1px solid ${C.line}`,
              userSelect: "none",
              outline: d === todayD ? `1.5px solid ${C.pine}` : "none",
              outlineOffset: -1,
            }}
          >
            {chuaNhap || chuaNhapThang ? "·" : off && !closed ? "✕" : ""}
          </td>
        );
      })}
      <td
        style={{
          textAlign: "center",
          fontWeight: 700,
          color: soNghi ? C.coral : C.sub,
          padding: "0 6px",
        }}
      >
        {soNghi}
      </td>
    </tr>
  );
});

export default DDRow;
