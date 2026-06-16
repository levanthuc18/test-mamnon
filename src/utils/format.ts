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

export const stripYm = (d: any): any => {
  const { __ym, ...rest } = d;
  return rest;
};
