import {
  BookingType,
  BookingStatus,
  BookingSource,
  DEFAULT_DEPOSIT_RATE,
  DEFAULT_VAT_RATE,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from '@hotel/shared';
import { api, unwrapApi } from '@/lib/api';
import { EXTRA_SERVICE_OPTIONS, MOCK_ROOMS } from '@/data/mockRooms';
import { calculateNights } from '@/lib/utils';
import type {
  Booking,
  CreateBookingInput,
  ExtraChargeItemInput,
  PaymentIntentResponse,
  PaymentRecord,
  PriceBreakdownData,
  Room,
  RoomFilters,
} from '@/types';

export interface CalculatePriceParams {
  roomId?: string;
  roomTypeId?: string;
  checkIn: string;
  checkOut: string;
  bookingType: BookingType;
  hours?: number;
  childrenCount?: number;
  extraServices?: ExtraChargeItemInput[];
  redeemPoints?: number;
  room?: Room;
}

function filterMockRooms(rooms: Room[], filters?: RoomFilters): Room[] {
  let result = [...rooms];
  if (!filters) return result;

  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(
      (r) =>
        r.roomNumber.toLowerCase().includes(q) ||
        r.roomType.name.toLowerCase().includes(q) ||
        r.roomType.description.toLowerCase().includes(q) ||
        (r.viewDescription && r.viewDescription.toLowerCase().includes(q))
    );
  }

  if (filters.status && filters.status !== 'ALL') {
    result = result.filter((r) => r.status === filters.status);
  }

  if (filters.roomTypeId) {
    result = result.filter((r) => r.roomTypeId === filters.roomTypeId);
  }

  if (filters.category && filters.category !== 'ALL') {
    const cat = filters.category.toLowerCase();
    result = result.filter((r) => r.roomType.name.toLowerCase().includes(cat));
  }

  if (filters.guests) {
    result = result.filter((r) => r.roomType.maxAdults >= filters.guests!);
  }

  if (filters.childrenCount) {
    result = result.filter((r) => r.roomType.maxChildren >= filters.childrenCount!);
  }

  if (filters.minPrice !== undefined) {
    result = result.filter((r) => r.roomType.baseRateDaily >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    result = result.filter((r) => r.roomType.baseRateDaily <= filters.maxPrice!);
  }

  if (filters.sortBy === 'price_asc') {
    result.sort((a, b) => a.roomType.baseRateDaily - b.roomType.baseRateDaily);
  } else if (filters.sortBy === 'price_desc') {
    result.sort((a, b) => b.roomType.baseRateDaily - a.roomType.baseRateDaily);
  } else if (filters.sortBy === 'rating_desc') {
    result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (filters.sortBy === 'featured') {
    result.sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)));
  }

  return result;
}

export async function fetchRooms(filters?: RoomFilters): Promise<Room[]> {
  try {
    const params: Record<string, string | number> = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.status && filters.status !== 'ALL') params.status = filters.status;
    if (filters?.roomTypeId) params.roomTypeId = filters.roomTypeId;
    if (filters?.guests) params.guests = filters.guests;
    if (filters?.checkIn) params.checkIn = filters.checkIn;
    if (filters?.checkOut) params.checkOut = filters.checkOut;

    const res = await api.get('/rooms', { params });
    const data = unwrapApi<Room[]>(res);
    if (Array.isArray(data) && data.length > 0) {
      return filterMockRooms(data, filters);
    }
    return filterMockRooms(MOCK_ROOMS, filters);
  } catch {
    return filterMockRooms(MOCK_ROOMS, filters);
  }
}

export async function fetchRoomById(id: string): Promise<Room | null> {
  try {
    const res = await api.get(`/rooms/${id}`);
    const room = unwrapApi<Room>(res);
    if (room && room.id) return room;
  } catch {
    // Fallback to mock rooms for offline/demo preview
  }
  return MOCK_ROOMS.find((r) => r.id === id) || MOCK_ROOMS[0] || null;
}

export async function checkAvailability(params: {
  checkIn: string;
  checkOut: string;
  guests?: number;
  bookingType?: BookingType;
}): Promise<Room[]> {
  try {
    const res = await api.get('/bookings/availability', { params });
    const data = unwrapApi<Room[]>(res);
    if (Array.isArray(data)) return data;
  } catch {
    // Fallback
  }
  return MOCK_ROOMS.filter((r) => r.status === 'EMPTY');
}

