import type { HocSinh, Lop, FeeRecord, KhoanPhiDef, PhanLoai } from '../types';

export const PHAN_LOAI: PhanLoai[] = ['Bthg', 'AE', 'GV', 'T7'];

export const PL_HE: Record<<PhanLoai, number> = { Bthg: 1, AE: 0.5, GV: 0, T7: 0 };

export const PL_LABEL: Record<<PhanLoai, string> = {
  Bthg: 'Bình thường',
  AE: 'Anh em (−50%)',
  GV: 'Con GV (miễn)',
  T7: 'Chỉ thứ 7',
};

export const TRANG_THAI = [
  'Đang học', 'Học thử', 'Bảo lưu', 'Nghỉ học', 'Ra trường',
] as const;

export const TT_THU_PHI: Record<string, boolean> = {
  'Đang học': true,
  'Học thử': true,
  'Bảo lưu': false,
  'Nghỉ học': false,
  'Ra trường': false,
};

export const KHOAN: KhoanPhiDef[] = [
  { key: 'hocPhi', label: 'Học phí', src: 'hocPhi' },
  { key: 'banTru', label: 'Bán trú', src: 'lopFlat' },
  { key: 'veSinh', label: 'Vệ sinh', src: 'lopFlat' },
  { key: 'tienAn', label: 'Tiền ăn', src: 'an' },
  { key: 'tiengAnh', label: 'Tiếng Anh', src: 'ta' },
  { key: 'ngoaiKhoa', label: 'Ngoại khóa', src: 'lopFlat' },
  { key: 'dongPhuc', label: 'Đồng phục', src: 'zero' },
  { key: 'dauNam', label: 'Đầu năm', src: 'zero' },
];

export function defaultKhoan(key: string, lop: Lop, hs: HocSinh, ngayAn: number): number {
  if (!lop) return 0;
  switch (key) {
    case 'hocPhi': return Math.round((lop.hocPhi || 0) * (PL_HE[hs.pl] ?? 1));
    case 'banTru': return lop.banTru || 0;
    case 'veSinh': return lop.veSinh || 0;
    case 'tienAn': return (ngayAn || 0) * (lop.tienAn || 0);
    case 'tiengAnh': return lop.tiengAnh || 0;
    case 'ngoaiKhoa': return lop.ngoaiKhoa || 0;
    case 'dongPhuc': return lop.dongPhuc || 0;
    case 'dauNam': return lop.dauNam || 0;
    default: return 0;
  }
}

export function khoanMode(lop: Lop | undefined, key: string): 'thu' | 'khong' {
  const m = lop?.lapLai;
  if (!m || m[key] === undefined) return 'thu';
  const v = m[key];
  if (v === false || v === 'khong') return 'khong';
  return 'thu';
}

export function isKhongThu(lop: Lop | undefined, key: string): boolean {
  return khoanMode(lop, key) === 'khong';
}

export interface PSResult {
  tong: number;
  dong: [string, number, boolean][];
  suaCount: number;
}

export function tinhPSFromRec(hs: HocSinh, rec: FeeRecord | undefined, lop: Lop | undefined, soNghi: number): PSResult {
  if (!rec) return { tong: 0, dong: [], suaCount: 0 };
  const dong: [string, number, boolean][] = [];
  let tong = 0;
  let suaCount = 0;

  if (hs.pl === 'GV') {
    return { tong: 0, dong: [['Miễn phí (con GV)', 0, false]], suaCount: 0 };
  }

  if (hs.pl === 'T7') {
    const tienT7 = (rec.buoiT7 || 0) * (lop?.t7 || 0);
    if (tienT7) { dong.push([`T7 (${rec.buoiT7} buổi)`, tienT7, false]); tong += tienT7; }
    (rec.phuThu || []).forEach((p) => { dong.push([p.ten, p.soTien, false]); tong += p.soTien; });
    return { tong, dong, suaCount: 0 };
  }

  KHOAN.forEach((k) => {
    let val = rec.khoan?.[k.key] ?? 0;
    let def = rec.khoanDefault?.[k.key] ?? 0;

    if (k.key === 'tienAn') {
      const sua = val !== def;
      if (val !== 0 || def !== 0) {
        dong.push([`Ăn (${rec.ngayAn || 0} ngày)`, val, sua]);
        tong += val;
        if (sua) suaCount++;
      }
      if (soNghi > 0) {
        const tru = -soNghi * (lop?.tienAn || 0);
        dong.push([`Trừ nghỉ tháng trước (${soNghi})`, tru, false]);
        tong += tru;
      }
      return;
    }

    if (val === 0 && def === 0) return;
    const sua = val !== def;
    dong.push([k.label, val, sua]);
    tong += val;
    if (sua) suaCount++;
  });

  if (rec.buoiT7 > 0) {
    const t = rec.buoiT7 * (lop?.t7 || 0);
    dong.push([`T7 (${rec.buoiT7} buổi)`, t, false]);
    tong += t;
  }

  (rec.phuThu || []).forEach((p) => {
    dong.push([p.ten, p.soTien, false]);
    tong += p.soTien;
  });

  return { tong, dong, suaCount };
}

export function trangThaiThu(ps: number, thucThu: number): { t: string; c: string; bg: string } {
  if (ps === 0) return { t: 'Miễn phí', c: '#8A938E', bg: '#EEF1EE' };
  if (thucThu === 0) return { t: 'Chưa thu', c: '#D14B32', bg: '#FBEAE5' };
  if (thucThu > ps) return { t: 'Thu thừa', c: '#A8731B', bg: '#FBF1DC' };
  if (thucThu >= ps) return { t: 'Đủ', c: '#2E8F63', bg: '#E4F3EA' };
  return { t: 'Thiếu', c: '#D14B32', bg: '#FBEAE5' };
}
