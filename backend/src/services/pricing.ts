import {
  BookingType,
  DEFAULT_DEPOSIT_RATE,
  DEFAULT_VAT_RATE,
  ExtraChargeItemInput,
  PaymentType,
} from '@hotel/shared';
import { isHoliday, isWeekend, toNumber } from '../utils/helpers';

export const SPECIAL_TAX_RATES: Record<string, number> = {
  ALCOHOL: 0.65,
  TOBACCO: 0.75,
  STANDARD: 0,
  OTHER: 0,
};

export interface SpecialTaxItemDetail {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  baseAmount: number;
  specialTaxRate: number;
  specialTaxAmount: number;
}

export interface SpecialTaxSeparationResult {
  specialTaxAmount: number;
  specialTaxItems: SpecialTaxItemDetail[];
  standardItemsTotal: number;
  specialTaxBaseTotal: number;
  extraChargesTotal: number;
}

export interface DailyNightBreakdown {
  date: string;
  dayType: 'NORMAL' | 'WEEKEND' | 'HOLIDAY';
  rate: number;
}

export interface DailyRateResult {
  total: number;
  nights: number;
  breakdown: DailyNightBreakdown[];
}

export interface RoomRatesInput {
  baseRateHourly: number | unknown;
  baseRateDaily: number | unknown;
  weekendRate: number | unknown;
  holidayRate: number | unknown;
}

export interface CalculateTotalParams {
  roomType: RoomRatesInput;
  checkIn: Date;
  checkOut: Date;
  bookingType: BookingType | string;
  hours?: number;
  childrenCount?: number;
  extraServices?: ExtraChargeItemInput[];
  redeemPoints?: number;
  paymentType?: PaymentType | string;
  depositRate?: number;
  vatRate?: number;
}

export interface PriceCalculationResult {
  bookingType: string;
  nights: number;
  hours: number;
  roomRate: number;
  extraChargesTotal: number;
  childrenSurcharge: number;
  specialTaxBaseTotal: number;
  specialTaxAmount: number;
  specialTaxItems: SpecialTaxItemDetail[];
  discountAmount: number;
  redeemedPoints: number;
  subtotalBeforeVat: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  depositRate: number;
  depositAmount: number;
  dailyBreakdown: DailyNightBreakdown[];
}

export function calculateHourlyRate(
  baseRateHourly: number,
  hours: number,
  baseRateDaily?: number
): number {
  const safeHours = Math.max(1, Math.ceil(hours));
  const base = Math.max(0, baseRateHourly);

  let total: number;
  if (safeHours <= 2) {
    total = base;
  } else {
    total = base + (safeHours - 2) * (base * 0.3);
  }

  if (baseRateDaily !== undefined && baseRateDaily > 0) {
    total = Math.min(total, baseRateDaily);
  }

  return Math.round(total);
}

export function calculateDailyRate(
  rates: { baseRateDaily: number; weekendRate?: number; holidayRate?: number },
  checkIn: Date,
  checkOut: Date
): DailyRateResult {
  const baseDaily = Math.max(0, rates.baseRateDaily);
  const weekend = rates.weekendRate !== undefined && rates.weekendRate > 0 ? rates.weekendRate : baseDaily;
  const holiday = rates.holidayRate !== undefined && rates.holidayRate > 0 ? rates.holidayRate : baseDaily;

  const startDay = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  const endDay = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
  const diffDays = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
  const nights = Math.max(1, diffDays);

  const breakdown: DailyNightBreakdown[] = [];
  let total = 0;

  for (let i = 0; i < nights; i++) {
    const current = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');

    let dayType: 'NORMAL' | 'WEEKEND' | 'HOLIDAY' = 'NORMAL';
    let rate = baseDaily;

    if (isHoliday(current)) {
      dayType = 'HOLIDAY';
      rate = holiday;
    } else if (isWeekend(current)) {
      dayType = 'WEEKEND';
      rate = weekend;
    }

    total += rate;
    breakdown.push({
      date: `${yyyy}-${mm}-${dd}`,
      dayType,
      rate: Math.round(rate),
    });
  }

  return {
    total: Math.round(total),
    nights,
    breakdown,
  };
}

export function calculateExtraCharges(
  items: ExtraChargeItemInput[] = [],
  childrenCount = 0,
  childSurchargePerChild = 0
): { itemsTotal: number; childrenSurcharge: number; total: number } {
  const itemsTotal = items.reduce((sum, item) => {
    return sum + Math.max(0, item.quantity) * Math.max(0, item.unitPrice);
  }, 0);

  const childrenSurcharge = Math.max(0, childrenCount) * Math.max(0, childSurchargePerChild);

  return {
    itemsTotal: Math.round(itemsTotal),
    childrenSurcharge: Math.round(childrenSurcharge),
    total: Math.round(itemsTotal + childrenSurcharge),
  };
}

