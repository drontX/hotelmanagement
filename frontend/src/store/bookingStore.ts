'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BookingType, PaymentProvider, PaymentType } from '@hotel/shared';
import { getDefaultDateRange } from '@/lib/utils';
import type {
  Booking,
  ExtraChargeItemInput,
  PriceBreakdownData,
  Room,
} from '@/types';

const defaultDates = getDefaultDateRange();

interface BookingDraftState {
  selectedRoom: Room | null;
  bookingType: BookingType;
  checkIn: string;
  checkOut: string;
  hours: number;
  guests: number;
  childrenCount: number;
  extraServices: ExtraChargeItemInput[];
  redeemPoints: number;
  paymentType: PaymentType;
  paymentProvider: PaymentProvider;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestIdCard: string;
  notes: string;
  priceBreakdown: PriceBreakdownData | null;
  lastCreatedBooking: Booking | null;

  setSelectedRoom: (room: Room | null) => void;
  setBookingType: (bookingType: BookingType) => void;
  setDates: (checkIn: string, checkOut: string) => void;
  setHours: (hours: number) => void;
  setGuests: (guests: number, childrenCount?: number) => void;
  setExtraServices: (services: ExtraChargeItemInput[]) => void;
  setRedeemPoints: (points: number) => void;
  setPaymentType: (paymentType: PaymentType) => void;
  setPaymentProvider: (provider: PaymentProvider) => void;
  setGuestInfo: (info: Partial<Pick<BookingDraftState, 'guestName' | 'guestPhone' | 'guestEmail' | 'guestIdCard' | 'notes'>>) => void;
  setPriceBreakdown: (breakdown: PriceBreakdownData | null) => void;
  setLastCreatedBooking: (booking: Booking | null) => void;
  resetBookingDraft: () => void;
}

export const useBookingStore = create<BookingDraftState>()(
  persist(
    (set) => ({
      selectedRoom: null,
      bookingType: BookingType.DAILY,
      checkIn: defaultDates.checkIn,
      checkOut: defaultDates.checkOut,
      hours: 2,
      guests: 2,
      childrenCount: 0,
      extraServices: [],
      redeemPoints: 0,
      paymentType: PaymentType.FULL,
      paymentProvider: PaymentProvider.VNPAY,
      guestName: '',
      guestPhone: '',
      guestEmail: '',
      guestIdCard: '',
      notes: '',
      priceBreakdown: null,
      lastCreatedBooking: null,

      setSelectedRoom: (selectedRoom) => set({ selectedRoom }),
      setBookingType: (bookingType) => set({ bookingType }),
      setDates: (checkIn, checkOut) => set({ checkIn, checkOut }),
      setHours: (hours) => set({ hours }),
      setGuests: (guests, childrenCount) =>
        set((state) => ({
          guests,
          childrenCount: childrenCount !== undefined ? childrenCount : state.childrenCount,
        })),
      setExtraServices: (extraServices) => set({ extraServices }),
      setRedeemPoints: (redeemPoints) => set({ redeemPoints }),
      setPaymentType: (paymentType) => set({ paymentType }),
      setPaymentProvider: (paymentProvider) => set({ paymentProvider }),
      setGuestInfo: (info) => set((state) => ({ ...state, ...info })),
      setPriceBreakdown: (priceBreakdown) => set({ priceBreakdown }),
      setLastCreatedBooking: (lastCreatedBooking) => set({ lastCreatedBooking }),

      resetBookingDraft: () => {
        const freshDates = getDefaultDateRange();
        set({
          selectedRoom: null,
          bookingType: BookingType.DAILY,
          checkIn: freshDates.checkIn,
          checkOut: freshDates.checkOut,
          hours: 2,
          guests: 2,
          childrenCount: 0,
          extraServices: [],
          redeemPoints: 0,
          paymentType: PaymentType.FULL,
          paymentProvider: PaymentProvider.VNPAY,
          notes: '',
          priceBreakdown: null,
        });
      },
    }),
    {
      name: 'gsh-booking-draft',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedRoom: state.selectedRoom,
        bookingType: state.bookingType,
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        hours: state.hours,
        guests: state.guests,
        childrenCount: state.childrenCount,
        extraServices: state.extraServices,
        redeemPoints: state.redeemPoints,
        paymentType: state.paymentType,
        paymentProvider: state.paymentProvider,
        guestName: state.guestName,
        guestPhone: state.guestPhone,
        guestEmail: state.guestEmail,
        guestIdCard: state.guestIdCard,
        notes: state.notes,
        priceBreakdown: state.priceBreakdown,
        lastCreatedBooking: state.lastCreatedBooking,
      }),
    }
  )
);