export function computeLocalPriceBreakdown(params: CalculatePriceParams): PriceBreakdownData {
  const targetRoom =
    params.room || MOCK_ROOMS.find((r) => r.id === params.roomId) || MOCK_ROOMS[0];
  const dailyRate = targetRoom?.roomType.baseRateDaily ?? 3200000;
  const hourlyRate = targetRoom?.roomType.baseRateHourly ?? 950000;

  let roomSubtotal = 0;
  let weekendSurcharge = 0;
  let nightsOrHours = 1;

  if (params.bookingType === BookingType.HOURLY) {
    const hours = Math.max(2, Math.min(24, params.hours ?? 2));
    nightsOrHours = hours;
    const rawHourly = hourlyRate + Math.max(0, hours - 2) * (hourlyRate * 0.3);
    roomSubtotal = Math.round(Math.min(rawHourly, dailyRate));
  } else {
    const nights = calculateNights(params.checkIn, params.checkOut);
    nightsOrHours = nights;
    const startDate = new Date(params.checkIn);
    let totalDaily = 0;
    for (let i = 0; i < nights; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const day = d.getDay();
      if (day === 0 || day === 6) {
        const extra = Math.round(dailyRate * ((targetRoom?.roomType.weekendRateMultiplier ?? 1.2) - 1));
        weekendSurcharge += extra;
        totalDaily += dailyRate;
      } else {
        totalDaily += dailyRate;
      }
    }
    roomSubtotal = totalDaily;
  }

  let extraServicesSubtotal = 0;
  let specialConsumptionTax = 0;
  const services = params.extraServices ?? [];

  for (const srv of services) {
    const lineTotal = srv.unitPrice * srv.quantity;
    extraServicesSubtotal += lineTotal;
    const option = EXTRA_SERVICE_OPTIONS.find((o) => o.name === srv.name || o.id === srv.id);
    const taxRate =
      srv.specialTaxRate ??
      option?.specialTaxRate ??
      (srv.category === 'ALCOHOL' ? 0.65 : srv.category === 'TOBACCO' ? 0.75 : 0);
    if (taxRate > 0) {
      specialConsumptionTax += Math.round(lineTotal * taxRate);
    }
  }

  const pointsRedeemed = Math.max(0, params.redeemPoints ?? 0);
  const loyaltyDiscount = pointsRedeemed * 1000; // 1 điểm = 1.000 VNĐ

  const grossBeforeVat = Math.max(
    0,
    roomSubtotal + weekendSurcharge + extraServicesSubtotal + specialConsumptionTax - loyaltyDiscount
  );
  const vatAmount = Math.round(grossBeforeVat * DEFAULT_VAT_RATE);
  const totalAmount = grossBeforeVat + vatAmount;
  const depositAmount = Math.round(totalAmount * DEFAULT_DEPOSIT_RATE);

  return {
    bookingType: params.bookingType,
    nightsOrHours,
    roomSubtotal,
    weekendSurcharge,
    earlyLateSurcharge: 0,
    extraServicesSubtotal,
    specialConsumptionTax,
    loyaltyDiscount,
    pointsRedeemed,
    taxableAmount: grossBeforeVat,
    vatRate: DEFAULT_VAT_RATE,
    vatAmount,
    totalAmount,
    depositRate: DEFAULT_DEPOSIT_RATE,
    depositAmount,
    remainingAtCheckIn: Math.max(0, totalAmount - depositAmount),
  };
}

export async function calculatePrice(params: CalculatePriceParams): Promise<PriceBreakdownData> {
  try {
    const res = await api.post('/bookings/calculate-price', {
      roomId: params.roomId,
      roomTypeId: params.roomTypeId,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      bookingType: params.bookingType,
      hours: params.hours,
      childrenCount: params.childrenCount ?? 0,
      extraServices: params.extraServices ?? [],
      redeemPoints: params.redeemPoints ?? 0,
    });
    const data = unwrapApi<PriceBreakdownData>(res);
    if (data && typeof data.totalAmount === 'number') {
      return data;
    }
  } catch {
    // Fallback to deterministic local calculation when backend isn't running
  }
  return computeLocalPriceBreakdown(params);
}

