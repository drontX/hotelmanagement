import { z } from 'zod';

// ============================================================
// CANONICAL ENUMS (Single Source of Truth across Backend/FE/Admin)
// ============================================================

export const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const RoomStatus = {
  EMPTY: 'EMPTY',
  OCCUPIED: 'OCCUPIED',
  CLEANING: 'CLEANING',
  MAINTENANCE: 'MAINTENANCE',
} as const;
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

export const BookingType = {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
} as const;
export type BookingType = (typeof BookingType)[keyof typeof BookingType];

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELED: 'CANCELED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BookingSource = {
  WEBSITE: 'WEBSITE',
  AGODA: 'AGODA',
  BOOKING_COM: 'BOOKING_COM',
  TRAVELOKA: 'TRAVELOKA',
  WALK_IN: 'WALK_IN',
} as const;
export type BookingSource = (typeof BookingSource)[keyof typeof BookingSource];

export const PaymentProvider = {
  VNPAY: 'VNPAY',
  MOMO: 'MOMO',
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
  CASH: 'CASH',
} as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const PaymentStatus = {
  INITIATED: 'INITIATED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentType = {
  FULL: 'FULL',
  DEPOSIT: 'DEPOSIT',
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

export const StaffRole = {
  OWNER: 'OWNER',
  FRONTDESK: 'FRONTDESK',
  ACCOUNTANT: 'ACCOUNTANT',
  HOUSEKEEPING: 'HOUSEKEEPING',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const CleaningStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;
export type CleaningStatus = (typeof CleaningStatus)[keyof typeof CleaningStatus];

export const ChannelName = {
  AGODA: 'AGODA',
  BOOKING_COM: 'BOOKING_COM',
  TRAVELOKA: 'TRAVELOKA',
} as const;
export type ChannelName = (typeof ChannelName)[keyof typeof ChannelName];

export const SyncStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

// ============================================================
// ZOD VALIDATION SCHEMAS
// ============================================================

export const RegisterSchema = z
  .object({
    name: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
    phone: z.string().min(9, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Vui lòng cung cấp Email hoặc Số điện thoại',
  });

export const LoginSchema = z.object({
  identifier: z.string().trim().min(1, 'Vui lòng nhập Email hoặc Số điện thoại'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const SendOtpSchema = z.object({
  phone: z.string().trim().min(9, 'Số điện thoại không hợp lệ'),
});

export const VerifyOtpSchema = z.object({
  phone: z.string().trim().min(9, 'Số điện thoại không hợp lệ'),
  code: z.string().trim().length(6, 'Mã OTP phải gồm đúng 6 chữ số'),
  name: z.string().trim().optional(),
});

export const ExtraChargeItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  category: z.enum(['STANDARD', 'ALCOHOL', 'TOBACCO', 'OTHER']).default('STANDARD'),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  specialTaxRate: z.number().min(0).max(1).optional(),
});
export type ExtraChargeItemInput = z.infer<typeof ExtraChargeItemSchema>;

export const CreateBookingSchema = z.object({
  hotelId: z.string().uuid('hotelId không hợp lệ').optional(),
  roomId: z.string().uuid('roomId không hợp lệ'),
  checkIn: z.string().min(1, 'Ngày nhận phòng bắt buộc'),
  checkOut: z.string().min(1, 'Ngày trả phòng bắt buộc'),
  guests: z.number().int().min(1).max(12),
  childrenCount: z.number().int().min(0).max(10).default(0),
  bookingType: z.enum(['HOURLY', 'DAILY']).default('DAILY'),
  hours: z.number().int().min(1).max(24).optional(),
  paymentType: z.enum(['FULL', 'DEPOSIT']).default('FULL'),
  depositAmount: z.number().min(0).optional(),
  source: z.enum(['WEBSITE', 'AGODA', 'BOOKING_COM', 'TRAVELOKA', 'WALK_IN']).default('WEBSITE'),
  guestName: z.string().trim().optional(),
  guestPhone: z.string().trim().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
  guestIdCard: z.string().trim().optional(),
  notes: z.string().optional(),
  redeemPoints: z.number().int().min(0).default(0),
});
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const CalculatePriceSchema = z.object({
  roomId: z.string().uuid().optional(),
  roomTypeId: z.string().uuid().optional(),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  bookingType: z.enum(['HOURLY', 'DAILY']).default('DAILY'),
  hours: z.number().int().min(1).max(24).optional(),
  childrenCount: z.number().int().min(0).default(0),
  extraServices: z.array(ExtraChargeItemSchema).default([]),
  redeemPoints: z.number().int().min(0).default(0),
});

export const InitPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  provider: z.enum(['VNPAY', 'MOMO', 'STRIPE', 'PAYPAL', 'CASH']),
  amount: z.number().min(1000),
  paymentType: z.enum(['FULL', 'DEPOSIT']),
  currency: z.string().default('VND'),
  returnUrl: z.string().optional(),
});

export const UpdateRoomStatusSchema = z.object({
  status: z.enum(['EMPTY', 'OCCUPIED', 'CLEANING', 'MAINTENANCE']),
});

// ============================================================
// SHARED CONSTANTS & HELPERS
// ============================================================

export const DEFAULT_VAT_RATE = 0.08; // 8% VAT áp dụng đến hết năm 2026
export const DEFAULT_DEPOSIT_RATE = 0.3; // 30% đặt cọc

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: 'Chủ khách sạn',
  FRONTDESK: 'Lễ tân',
  ACCOUNTANT: 'Kế toán',
  HOUSEKEEPING: 'Buồng phòng',
};

export const STAFF_DEFAULT_ROUTES: Record<StaffRole, string[]> = {
  OWNER: ['/', '/room-map', '/bookings', '/housekeeping', '/staff', '/channels', '/reports', '/invoices', '/settings'],
  FRONTDESK: ['/', '/room-map', '/bookings', '/housekeeping', '/channels', '/invoices'],
  ACCOUNTANT: ['/', '/bookings', '/reports', '/invoices'],
  HOUSEKEEPING: ['/room-map', '/housekeeping'],
};

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xác nhận', color: 'orange' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'blue' },
  CHECKED_IN: { label: 'Đang ở', color: 'green' },
  CHECKED_OUT: { label: 'Đã trả phòng', color: 'default' },
  CANCELED: { label: 'Đã hủy', color: 'red' },
};

export const ROOM_STATUS_META: Record<RoomStatus, { label: string; color: string }> = {
  EMPTY: { label: 'Đang trống', color: '#52c41a' },
  OCCUPIED: { label: 'Đang có khách', color: '#f5222d' },
  CLEANING: { label: 'Đang dọn dẹp', color: '#faad14' },
  MAINTENANCE: { label: 'Đang bảo trì', color: '#1890ff' },
};

export function formatVND(amount: number = 0): string {
  if (Number.isNaN(amount)) return '0 VNĐ';
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} VNĐ`;
}
