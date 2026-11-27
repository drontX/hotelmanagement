'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-lg',
  className,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-navy-900/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full overflow-hidden rounded-2xl border border-gold-200/70 bg-white shadow-2xl',
          maxWidthClass,
          className
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between border-b border-gold-100 bg-navy-900 px-6 py-4 text-white">
            <div>
              {title && <h3 className="font-serif text-xl font-semibold text-cream-100">{title}</h3>}
              {subtitle && <p className="mt-0.5 text-xs text-cream-200/80">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hộp thoại"
              className="rounded-full p-1.5 text-cream-200/80 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {!title && !subtitle && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="absolute right-4 top-4 z-20 rounded-full bg-navy-900/60 p-2 text-white transition hover:bg-navy-900"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="max-h-[82vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
