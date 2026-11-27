import {
  Role,
  RoomStatus,
  BookingType,
  BookingStatus,
  BookingSource,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  ExtraChargeItemInput,
  CreateBookingInput,
  DEFAULT_VAT_RATE,
  DEFAULT_DEPOSIT_RATE,
  BOOKING_STATUS_META,
  ROOM_STATUS_META,
  formatVND,
} from '@hotel/shared';

export {
  Role,
  RoomStatus,
  BookingType,
  BookingStatus,
  BookingSource,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  DEFAULT_VAT_RATE,
  DEFAULT_DEPOSIT_RATE,
  BOOKING_STATUS_META,
  ROOM_STATUS_META,
  formatVND,
};

export type { ExtraChargeItemInput, CreateBookingInput };

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  role: Role | string;
  loyaltyPoints: number;
  vipTier?: 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | string;
  idCard?: string | null;
  address?: string | null;
  createdAt?: string;
}

export interface PanoramaScene {
  id: string;
  label: string;
  imageUrl: string;
  description?: string;
}

export interface RoomType {
  id: string;
  name: string;
  slug?: string;
  description: string;
  baseRateDaily: number;
  baseRateHourly: number;
  weekendRateMultiplier?: number;
  holidayRateMultiplier?: number;
  maxAdults: number;
  maxChildren: number;
  areaSqm: number;
  bedType: string;
  viewType?: string;
  amenities: string[];
  images: string[];
  panorama360?: PanoramaScene[];
  videoTourUrl?: string | null;
}

export interface Room {
  id: string;
  hotelId?: string;
  roomNumber: string;
  floor: number;
  status: RoomStatus;
  roomTypeId: string;
  roomType: RoomType;
  viewDescription?: string;
  isFeatured?: boolean;
  rating?: number;
  reviewCount?: number;
  updatedAt?: string;
}

export interface RoomFilters {
  search?: string;
  roomTypeId?: string;
  category?: string;
  status?: RoomStatus | 'ALL';
  bookingType?: BookingType;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  childrenCount?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'featured';
}

export interface ExtraServiceOption {
  id: string;
  name: string;
  description: string;
  category: 'STANDARD' | 'ALCOHOL' | 'TOBACCO' | 'OTHER';
  unitPrice: number;
  unitLabel: string;
  specialTaxRate?: number;
}

export interface PriceLineItem {
  label: string;
  amount: number;
  detail?: string;
}

export interface PriceBreakdownData {
  bookingType: BookingType;
  nightsOrHours: number;
  roomSubtotal: number;
  weekendSurcharge: number;
  earlyLateSurcharge: number;
  extraServicesSubtotal: number;
  specialConsumptionTax: number; // Thuế TTĐB (65% rượu bia, 75% thuốc lá)
  loyaltyDiscount: number;
  pointsRedeemed: number;
  taxableAmount: number;
  vatRate: number; // 8% đến hết 2026
  vatAmount: number;
  totalAmount: number;
  depositRate: number; // 30%
  depositAmount: number;
  remainingAtCheckIn: number;
  lineItems?: PriceLineItem[];
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  provider: PaymentProvider;
  paymentType: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionRef?: string | null;
  paymentUrl?: string | null;
  paidAt?: string | null;
  createdAt?: string;
}

export interface Booking {
  id: string;
  bookingCode: string;
  userId?: string | null;
  roomId: string;
  room?: Room;
  checkIn: string;
  checkOut: string;
  guests: number;
  childrenCount: number;
  bookingType: BookingType;
  hours?: number | null;
  paymentType: PaymentType;
  source: BookingSource;
  status: BookingStatus;
  roomPrice: number;
  extraChargesTotal: number;
  specialTaxAmount: number;
  vatAmount: number;
  discountAmount: number;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  guestIdCard?: string | null;
  notes?: string | null;
  payments?: PaymentRecord[];
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentIntentResponse {
  paymentId: string;
  bookingId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentUrl?: string;
  qrCodeUrl?: string;
  isSandbox?: boolean;
  message?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface RoomStatusUpdateEvent {
  roomId: string;
  roomNumber?: string;
  status: RoomStatus;
  updatedAt?: string;
}
