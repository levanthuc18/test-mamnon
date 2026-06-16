import type { HocSinh } from "../types";

export function lopOfMonth(hs: HocSinh, ym: string): string | null {
  const hist = (hs.lopHistory || []).filter((h) => h.tuThang <= ym).sort((a, b) => a.tuThang.localeCompare(b.tuThang));
  return hist.length ? hist[hist.length - 1].lop : (hs.lopHistory?.[0]?.lop || null);
}

export function lopHienTai(hs: HocSinh): string | null {
  const h = (hs.lopHistory || []).slice().sort((a, b) => a.tuThang.localeCompare(b.tuThang));
  return h.length ? h[h.length - 1].lop : null;
}
