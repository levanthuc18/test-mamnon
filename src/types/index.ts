// ====================================================================
// V6.1 FOUNDATION — Types + Storage + Finance Utils + Tests
// Đọc ngược từ App_v5_bottomsheet để giữ nguyên nghiệp vụ
// ====================================================================

// -------------------------------------------------------------------
// 1. src/types/index.ts
// -------------------------------------------------------------------

export type PhanLoai = 'Bthg' | 'AE' | 'GV' | 'T7';

export type TrangThai = 'Đang học' | 'Học thử' | 'Bảo lưu' | 'Nghỉ học' | 'Ra trường';

export type NguoiThu = 'A' | 'B';

export type LoaiChi = 'PHAT_SINH' | 'CO_DINH' | 'NO_AB' | 'CHUYEN' | 'TRA_NO';

export interface PhuHuynh {
  ten?: string;
  sdt?: string;
}

export interface LopHistoryItem {
  tuThang: string; // YYYY-MM
  lop: string;     // lopId
}

export interface HocSinh {
  id: string;
  ten: string;
  ngaySinh?: string;          // YYYY-MM-DD
  lopHistory: LopHistoryItem[];
  pl: PhanLoai;
  nguoiThu: NguoiThu;
  trangThai: TrangThai;
  ngayNhapHoc: string;        // YYYY-MM-DD
  ngayNghiHoc?: string;       // YYYY-MM-DD
  noDauKy?: number;
  phuHuynh?: PhuHuynh;
}

export interface Lop {
  id: string;
  ten: string;
  hocPhi: number;
  banTru: number;
  tienAn: number;
  t7: number;
  veSinh: number;
  tiengAnh: number;
  ngoaiKhoa: number;
  dongPhuc: number;
  dauNam: number;
  lapLai?: Record<string, 'thu' | 'khong' | boolean | string>;
}

export interface KhoanPhiDef {
  key: string;
  label: string;
  src: string;
}

export interface PhuThuItem {
  id: string;
  ten: string;
  soTien: number;
  lop?: string;
  coDinh?: boolean;
}

export interface FeeRecord {
  ngayAn: number;
  ngayAnManual?: boolean;
  buoiT7: number;
  buoiT7Manual?: boolean;
  thucThu: number;
  khoan: Record<string, number>;
  khoanDefault: Record<string, number>;
  phuThu: PhuThuItem[];
  bienLai?: string;
}

export interface ChiPhiItem {
  id: string;
  noiDung: string;
  soTien: number;
  nguoiChi: NguoiThu;
  loai: LoaiChi;
  daTra: number;
  huong?: 'A->B' | 'B->A';
}

export interface ThuNgoaiItem {
  id: string;
  ten: string;
  soTien: number;
  thucThu: number;
  nguoiThu: NguoiThu;
}

export interface MonthData {
  fees: Record<string, FeeRecord>;
  thuNgoai: ThuNgoaiItem[];
  chiPhi: ChiPhiItem[];
  daChot: boolean;
  khoanThuLop: any[];
  noLuyKe?: Record<string, number>;
  __ym?: string; // runtime only, không lưu
}

export interface BankInfo {
  chu: string;
  stk: string;
  nh: string;
}

export interface GiaoVien {
  id: string;
  ten: string;
  pin: string;
  lopId: string;
}

export interface Meta {
  tenTruong: string;
  classes: Lop[];
  bank: Record<NguoiThu, BankInfo>;
  soDuDauKy: {
    tienMatA: number;
    tienMatB: number;
    AnoB: number;
    BnoA: number;
  };
  tyLeLaiA: number;
  soBienLai: Record<NguoiThu, number>;
  giaoVien?: GiaoVien[];
}

export interface LogEntry {
  t: string; // ISO
  who: string;
  act: string;
}

// -------------------------------------------------------------------
// 2. src/utils/format.ts
// -------------------------------------------------------------------

export const fmt = (n: number): string =>
  (n < 0 ? '-' : '') + Math.abs(Math.round(n || 0)).toLocaleString('vi-VN');

export const ymKey = (y: number, m: number): string =>
  `${y}-${String(m).padStart(2, '0')}`;

export const uid = (): string =>
  Math.random().toString(36).slice(2, 9);

export const noDau = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export const stripYm = (d: MonthData): Omit<MonthData, '__ym'> => {
  const { __ym, ...rest } = d;
  return rest;
};

