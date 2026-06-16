import { describe, it, expect } from 'vitest';
import { tinhPSFromRec, defaultKhoan, isKhongThu } from '../finance';
import type { HocSinh, Lop, FeeRecord } from '../../types';

const lopMau: Lop = {
  id: 'c1', ten: 'Sóc Nhí', hocPhi: 800000, banTru: 200000,
  tienAn: 30000, t7: 80000, veSinh: 20000, tiengAnh: 100000,
  ngoaiKhoa: 100000, dongPhuc: 200000, dauNam: 1200000,
};

function makeRec(partial?: Partial<FeeRecord>): FeeRecord {
  return {
    ngayAn: 22, buoiT7: 0, thucThu: 0,
    khoan: {}, khoanDefault: {}, phuThu: [],
    ...partial,
  };
}

describe('tinhPSFromRec — nghiệp vụ gốc v5', () => {
  it('HS Bthg đầy đủ, không nghỉ, không nợ → tính đúng tổng', () => {
    const hs: HocSinh = {
      id: 'hs01', ten: 'Bé A', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({
      khoan: { hocPhi: 800000, banTru: 200000, veSinh: 20000, tienAn: 660000, tiengAnh: 100000, ngoaiKhoa: 100000 },
      khoanDefault: { hocPhi: 800000, banTru: 200000, veSinh: 20000, tienAn: 660000, tiengAnh: 100000, ngoaiKhoa: 100000 },
    });
    const result = tinhPSFromRec(hs, rec, lopMau, 0);
    expect(result.tong).toBe(1880000);
    expect(result.suaCount).toBe(0);
    expect(result.dong.some((d) => d[0].includes('Học phí'))).toBe(true);
  });

  it('HS GV (con giáo viên) → miễn 100%, chỉ hiện 1 dòng', () => {
    const hs: HocSinh = {
      id: 'hs02', ten: 'Bé B', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'GV', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec();
    const result = tinhPSFromRec(hs, rec, lopMau, 0);
    expect(result.tong).toBe(0);
    expect(result.dong.length).toBe(1);
    expect(result.dong[0][0]).toContain('Miễn phí');
  });

  it('HS T7 → chỉ tính tiền T7 + phụ thu, không tính khoản thường', () => {
    const hs: HocSinh = {
      id: 'hs03', ten: 'Bé C', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'T7', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({ buoiT7: 4, phuThu: [{ id: 'p1', ten: 'Dã ngoại', soTien: 150000 }] });
    const result = tinhPSFromRec(hs, rec, lopMau, 0);
    expect(result.tong).toBe(4 * 80000 + 150000);
    expect(result.dong.some((d) => d[0].includes('T7'))).toBe(true);
    expect(result.dong.some((d) => d[0].includes('Dã ngoại'))).toBe(true);
    expect(result.dong.some((d) => d[0].includes('Học phí'))).toBe(false);
  });

  it('HS nghỉ 3 ngày tháng trước → hiện dòng trừ nghỉ riêng, tổng trừ đúng', () => {
    const hs: HocSinh = {
      id: 'hs04', ten: 'Bé D', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({
      khoan: { hocPhi: 800000, banTru: 200000, veSinh: 20000, tienAn: 660000, tiengAnh: 100000, ngoaiKhoa: 100000 },
      khoanDefault: { hocPhi: 800000, banTru: 200000, veSinh: 20000, tienAn: 660000, tiengAnh: 100000, ngoaiKhoa: 100000 },
    });
    const result = tinhPSFromRec(hs, rec, lopMau, 3);
    const truNghi = result.dong.find((d) => d[0].includes('Trừ nghỉ'));
    expect(truNghi).toBeDefined();
    expect(truNghi![1]).toBe(-90000);
    expect(result.tong).toBe(1880000 - 90000);
  });

  it('Phát hiện khoản đã sửa tay (suaCount)', () => {
    const hs: HocSinh = {
      id: 'hs05', ten: 'Bé E', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({
      khoan: { hocPhi: 900000, banTru: 200000, veSinh: 20000, tienAn: 660000, tiengAnh: 100000, ngoaiKhoa: 100000 },
      khoanDefault: { hocPhi: 800000, banTru: 200000, veSinh: 20000, tienAn: 660000, tiengAnh: 100000, ngoaiKhoa: 100000 },
    });
    const result = tinhPSFromRec(hs, rec, lopMau, 0);
    expect(result.suaCount).toBe(1);
    const hocPhiDong = result.dong.find((d) => d[0].includes('Học phí'));
    expect(hocPhiDong![2]).toBe(true);
  });

  it('Phụ thu cá nhân và lớp cộng đúng vào tổng', () => {
    const hs: HocSinh = {
      id: 'hs06', ten: 'Bé F', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }],
      pl: 'Bthg', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01',
    };
    const rec = makeRec({
      khoan: { hocPhi: 800000, banTru: 200000, veSinh: 20000, tienAn: 660000, tiengAnh: 100000, ngoaiKhoa: 100000 },
      khoanDefault: { hocPhi: 800000, banTru: 200000, veSinh: 20000, tienAn: 660000, tiengAnh: 100000, ngoaiKhoa: 100000 },
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
    const hs: HocSinh = { id: 'h1', ten: 'A', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }], pl: 'Bthg', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01' };
    expect(defaultKhoan('hocPhi', lopMau, hs, 22)).toBe(800000);
  });
  it('hocPhi AE = 50%', () => {
    const hs: HocSinh = { id: 'h2', ten: 'A', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }], pl: 'AE', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01' };
    expect(defaultKhoan('hocPhi', lopMau, hs, 22)).toBe(400000);
  });
  it('hocPhi GV = 0', () => {
    const hs: HocSinh = { id: 'h3', ten: 'A', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }], pl: 'GV', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01' };
    expect(defaultKhoan('hocPhi', lopMau, hs, 22)).toBe(0);
  });
  it('tienAn = ngayAn * donGia', () => {
    const hs: HocSinh = { id: 'h4', ten: 'A', lopHistory: [{ tuThang: '2026-01', lop: 'c1' }], pl: 'Bthg', nguoiThu: 'A', trangThai: 'Đang học', ngayNhapHoc: '2026-01-01' };
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