export function calculateVAT(netRevenue: number, vatRate = DEFAULT_VAT_RATE): number {
  return Math.round(Math.max(0, netRevenue) * vatRate);
}

export function separateSpecialTax(
  items: ExtraChargeItemInput[] = []
): SpecialTaxSeparationResult {
  const specialTaxItems: SpecialTaxItemDetail[] = [];
  let specialTaxAmount = 0;
  let standardItemsTotal = 0;
  let specialTaxBaseTotal = 0;

  for (const item of items) {
    const baseAmount = Math.round(Math.max(0, item.quantity) * Math.max(0, item.unitPrice));
    const category = item.category || 'STANDARD';
    const defaultRate = SPECIAL_TAX_RATES[category] ?? 0;
    const rate = item.specialTaxRate !== undefined ? item.specialTaxRate : defaultRate;

    if (rate > 0) {
      const itemSpecialTax = Math.round(baseAmount * rate);
      specialTaxAmount += itemSpecialTax;
      specialTaxBaseTotal += baseAmount;
      specialTaxItems.push({
        name: item.name,
        category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        baseAmount,
        specialTaxRate: rate,
        specialTaxAmount: itemSpecialTax,
      });
    } else {
      standardItemsTotal += baseAmount;
    }
  }

  return {
    specialTaxAmount: Math.round(specialTaxAmount),
    specialTaxItems,
    standardItemsTotal: Math.round(standardItemsTotal),
    specialTaxBaseTotal: Math.round(specialTaxBaseTotal),
    extraChargesTotal: Math.round(standardItemsTotal + specialTaxBaseTotal),
  };
}

export function calculateTotal(params: CalculateTotalParams): PriceCalculationResult {
  const baseRateHourly = toNumber(params.roomType.baseRateHourly);
  const baseRateDaily = toNumber(params.roomType.baseRateDaily);
  const weekendRate = toNumber(params.roomType.weekendRate, baseRateDaily);
  const holidayRate = toNumber(params.roomType.holidayRate, baseRateDaily);

  let roomRate = 0;
  let nights = 0;
  let hours = 0;
  let dailyBreakdown: DailyNightBreakdown[] = [];

  if (params.bookingType === BookingType.HOURLY) {
    const diffMs = Math.max(0, params.checkOut.getTime() - params.checkIn.getTime());
    const computedHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    hours = params.hours ?? computedHours;
    roomRate = calculateHourlyRate(baseRateHourly, hours, baseRateDaily);
  } else {
    const dailyResult = calculateDailyRate(
      { baseRateDaily, weekendRate, holidayRate },
      params.checkIn,
      params.checkOut
    );
    roomRate = dailyResult.total;
    nights = dailyResult.nights;
    dailyBreakdown = dailyResult.breakdown;
  }

  const extraServices = params.extraServices ?? [];
  const extraCharges = calculateExtraCharges(extraServices, params.childrenCount ?? 0);
  const specialTax = separateSpecialTax(extraServices);

  const grossBeforeDiscount =
    roomRate + extraCharges.total + specialTax.specialTaxAmount;

  const requestedPoints = Math.max(0, Math.floor(params.redeemPoints ?? 0));
  const rawDiscount = requestedPoints * 1000;
  const discountAmount = Math.min(rawDiscount, grossBeforeDiscount);
  const effectiveRedeemedPoints = Math.floor(discountAmount / 1000);

  const subtotalBeforeVat = Math.max(0, grossBeforeDiscount - discountAmount);
  const vatRate = params.vatRate ?? DEFAULT_VAT_RATE;
  const vatAmount = calculateVAT(subtotalBeforeVat, vatRate);
  const totalAmount = Math.round(subtotalBeforeVat + vatAmount);

  const depositRate = params.depositRate ?? DEFAULT_DEPOSIT_RATE;
  const depositAmount =
    params.paymentType === PaymentType.DEPOSIT
      ? Math.round(totalAmount * depositRate)
      : totalAmount;

  return {
    bookingType: params.bookingType,
    nights,
    hours,
    roomRate,
    extraChargesTotal: extraCharges.itemsTotal,
    childrenSurcharge: extraCharges.childrenSurcharge,
    specialTaxBaseTotal: specialTax.specialTaxBaseTotal,
    specialTaxAmount: specialTax.specialTaxAmount,
    specialTaxItems: specialTax.specialTaxItems,
    discountAmount,
    redeemedPoints: effectiveRedeemedPoints,
    subtotalBeforeVat,
    vatRate,
    vatAmount,
    totalAmount,
    depositRate,
    depositAmount,
    dailyBreakdown,
  };
}
