'use client';

import React from 'react';
import {
  BOOKING_STATUS_META,
  BookingStatus,
  PaymentStatus,
  ROOM_STATUS_META,
  RoomStatus,
} from '@hotel/shared';
import { cn } from '@/lib/utils';

type StatusBadgeProps =
  | { kind: 'room'; status: RoomStatus; className?: string }
  | { kind: 'booking'; status: BookingStatus; className?: string }
  | { kind: 'payment'; status: PaymentStatus; className?: string };

const ROOM_BADGE_STYLES: Record<RoomStatus, string> = {
  EMPTY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OCCUPIED: 'bg-rose-50 text-rose-700 border-rose-200',
  CLEANING: 'bg-amber-50 text-amber-700 border-amber-200',
  MAINTENANCE: 'bg-sky-50 text-sky-700 border-sky-200',
};

const ROOM_DOT_STYLES: Record<RoomStatus, string> = {
  EMPTY: 'bg-emerald-500',
  OCCUPIED: 'bg-rose-500',
  CLEANING: 'bg-amber-500',
  MAINTENANCE: 'bg-sky-500',
};

const BOOKING_BADGE_STYLES: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
  CHECKED_IN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CHECKED_OUT: 'bg-slate-100 text-slate-700 border-slate-200',
  CANCELED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PAYMENT_META: Record<PaymentStatus, { label: string; style: string }> = {
  INITIATED: {
    label: 'Chờ thanh toán',
    style: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  COMPLETED: {
    label: 'Đã thanh toán',
    style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  FAILED: {
    label: 'Thanh toán thất bại',
    style: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  REFUNDED: {
    label: 'Đã hoàn tiền',
    style: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export function StatusBadge(props: StatusBadgeProps) {
  if (props.kind === 'room') {
    const meta = ROOM_STATUS_META[props.status] ?? { label: props.status };
    const style = ROOM_BADGE_STYLES[props.status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
    const dot = ROOM_DOT_STYLES[props.status] ?? 'bg-slate-500';
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide',
          style,
          props.className
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
        {meta.label}
      </span>
    );
  }

  if (props.kind === 'booking') {
    const meta = BOOKING_STATUS_META[props.status] ?? { label: props.status };
    const style =
      BOOKING_BADGE_STYLES[props.status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide',
          style,
          props.className
        )}
      >
        {meta.label}
      </span>
    );
  }

  const payMeta = PAYMENT_META[props.status] ?? {
    label: props.status,
    style: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide',
        payMeta.style,
        props.className
      )}
    >
      {payMeta.label}
    </span>
  );
}
