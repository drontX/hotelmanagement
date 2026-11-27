import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { addDays, differenceInCalendarDays, differenceInHours, format, isValid, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatVND } from '@hotel/shared';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export { formatVND };

export function formatShortVND(amount: number = 0): string {
  if (Number.isNaN(amount)) return '0 đ';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = Number.isInteger(millions) ? millions.toString() : millions.toFixed(1).replace(/\.0$/, '');
    return `${formatted} triệu đ`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} đ`;
}

export function formatDateVi(dateStr?: string | Date | null, pattern = 'dd/MM/yyyy'): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (!isValid(date)) {
    const fallback = new Date(dateStr);
    return isValid(fallback) ? format(fallback, pattern, { locale: vi }) : String(dateStr);
  }
  return format(date, pattern, { locale: vi });
}

export function formatDateTimeVi(dateStr?: string | Date | null): string {
  return formatDateVi(dateStr, 'HH:mm - dd/MM/yyyy');
}

export function calculateNights(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (!isValid(start) || !isValid(end)) return 1;
  const diff = differenceInCalendarDays(end, start);
  return diff > 0 ? diff : 1;
}

export function calculateHours(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 2;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (!isValid(start) || !isValid(end)) return 2;
  const diff = differenceInHours(end, start);
  return diff >= 2 ? diff : 2;
}

export function getDefaultDateRange(): { checkIn: string; checkOut: string } {
  const tomorrow = addDays(new Date(), 1);
  const dayAfter = addDays(new Date(), 2);
  return {
    checkIn: format(tomorrow, 'yyyy-MM-dd'),
    checkOut: format(dayAfter, 'yyyy-MM-dd'),
  };
}

export function getVipTierInfo(points: number = 0): {
  name: string;
  badgeClass: string;
  nextTier?: string;
  pointsToNext?: number;
} {
  if (points >= 10000) {
    return {
      name: 'Hạng Kim Cương',
      badgeClass: 'bg-navy-800 text-gold-300 border-gold-400/50',
    };
  }
  if (points >= 5000) {
    return {
      name: 'Hạng Bạch Kim',
      badgeClass: 'bg-slate-800 text-slate-100 border-slate-400/40',
      nextTier: 'Kim Cương',
      pointsToNext: 10000 - points,
    };
  }
  if (points >= 1500) {
    return {
      name: 'Hạng Vàng',
      badgeClass: 'bg-gold-50 text-gold-700 border-gold-300',
      nextTier: 'Bạch Kim',
      pointsToNext: 5000 - points,
    };
  }
  return {
    name: 'Thành viên Bạc',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
    nextTier: 'Vàng',
    pointsToNext: 1500 - points,
  };
}

export function getPaymentProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    VNPAY: 'VNPay QR / Thẻ nội địa',
    MOMO: 'Ví điện tử MoMo',
    STRIPE: 'Thẻ quốc tế (Visa / Mastercard)',
    PAYPAL: 'Cổng thanh toán PayPal',
    CASH: 'Thanh toán tại quầy lễ tân',
  };
  return map[provider] || provider;
}
