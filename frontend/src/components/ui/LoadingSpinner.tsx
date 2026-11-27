'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  label = 'Đang tải dữ liệu...',
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-9 w-9 border-[3px]',
    lg: 'h-14 w-14 border-4',
  };

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            'animate-spin rounded-full border-gold-200 border-t-gold-500',
            sizeClasses[size]
          )}
        />
        <span className="absolute h-2 w-2 rounded-full bg-navy-600" />
      </div>
      {label ? (
        <p className="text-sm font-medium tracking-wide text-navy-700">{label}</p>
      ) : null}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-50/85 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}