export async function createBooking(
  payload: CreateBookingInput & { room?: Room; calculated?: PriceBreakdownData }
): Promise<Booking> {
  try {
    const { room: _room, calculated: _calc, ...apiPayload } = payload;
    const res = await api.post('/bookings', apiPayload);
    const created = unwrapApi<Booking>(res);
    if (created && created.id) {
      return created;
    }
  } catch (err) {
    // If network unreachable in standalone preview, create a local demo booking object
    const isNetworkErr =
      typeof err === 'object' &&
      err !== null &&
      !('response' in err && (err as { response?: unknown }).response);
    if (!isNetworkErr) {
      throw err;
    }
  }

  const calc =
    payload.calculated ||
    computeLocalPriceBreakdown({
      roomId: payload.roomId,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      bookingType: payload.bookingType as BookingType,
      hours: payload.hours,
      childrenCount: payload.childrenCount,
      redeemPoints: payload.redeemPoints,
      room: payload.room,
    });

  const demoBooking: Booking = {
    id: `demo-${Date.now()}`,
    bookingCode: `GSH-${Math.floor(100000 + Math.random() * 900000)}`,
    roomId: payload.roomId,
    room: payload.room || MOCK_ROOMS.find((r) => r.id === payload.roomId) || MOCK_ROOMS[0],
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    guests: payload.guests,
    childrenCount: payload.childrenCount ?? 0,
    bookingType: payload.bookingType as BookingType,
    hours: payload.hours ?? null,
    paymentType: payload.paymentType as PaymentType,
    source: (payload.source as BookingSource) || BookingSource.WEBSITE,
    status: BookingStatus.PENDING,
    roomPrice: calc.roomSubtotal + calc.weekendSurcharge,
    extraChargesTotal: calc.extraServicesSubtotal,
    specialTaxAmount: calc.specialConsumptionTax,
    vatAmount: calc.vatAmount,
    discountAmount: calc.loyaltyDiscount,
    totalAmount: calc.totalAmount,
    depositAmount: payload.paymentType === 'DEPOSIT' ? calc.depositAmount : calc.totalAmount,
    paidAmount: 0,
    guestName: payload.guestName || 'Quý khách',
    guestPhone: payload.guestPhone || '',
    guestEmail: payload.guestEmail || '',
    guestIdCard: payload.guestIdCard || '',
    notes: payload.notes || '',
    createdAt: new Date().toISOString(),
  };

  return demoBooking;
}

export async function fetchMyBookings(): Promise<Booking[]> {
  const res = await api.get('/bookings/my-bookings');
  return unwrapApi<Booking[]>(res);
}

export async function fetchBookingById(id: string): Promise<Booking> {
  const res = await api.get(`/bookings/${id}`);
  return unwrapApi<Booking>(res);
}

export async function cancelBooking(id: string, reason?: string): Promise<Booking> {
  const res = await api.post(`/bookings/${id}/cancel`, { reason });
  return unwrapApi<Booking>(res);
}

export async function createPaymentIntent(payload: {
  bookingId: string;
  provider: PaymentProvider;
  amount: number;
  paymentType: PaymentType;
  currency?: string;
  returnUrl?: string;
}): Promise<PaymentIntentResponse> {
  try {
    const res = await api.post('/payments/create-intent', {
      ...payload,
      currency: payload.currency || 'VND',
    });
    return unwrapApi<PaymentIntentResponse>(res);
  } catch (err) {
    const isNetworkErr =
      typeof err === 'object' &&
      err !== null &&
      !('response' in err && (err as { response?: unknown }).response);
    if (!isNetworkErr) {
      throw err;
    }

    const returnBase =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return {
      paymentId: `pay-demo-${Date.now()}`,
      bookingId: payload.bookingId,
      provider: payload.provider,
      amount: payload.amount,
      currency: payload.currency || 'VND',
      status: payload.provider === PaymentProvider.CASH ? PaymentStatus.COMPLETED : PaymentStatus.INITIATED,
      paymentUrl:
        payload.provider === PaymentProvider.CASH
          ? `${returnBase}/booking/success?bookingId=${payload.bookingId}&provider=CASH`
          : `${returnBase}/payment/callback?bookingId=${payload.bookingId}&provider=${payload.provider}&amount=${payload.amount}&sandbox=true`,
      isSandbox: true,
    };
  }
}

export async function verifyPaymentCallback(
  gateway: string,
  params: Record<string, string>
): Promise<{ success: boolean; status: PaymentStatus; bookingId?: string; message?: string }> {
  try {
    const res = await api.get(`/payments/callback/${gateway.toLowerCase()}`, { params });
    return unwrapApi(res);
  } catch {
    return {
      success: params.status !== 'failed' && params.status !== 'canceled',
      status:
        params.status === 'failed' || params.status === 'canceled'
          ? PaymentStatus.FAILED
          : PaymentStatus.COMPLETED,
      bookingId: params.bookingId,
      message: 'Xác thực thanh toán Sandbox hoàn tất.',
    };
  }
}

export async function fetchPaymentStatus(paymentId: string): Promise<PaymentRecord> {
  const res = await api.get(`/payments/${paymentId}/status`);
  return unwrapApi<PaymentRecord>(res);
}
