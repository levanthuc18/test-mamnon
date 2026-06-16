export const TUAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function soNgayHoc(year: number, month: number, le: Record<number, boolean>, tuNgay = 1): number {
  const days = new Date(year, month, 0).getDate();
  let n = 0;
  for (let d = Math.max(1, tuNgay); d <= days; d++) {
    const dw = new Date(year, month - 1, d).getDay();
    if (dw === 0) continue;
    if (le && le[d]) continue;
    n++;
  }
  return n;
}

export function soBuoiT7Auto(year: number, month: number, attHS?: Record<number, boolean>): number {
  const days = new Date(year, month, 0).getDate();
  let n = 0;
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() === 6 && !(attHS && attHS[d])) n++;
  }
  return n;
}

export function ngayNhapHocTrongThang(hs: any, year: number, month: number): number {
  if (!hs || !hs.ngayNhapHoc) return 1;
  const [y, m, d] = hs.ngayNhapHoc.split('-').map(Number);
  if (y > year || (y === year && m > month)) return 99;
  if (y < year || (y === year && m < month)) return 1;
  return d;
}
