import { Response } from 'express';
import { formatVND } from '@hotel/shared';

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber: () => number }).toNumber === 'function') {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value !== null && value !== undefined) {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

const FIXED_HOLIDAYS = new Set([
  '01-01', // Tết Dương lịch
  '04-30', // Ngày Giải phóng miền Nam
  '05-01', // Quốc tế Lao động
  '09-02', // Quốc khánh
  '09-03', // Quốc khánh (nghỉ bù/liền kề)
  '12-24', // Giáng sinh
  '12-31', // Giao thừa Dương lịch
]);

const SPECIAL_HOLIDAY_DATES = new Set([
  '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-04-07',
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-04-26',
  '2027-02-05', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-04-16',
]);

export function isHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const mmdd = `${month}-${day}`;
  const yyyymmdd = `${year}-${mmdd}`;
  return FIXED_HOLIDAYS.has(mmdd) || SPECIAL_HOLIDAY_DATES.has(yyyymmdd);
}

export function formatCurrency(amount: number, currency = 'VND'): string {
  if (currency.toUpperCase() === 'VND') {
    return formatVND(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

export function generateBookingCode(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GSH-${yy}${mm}${dd}-${rand}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyy}${mm}${dd}-${rand}`;
}

export function successResponse<T>(
  res: Response,
  data: T,
  message = 'Thành công',
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors !== undefined ? { errors } : {}),
  });
}

export function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}
