export {
  Role,
  RoomStatus,
  BookingType,
  BookingStatus,
  BookingSource,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  StaffRole,
  CleaningStatus,
  ChannelName,
  SyncStatus,
  DEFAULT_VAT_RATE,
  DEFAULT_DEPOSIT_RATE,
  STAFF_ROLE_LABELS,
  STAFF_DEFAULT_ROUTES,
  BOOKING_STATUS_META,
  ROOM_STATUS_META,
  formatVND,
} from '@hotel/shared';

export type {
  ExtraChargeItemInput,
  CreateBookingInput,
} from '@hotel/shared';

import type {
  BookingSource,
  BookingStatus,
  BookingType,
  ChannelName,
  CleaningStatus,
  ExtraChargeItemInput,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  Role,
  RoomStatus,
  StaffRole,
  SyncStatus,
} from '@hotel/shared';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  staffRole: StaffRole;
  hotelId?: string;
  avatar?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  user: UserProfile;
}

export interface RoomType {
  id: string;
  name: string;
  code?: string;
  description?: string;
  baseRateDaily: number;
  baseRateHourly: number;
  weekendRate?: number;
  holidayRate?: number;
  maxGuests: number;
  bedType?: string;
  area?: number;
  amenities?: string[];
  images?: string[];
}

export interface Room {
  id: string;
  hotelId?: string;
  roomNumber: string;
  floor: number;
  status: RoomStatus;
  roomTypeId: string;
  roomType?: RoomType;
  notes?: string;
  currentBooking?: Booking | null;
  updatedAt?: string;
}

export type ExtraChargeCategory = 'STANDARD' | 'ALCOHOL' | 'TOBACCO' | 'OTHER';

export interface ExtraChargeItem extends ExtraChargeItemInput {
  id?: string;
  name: string;
  category: ExtraChargeCategory;
  quantity: number;
  unitPrice: number;
  specialTaxRate?: number;
}

export interface Booking {
  id: string;
  bookingCode?: string;
  hotelId?: string;
  roomId: string;
  room?: Room;
  userId?: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestIdCard?: string;
  checkIn: string;
  checkOut: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  guests: number;
  childrenCount: number;
  bookingType: BookingType;
  hours?: number;
  status: BookingStatus;
  source: BookingSource;
  paymentType: PaymentType;
  paymentStatus?: PaymentStatus;
  roomCharge: number;
  surchargeAmount?: number;
  extraChargesTotal?: number;
  discountAmount?: number;
  specialTaxAmount?: number;
  vatAmount: number;
  totalAmount: number;
  depositAmount?: number;
  paidAmount?: number;
  extraServices?: ExtraChargeItem[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PriceBreakdown {
  baseAmount: number;
  surchargeAmount: number;
  earlyCheckInFee: number;
  lateCheckOutFee: number;
  extraServicesTotal: number;
  specialTaxAmount: number;
  discountAmount: number;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  depositAmount: number;
  durationLabel: string;
  details: { label: string; amount: number }[];
}

export interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  staffRole: StaffRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface MinibarReportItem {
  name: string;
  category: ExtraChargeCategory;
  quantity: number;
  unitPrice: number;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  room?: Room;
  assignedToId?: string;
  assignedTo?: StaffMember;
  status: CleaningStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  notes?: string;
  minibarItems?: MinibarReportItem[];
  damageReport?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChannelConnection {
  id: string;
  channel: ChannelName;
  displayName: string;
  isConnected: boolean;
  autoSync: boolean;
  apiKeyMasked?: string;
  lastSyncAt?: string;
  lastSyncStatus?: SyncStatus;
  roomsSynced: number;
  bookingsCount: number;
  errorMessage?: string;
}

export interface ChannelSyncLog {
  id: string;
  channel: ChannelName;
  status: SyncStatus;
  message: string;
  syncedRooms?: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  booking?: Booking;
  customerName: string;
  companyName?: string;
  taxCode?: string;
  companyAddress?: string;
  customerEmail?: string;
  roomAmount: number;
  extraAmount: number;
  specialTaxAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'CANCELED';
  eInvoiceStatus: 'PENDING' | 'EXPORTED' | 'FAILED';
  eInvoiceCode?: string;
  eInvoiceLookupUrl?: string;
  paymentMethod?: PaymentProvider;
  issuedAt?: string;
  createdAt: string;
}

export interface RevenueReportPoint {
  date: string;
  revenue: number;
  directRevenue: number;
  otaRevenue: number;
  bookings: number;
}

export interface OccupancyReportPoint {
  date: string;
  occupancyRate: number;
  adr: number;
  revpar: number;
  occupiedRooms: number;
  totalRooms: number;
}

export interface TaxSummaryRow {
  period: string;
  roomRevenue: number;
  standardServiceRevenue: number;
  alcoholRevenue: number;
  tobaccoRevenue: number;
  vatAmount: number;
  specialConsumptionTax: number;
  totalTax: number;
}

export interface DashboardSummary {
  todayRevenue: number;
  revenueGrowth: number;
  occupancyRate: number;
  occupancyGrowth: number;
  activeGuests: number;
  checkInsToday: number;
  checkOutsToday: number;
  pendingCleaningCount: number;
}

export interface HotelSettings {
  hotelName: string;
  address: string;
  phone: string;
  email: string;
  taxCode: string;
  checkInTime: string;
  checkOutTime: string;
  vatRate: number;
  depositRate: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  earlyCheckInBefore6Fee: number;
  earlyCheckIn6To9Fee: number;
  earlyCheckIn9To14Fee: number;
  lateCheckOut12To15Fee: number;
  lateCheckOut15To18Fee: number;
  lateCheckOutAfter18Fee: number;
  eInvoiceProvider: string;
  eInvoiceApiUrl: string;
  eInvoiceEnabled: boolean;
  autoAssignHousekeeping: boolean;
  socketNotifications: boolean;
  channelSyncIntervalMinutes: number;
}

export interface RealtimeNotification {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
}

export const BOOKING_SOURCE_META: Record<BookingSource, { label: string; color: string }> = {
  WEBSITE: { label: 'Website trực tiếp', color: 'geekblue' },
  AGODA: { label: 'Agoda', color: 'purple' },
  BOOKING_COM: { label: 'Booking.com', color: 'blue' },
  TRAVELOKA: { label: 'Traveloka', color: 'cyan' },
  WALK_IN: { label: 'Khách vãng lai', color: 'gold' },
};

export const CLEANING_STATUS_META: Record<CleaningStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ dọn dẹp', color: 'orange' },
  IN_PROGRESS: { label: 'Đang dọn dẹp', color: 'processing' },
  DONE: { label: 'Hoàn tất', color: 'success' },
};

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  VNPAY: 'VNPay QR',
  MOMO: 'Ví MoMo',
  STRIPE: 'Thẻ quốc tế (Stripe)',
  PAYPAL: 'PayPal',
  CASH: 'Tiền mặt / POS',
};