// -------------------------------------------------------------------
// 3. src/utils/dates.ts
// -------------------------------------------------------------------

export const TUAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function soNgayHoc(year: number, month: number, le: Record<number, boolean>, tuNgay = 1): number {
  const days = new Date(year, month, 0).getDate();
  let n = 0;
  for (let d = Math.max(1, tuNgay); d <= days; d++) {
    const dw = new Date(year, month - 1, d).getDay();
    if (dw === 0) continue; // CN nghỉ
    if (le && le[d]) continue; // ngày lễ
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

export function ngayNhapHocTrongThang(hs: HocSinh, year: number, month: number): number {
  if (!hs || !hs.ngayNhapHoc) return 1;
  const [y, m, d] = hs.ngayNhapHoc.split('-').map(Number);
  if (y > year || (y === year && m > month)) return 99; // chưa nhập học
  if (y < year || (y === year && m < month)) return 1;   // đã nhập từ trước
  return d; // nhập giữa tháng
}

// -------------------------------------------------------------------
// 4. src/utils/finance.ts
// -------------------------------------------------------------------

export const PHAN_LOAI: PhanLoai[] = ['Bthg', 'AE', 'GV', 'T7'];

export const PL_HE: Record<PhanLoai, number> = { Bthg: 1, AE: 0.5, GV: 0, T7: 0 };

export const PL_LABEL: Record<PhanLoai, string> = {
  Bthg: 'Bình thường',
  AE: 'Anh em (−50%)',
  GV: 'Con GV (miễn)',
  T7: 'Chỉ thứ 7',
};

export const TRANG_THAI: TrangThai[] = [
  'Đang học',
  'Học thử',
  'Bảo lưu',
  'Nghỉ học',
  'Ra trường',
];

export const TT_THU_PHI: Record<TrangThai, boolean> = {
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
  dong: [string, number, boolean][]; // [label, value, isSua]
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

// -------------------------------------------------------------------
// 5. src/services/storage.ts
// -------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SB = !!(SUPABASE_URL && SUPABASE_KEY);

const SB_H: Record<string, string> = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const MEM: Record<string, any> = {};
const CHOT_MEM: Record<string, boolean> = {};

try {
  const _cm = typeof localStorage !== 'undefined' && localStorage.getItem('mn5:chotmem');
  if (_cm) Object.assign(CHOT_MEM, JSON.parse(_cm));
} catch {}

function saveChotMem() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('mn5:chotmem', JSON.stringify(CHOT_MEM));
  } catch {}
}

let storageOK = true;

function logError(context: string, err: any) {
  console.error(`[Storage Error][${context}]:`, err);
}

export async function sGet<T>(k: string): Promise<T | null> {
  if (SB) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/data?key=eq.${encodeURIComponent(k)}&select=value`,
        { headers: { ...SB_H, 'Cache-Control': 'no-cache' }, cache: 'no-store' }
      );
      if (r.ok) {
        const d = await r.json();
        const v = d?.[0] ? d[0].value : null;
        if (v != null) MEM[k] = v;
        return v ?? MEM[k] ?? null;
      }
    } catch (err) {
      logError('sGet_supabase', err);
    }
    return MEM[k] ?? null;
  }
  if (k in MEM) return MEM[k];
  try {
    const r = await (window as any).storage.get(k);
    const v = r ? JSON.parse(r.value) : null;
    if (v != null) MEM[k] = v;
    return v ?? MEM[k] ?? null;
  } catch (err) {
    logError('sGet_local', err);
    storageOK = false;
    return MEM[k] ?? null;
  }
}

export async function sSet<T>(k: string, v: T): Promise<void> {
  MEM[k] = v;
  if (SB) {
    try {
      const p = await fetch(`${SUPABASE_URL}/rest/v1/data?key=eq.${encodeURIComponent(k)}`, {
        method: 'PATCH',
        headers: { ...SB_H, Prefer: 'return=representation' },
        body: JSON.stringify({ value: v, updated_at: new Date().toISOString() }),
      });
      const txt = await p.text();
      if (p.status === 404 || txt === '[]') {
        await fetch(`${SUPABASE_URL}/rest/v1/data`, {
          method: 'POST',
          headers: { ...SB_H, Prefer: 'return=minimal,resolution=merge-duplicates' },
          body: JSON.stringify({ key: k, value: v }),
        });
      }
    } catch (err) {
      logError('sSet_supabase', err);
    }
    return;
  }
  try {
    await (window as any).storage.set(k, JSON.stringify(v));
  } catch (err) {
    logError('sSet_local', err);
    storageOK = false;
  }
}

export async function sList(prefix: string): Promise<string[]> {
  const memKeys = Object.keys(MEM).filter((k) => k.startsWith(prefix) && MEM[k] != null);
  if (SB) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/data?select=key&key=like.${encodeURIComponent(prefix + '%')}`,
        { headers: { ...SB_H, 'Cache-Control': 'no-cache' }, cache: 'no-store' }
      );
      if (r.ok) {
        const d = await r.json();
        return Array.from(new Set([...memKeys, ...d.map((x: any) => x.key)]));
      }
    } catch (err) {
      logError('sList_supabase', err);
    }
    return memKeys;
  }
  try {
    const r = await (window as any).storage.list(prefix);
    const dk = r ? r.keys : [];
    return Array.from(new Set([...memKeys, ...dk]));
  } catch (err) {
    logError('sList_local', err);
    return memKeys;
  }
}

