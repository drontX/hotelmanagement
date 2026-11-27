'use client';

import React from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuestCounterProps {
  adults: number;
  childrenCount: number;
  maxAdults?: number;
  maxChildren?: number;
  onChange: (adults: number, childrenCount: number) => void;
  compact?: boolean;
  dark?: boolean;
  className?: string;
}

export function GuestCounter({
  adults,
  childrenCount,
  maxAdults = 12,
  maxChildren = 10,
  onChange,
  compact = false,
  dark = false,
  className,
}: GuestCounterProps) {
  const updateAdults = (delta: number) => {
    const next = Math.max(1, Math.min(maxAdults, adults + delta));
    onChange(next, childrenCount);
  };

  const updateChildren = (delta: number) => {
    const next = Math.max(0, Math.min(maxChildren, childrenCount + delta));
    onChange(adults, next);
  };

  if (compact) {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            dark ? 'text-cream-200' : 'text-navy-700'
          )}
        >
          Số lượng khách
        </label>
        <div
          className={cn(
            'flex items-center justify-between rounded-xl border px-3 py-2',
            dark ? 'border-white/20 bg-white/10 text-white' : 'border-navy-100 bg-white text-navy-900'
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className={cn('h-4 w-4', dark ? 'text-gold-400' : 'text-gold-600')} />
            <span>
              {adults} lớn{childrenCount > 0 ? `, ${childrenCount} trẻ em` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => updateAdults(-1)}
              disabled={adults <= 1}
              aria-label="Giảm số người lớn"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg border transition disabled:opacity-40',
                dark
                  ? 'border-white/20 hover:bg-white/10'
                  : 'border-navy-100 hover:border-gold-400 hover:bg-gold-50'
              )}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateAdults(1)}
              disabled={adults >= maxAdults}
              aria-label="Tăng số người lớn"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg border transition disabled:opacity-40',
                dark
                  ? 'border-white/20 hover:bg-white/10'
                  : 'border-navy-100 hover:border-gold-400 hover:bg-gold-50'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}>
      <div className="flex items-center justify-between rounded-xl border border-navy-100 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-navy-900">Người lớn</p>
          <p className="text-xs text-slate-500">Từ 12 tuổi trở lên (tối đa {maxAdults})</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => updateAdults(-1)}
            disabled={adults <= 1}
            aria-label="Giảm người lớn"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-200 text-navy-800 transition hover:border-gold-500 hover:bg-gold-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-6 text-center text-sm font-bold text-navy-900">{adults}</span>
          <button
            type="button"
            onClick={() => updateAdults(1)}
            disabled={adults >= maxAdults}
            aria-label="Tăng người lớn"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-200 text-navy-800 transition hover:border-gold-500 hover:bg-gold-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-navy-100 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-navy-900">Trẻ em</p>
          <p className="text-xs text-slate-500">Dưới 12 tuổi (tối đa {maxChildren})</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => updateChildren(-1)}
            disabled={childrenCount <= 0}
            aria-label="Giảm trẻ em"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-200 text-navy-800 transition hover:border-gold-500 hover:bg-gold-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-6 text-center text-sm font-bold text-navy-900">{childrenCount}</span>
          <button
            type="button"
            onClick={() => updateChildren(1)}
            disabled={childrenCount >= maxChildren}
            aria-label="Tăng trẻ em"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-200 text-navy-800 transition hover:border-gold-500 hover:bg-gold-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
