export type PhanLoai = 'Bthg' | 'AE' | 'GV' | 'T7';

export type TrangThai = 'Đang học' | 'Học thử' | 'Bảo lưu' | 'Nghỉ học' | 'Ra trường';

export type NguoiThu = 'A' | 'B';

export type LoaiChi = 'PHAT_SINH' | 'CO_DINH' | 'NO_AB' | 'CHUYEN' | 'TRA_NO';

export interface PhuHuynh {
  ten?: string;
  sdt?: string;
}

export interface LopHistoryItem {
  tuThang: string;
  lop: string;
}

export interface HocSinh {
  id: string;
  ten: string;
  ngaySinh?: string;
  lopHistory: LopHistoryItem[];
  pl: PhanLoai;
  nguoiThu: NguoiThu;
  trangThai: TrangThai;
  ngayNhapHoc: string;
  ngayNghiHoc?: string;
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
  __ym?: string;
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
  t: string;
  who: string;
  act: string;
}