export async function sDel(k: string): Promise<void> {
  delete MEM[k];
  if (SB) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/data?key=eq.${encodeURIComponent(k)}`, { method: 'DELETE', headers: SB_H });
    } catch (err) {
      logError('sDel_supabase', err);
    }
    return;
  }
  try {
    await (window as any).storage.delete(k);
  } catch (err) {
    logError('sDel_local', err);
  }
}

export { CHOT_MEM, saveChotMem };

// -------------------------------------------------------------------
// 6. src/utils/__tests__/finance.test.ts
// -------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { tinhPSFromRec, defaultKhoan, isKhongThu } from '../finance';
import type { HocSinh, Lop, FeeRecord } from '../../types';

const lopMau: Lop = {
  id: 'c1',
  ten: 'Sóc Nhí',
  hocPhi: 800000,
  banTru: 200000,
  tienAn: 30000,
  t7: 80000,
  veSinh: 20000,
  tiengAnh: 100000,
  ngoaiKhoa: 100000,
  dongPhuc: 200000,
  dauNam: 1200000,
};

function makeRec(partial?: Partial<FeeRecord>): FeeRecord {
  return {
    ngayAn: 22,
    buoiT7: 0,
    thucThu: 0,
    khoan: {},
    khoanDefault: {},
    phuThu: [],
    ...partial,
  };
}

describe('tinhPSFromRec — nghiệp vụ gốc v5', () => {
  it('HS Bthg đầy đủ, không nghỉ, không nợ → tính đúng tổng', () => {
    const hs: HocSinh = {
      id: 'hs01',
      ten: 'Bé A',
      lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg',
      nguoiThu: 'A',
      trangThai: 'Đang học',
      ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({
      khoan: {
        hocPhi: 800000,
        banTru: 200000,
        veSinh: 20000,
        tienAn: 660000,
        tiengAnh: 100000,
        ngoaiKhoa: 100000,
      },
      khoanDefault: {
        hocPhi: 800000,
        banTru: 200000,
        veSinh: 20000,
        tienAn: 660000,
        tiengAnh: 100000,
        ngoaiKhoa: 100000,
      },
    });
    const result = tinhPSFromRec(hs, rec, lopMau, 0);
    expect(result.tong).toBe(800000 + 200000 + 20000 + 660000 + 100000 + 100000); // 1.880.000
    expect(result.suaCount).toBe(0);
    expect(result.dong.some((d) => d[0].includes('Học phí'))).toBe(true);
  });

  it('HS GV (con giáo viên) → miễn 100%, chỉ hiện 1 dòng', () => {
    const hs: HocSinh = {
      id: 'hs02',
      ten: 'Bé B',
      lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'GV',
      nguoiThu: 'A',
      trangThai: 'Đang học',
      ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec();
    const result = tinhPSFromRec(hs, rec, lopMau, 0);
    expect(result.tong).toBe(0);
    expect(result.dong.length).toBe(1);
    expect(result.dong[0][0]).toContain('Miễn phí');
  });

  it('HS T7 → chỉ tính tiền T7 + phụ thu, không tính khoản thường', () => {
    const hs: HocSinh = {
      id: 'hs03',
      ten: 'Bé C',
      lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'T7',
      nguoiThu: 'A',
      trangThai: 'Đang học',
      ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({
      buoiT7: 4,
      phuThu: [{ id: 'p1', ten: 'Dã ngoại', soTien: 150000 }],
    });
    const result = tinhPSFromRec(hs, rec, lopMau, 0);
    expect(result.tong).toBe(4 * 80000 + 150000); // 320000 + 150000 = 470000
    expect(result.dong.some((d) => d[0].includes('T7'))).toBe(true);
    expect(result.dong.some((d) => d[0].includes('Dã ngoại'))).toBe(true);
    expect(result.dong.some((d) => d[0].includes('Học phí'))).toBe(false);
  });

  it('HS nghỉ 3 ngày tháng trước → hiện dòng trừ nghỉ riêng, tổng trừ đúng', () => {
    const hs: HocSinh = {
      id: 'hs04',
      ten: 'Bé D',
      lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg',
      nguoiThu: 'A',
      trangThai: 'Đang học',
      ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({
      khoan: {
        hocPhi: 800000,
        banTru: 200000,
        veSinh: 20000,
        tienAn: 660000,
        tiengAnh: 100000,
        ngoaiKhoa: 100000,
      },
      khoanDefault: {
        hocPhi: 800000,
        banTru: 200000,
        veSinh: 20000,
        tienAn: 660000,
        tiengAnh: 100000,
        ngoaiKhoa: 100000,
      },
    });
    const result = tinhPSFromRec(hs, rec, lopMau, 3);
    const truNghi = result.dong.find((d) => d[0].includes('Trừ nghỉ'));
    expect(truNghi).toBeDefined();
    expect(truNghi![1]).toBe(-90000); // 3 * 30000
    expect(result.tong).toBe(1880000 - 90000);
  });

  it('Phát hiện khoản đã sửa tay (suaCount)', () => {
    const hs: HocSinh = {
      id: 'hs05',
      ten: 'Bé E',
      lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg',
      nguoiThu: 'A',
      trangThai: 'Đang học',
      ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({
      khoan: {
        hocPhi: 900000, // sửa tay từ 800k
        banTru: 200000,
        veSinh: 20000,
        tienAn: 660000,
        tiengAnh: 100000,
        ngoaiKhoa: 100000,
      },
      khoanDefault: {
        hocPhi: 800000,
        banTru: 200000,
        veSinh: 20000,
        tienAn: 660000,
        tiengAnh: 100000,
        ngoaiKhoa: 100000,
      },
    });
    const result = tinhPSFromRec(hs, rec, lopMau, 0);
    expect(result.suaCount).toBe(1);
    const hocPhiDong = result.dong.find((d) => d[0].includes('Học phí'));
    expect(hocPhiDong![2]).toBe(true); // isSua = true
  });

  it('Phụ thu cá nhân và lớp cộng đúng vào tổng', () => {
    const hs: HocSinh = {
      id: 'hs06',
      ten: 'Bé F',
      lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg',
      nguoiThu: 'A',
      trangThai: 'Đang học',
      ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({
      khoan: {
        hocPhi: 800000,
        banTru: 200000,
        veSinh: 20000,
        tienAn: 660000,
        tiengAnh: 100000,
        ngoaiKhoa: 100000,
      },
      khoanDefault: {
        hocPhi: 800000,
        banTru: 200000,
        veSinh: 20000,
        tienAn: 660000,
        tiengAnh: 100000,
        ngoaiKhoa: 100000,
      },
      phuThu: [
        { id: 'p1', ten: 'Đầu năm', soTien: 1200000 },
        { id: 'p2', ten: 'Dã ngoại', soTien: 150000, lop: 'c1' },
      ],
    });
    const result = tinhPSFromRec(hs, rec, lopMau, 0);
    expect(result.tong).toBe(1880000 + 1200000 + 150000);
    expect(result.dong.some((d) => d[0].includes('Đầu năm'))).toBe(true);
    expect(result.dong.some((d) => d[0].includes('Dã ngoại'))).toBe(true);
  });
});

describe('defaultKhoan', () => {
  it('hocPhi Bthg = 100% lop.hocPhi', () => {
    const hs: HocSinh = {
      id: 'h1', ten: 'A', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    expect(defaultKhoan('hocPhi', lopMau, hs, 22)).toBe(800000);
  });

  it('hocPhi AE = 50%', () => {
    const hs: HocSinh = {
      id: 'h2', ten: 'A', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'AE', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    expect(defaultKhoan('hocPhi', lopMau, hs, 22)).toBe(400000);
  });

  it('hocPhi GV = 0', () => {
    const hs: HocSinh = {
      id: 'h3', ten: 'A', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'GV', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    expect(defaultKhoan('hocPhi', lopMau, hs, 22)).toBe(0);
  });

  it('tienAn = ngayAn * donGia', () => {
    const hs: HocSinh = {
      id: 'h4', ten: 'A', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    expect(defaultKhoan('tienAn', lopMau, hs, 20)).toBe(600000);
  });
});

describe('isKhongThu / khoanMode', () => {
  const lopThu: Lop = { ...lopMau, lapLai: {} };
  const lopKhong: Lop = { ...lopMau, lapLai: { dauNam: 'khong', dongPhuc: false } };

  it('mặc định = thu', () => {
    expect(isKhongThu(lopThu, 'hocPhi')).toBe(false);
    expect(isKhongThu(undefined, 'hocPhi')).toBe(false);
  });

  it('lapLai = khong hoặc false → không thu', () => {
    expect(isKhongThu(lopKhong, 'dauNam')).toBe(true);
    expect(isKhongThu(lopKhong, 'dongPhuc')).toBe(true);
  });

  it('lapLai = thu hoặc true → thu', () => {
    const lopMixed: Lop = { ...lopMau, lapLai: { dauNam: 'thu', dongPhuc: true } };
    expect(isKhongThu(lopMixed, 'dauNam')).toBe(false);
    expect(isKhongThu(lopMixed, 'dongPhuc')).toBe(false);
  });
});

// -------------------------------------------------------------------
// 7. Regression Checklist (Markdown)
// -------------------------------------------------------------------

/*
## Regression Checklist — Mầm Non v6.1

Chạy sau mỗi tuần refactor:

- [ ] Tạo tháng mới → fees tự sinh cho HS đang học
- [ ] Xóa bảng thu tháng → giữ điểm danh
- [ ] Chốt tháng → khóa sửa, snapshot noLuyKe
- [ ] Mở khóa tháng → cho sửa lại
- [ ] Điểm danh ngày → toggle nghỉ, lưu sau F5
- [ ] Điểm danh bảng tháng → chạm ô đánh nghỉ
- [ ] Đặt ngày lễ → tự tính lại ngày ăn
- [ ] Chuyển lớp HS giữa tháng → lopHistory append
- [ ] Thu đủ 1 HS → thucThu = tongPhaiThu
- [ ] Thu thiếu → conNo > 0, hiện màu đỏ
- [ ] Thu thừa → conNo < 0, hiện màu vàng
- [ ] In phiếu thu → cấp số biên lai, QR đúng người thu
- [ ] Phụ thu cá nhân → cộng vào tổng
- [ ] Phụ thu cả lớp → cộng cho mọi HS lớp đó
- [ ] Backup JSON → export đầy đủ keys mn5:*
- [ ] Restore JSON → ghi đè, reload trang
- [ ] Import CSV HS → parse đúng, thêm vào students
- [ ] Đăng nhập GV → chỉ thấy lớp mình, không thấy tiền
- [ ] Đăng nhập Admin → thấy toàn bộ, chốt tháng
- [ ] Tính nợ lũy kế 3 tháng → đúng số, bù trừ thừa/thiếu
- [ ] Đổi phân loại HS → tính lại học phí tháng đang mở
- [ ] Đổi trạng thái HS nghỉ học → không tạo fees tháng sau
- [ ] Đổi đơn giá lớp → tự cập nhật default tháng đang mở (trừ HS đã sửa tay)
- [ ] Nút "Thu đủ hàng loạt" → ghi đúng, không miss HS
- [ ] Chuyển tiền A→B trong chi phí → cập nhật đúng quỹ
- [ ] Trả nợ NCC → không tính vào chi phí tháng, chỉ trừ tiền mặt
- [ ] Đổi tỷ lệ lãi A/B → tính lại chia quỹ
- [ ] Snapshot backup tự động → mn5:backup:YYYY-MM tồn tại
*/
