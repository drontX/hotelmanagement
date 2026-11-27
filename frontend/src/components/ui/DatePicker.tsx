'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  type?: 'date' | 'datetime-local';
  required?: boolean;
  disabled?: boolean;
  className?: string;
  dark?: boolean;
}

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  type = 'date',
  required = false,
  disabled = false,
  className,
  dark = false,
}: DatePickerProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          dark ? 'text-cream-200' : 'text-navy-700'
        )}
      >
        {label}
      </label>
      <div className="relative">
        <Calendar
          className={cn(
            'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2',
            dark ? 'text-gold-400' : 'text-gold-600'
          )}
        />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          className={cn(
            'w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm font-medium outline-none transition',
            dark
              ? 'border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-gold-400 focus:bg-white/15'
              : 'border-navy-100 bg-white text-navy-900 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        />
      </div>
    </div>
  );
}
