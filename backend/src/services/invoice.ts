import axios from 'axios';
import {
  BookingStatus,
  DEFAULT_VAT_RATE,
  ExtraChargeItemInput,
  PaymentType,
} from '@hotel/shared';
import { prisma } from '../config/database';
import { generateInvoiceNumber, toNumber } from '../utils/helpers';
import { calculateVAT, separateSpecialTax } from './pricing';

export interface CustomerInvoiceInfo {
  customerName?: string;
  customerTaxCode?: string;
  customerAddress?: string;
  customerEmail?: string;
}

export async function createInvoiceForBooking(
  bookingId: string,
  customerInfo: CustomerInvoiceInfo = {}
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      hotel: true,
      room: { include: { roomType: true } },
      user: true,
      invoice: true,
      payments: true,
    },
  });

  if (!booking) {
    const err = new Error('Không tìm thấy đơn đặt phòng') as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  if (booking.status === BookingStatus.CANCELED) {
    const err = new Error('Không thể xuất hóa đơn cho đơn đặt phòng đã hủy') as Error & {
      statusCode?: number;
    };
    err.statusCode = 400;
    throw err;
  }

  // Enforce strict rule: NO invoice for deposit-only or unpaid bookings
  const totalAmount = toNumber(booking.totalAmount);
  const paidAmount = toNumber(booking.paidAmount);
  if (paidAmount <= 0 || paidAmount + 1 < totalAmount) {
    const err = new Error(
      'Không thể xuất hóa đơn VAT cho đặt phòng chỉ mới đặt cọc hoặc chưa thanh toán đủ'
    ) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  if (
    booking.paymentType === PaymentType.DEPOSIT &&
    paidAmount < totalAmount
  ) {
    const err = new Error(
      'Đặt phòng đặt cọc chưa thanh toán đủ 100%, không thể phát hành hóa đơn VAT'
    ) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  if (booking.invoice) {
    return booking.invoice;
  }

  const rawExtraCharges = Array.isArray(booking.extraCharges)
    ? (booking.extraCharges as unknown as ExtraChargeItemInput[])
    : [];

  const specialTax = separateSpecialTax(rawExtraCharges);
  const roomRate = toNumber(booking.roomRate);
  const discountAmount = toNumber(booking.discountAmount);
  const subtotal = Math.max(
    0,
    roomRate + specialTax.extraChargesTotal + specialTax.specialTaxAmount - discountAmount
  );
  const vatRate = DEFAULT_VAT_RATE;
  const vatAmount = calculateVAT(subtotal, vatRate);
  const invoiceTotal = Math.round(subtotal + vatAmount);

  const invoiceNumber = generateInvoiceNumber();
  let eInvoiceRef = `EINV-${invoiceNumber}`;

  const eInvoiceEndpoint = process.env.EINVOICE_API_ENDPOINT;
  const eInvoiceKey = process.env.EINVOICE_API_KEY;
  if (eInvoiceEndpoint && eInvoiceKey) {
    try {
      const resp = await axios.post(
        eInvoiceEndpoint,
        {
          invoiceNumber,
          sellerTaxCode:
            process.env.EINVOICE_COMPANY_TAX_CODE || booking.hotel.taxCode || '0301234567',
          customerName:
            customerInfo.customerName || booking.guestName || booking.user?.name || 'Khách lẻ',
          customerTaxCode: customerInfo.customerTaxCode || '',
          customerAddress: customerInfo.customerAddress || '',
          customerEmail:
            customerInfo.customerEmail || booking.guestEmail || booking.user?.email || '',
          subtotal,
          vatRate,
          vatAmount,
          specialTaxAmount: specialTax.specialTaxAmount,
          specialTaxItems: specialTax.specialTaxItems,
          totalAmount: invoiceTotal,
        },
        {
          headers: { Authorization: `Bearer ${eInvoiceKey}` },
          timeout: 5000,
        }
      );
      if (resp.data?.eInvoiceRef) {
        eInvoiceRef = String(resp.data.eInvoiceRef);
      }
    } catch {
      // Keep local reference if external E-Invoice gateway is in sandbox/unreachable
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      bookingId: booking.id,
      customerName:
        customerInfo.customerName || booking.guestName || booking.user?.name || 'Khách lưu trú',
      customerTaxCode: customerInfo.customerTaxCode || null,
      customerAddress: customerInfo.customerAddress || null,
      customerEmail:
        customerInfo.customerEmail || booking.guestEmail || booking.user?.email || null,
      subtotal,
      vatRate,
      vatAmount,
      specialTaxItems: specialTax.specialTaxItems as unknown as object,
      specialTaxAmount: specialTax.specialTaxAmount,
      discountAmount,
      totalAmount: invoiceTotal,
      eInvoiceRef,
      issuedAt: new Date(),
    },
    include: {
      booking: {
        include: {
          hotel: true,
          room: { include: { roomType: true } },
        },
      },
    },
  });

  return invoice;
}

export function renderInvoiceHtml(invoice: {
  invoiceNumber: string;
  customerName: string | null;
  customerTaxCode: string | null;
  customerAddress: string | null;
  customerEmail: string | null;
  subtotal: unknown;
  vatRate: unknown;
  vatAmount: unknown;
  specialTaxItems: unknown;
  specialTaxAmount: unknown;
  discountAmount: unknown;
  totalAmount: unknown;
  eInvoiceRef: string | null;
  issuedAt: Date;
  booking: {
    bookingCode: string;
    checkIn: Date;
    checkOut: Date;
    roomRate: unknown;
    extraCharges: unknown;
    hotel: {
      name: string;
      address: string;
      taxCode: string | null;
      phone: string | null;
    };
    room: {
      roomNumber: string;
      roomType: { name: string };
    };
  };
}): string {
  const fmt = (n: unknown) =>
    `${new Intl.NumberFormat('vi-VN').format(Math.round(toNumber(n)))} VNĐ`;

  const specialItems = Array.isArray(invoice.specialTaxItems)
    ? (invoice.specialTaxItems as Array<{
        name: string;
        quantity: number;
        baseAmount: number;
        specialTaxRate: number;
        specialTaxAmount: number;
      }>)
    : [];

  const specialRows = specialItems
    .map(
      (item) => `
      <tr>
        <td>${item.name} (TTĐB ${Math.round(item.specialTaxRate * 100)}%)</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${fmt(item.baseAmount)}</td>
        <td style="text-align:right">${fmt(item.specialTaxAmount)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Hóa Đơn ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1f2937; max-width: 820px; margin: 24px auto; padding: 24px; border: 1px solid #e5e7eb; }
    h1 { color: #b45309; margin-bottom: 4px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 14px; }
    th { background: #f9fafb; text-align: left; }
    .totals { margin-top: 16px; text-align: right; font-size: 15px; }
    .totals p { margin: 6px 0; }
    .grand { font-size: 18px; font-weight: bold; color: #b45309; }
  </style>
</head>
<body>
  <h1>${invoice.booking.hotel.name}</h1>
  <p>${invoice.booking.hotel.address} | MST: ${invoice.booking.hotel.taxCode || '0301234567'}</p>
  <hr />
  <div class="meta">
    <div>
      <strong>HÓA ĐƠN GIÁ TRỊ GIA TĂNG (VAT)</strong><br />
      Số hóa đơn: ${invoice.invoiceNumber}<br />
      Mã CQT (E-Invoice): ${invoice.eInvoiceRef || 'N/A'}<br />
      Ngày phát hành: ${new Date(invoice.issuedAt).toLocaleString('vi-VN')}
    </div>
    <div>
      <strong>Khách hàng:</strong> ${invoice.customerName || 'Khách lẻ'}<br />
      MST: ${invoice.customerTaxCode || 'Không có'}<br />
      Địa chỉ: ${invoice.customerAddress || 'N/A'}<br />
      Mã đặt phòng: ${invoice.booking.bookingCode} (Phòng ${invoice.booking.room.roomNumber})
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Hạng mục</th>
        <th style="text-align:center">SL</th>
        <th style="text-align:right">Thành tiền</th>
        <th style="text-align:right">Thuế TTĐB</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Tiền phòng (${invoice.booking.room.roomType.name})</td>
        <td style="text-align:center">1</td>
        <td style="text-align:right">${fmt(invoice.booking.roomRate)}</td>
        <td style="text-align:right">0 VNĐ</td>
      </tr>
      ${specialRows}
    </tbody>
  </table>
  <div class="totals">
    <p>Giảm giá / Quy đổi điểm: -${fmt(invoice.discountAmount)}</p>
    <p>Thuế tiêu thụ đặc biệt (TTĐB): ${fmt(invoice.specialTaxAmount)}</p>
    <p>Tổng tiền trước VAT: ${fmt(invoice.subtotal)}</p>
    <p>Thuế GTGT (VAT ${Math.round(toNumber(invoice.vatRate) * 100)}%): ${fmt(invoice.vatAmount)}</p>
    <p class="grand">TỔNG THANH TOÁN: ${fmt(invoice.totalAmount)}</p>
  </div>
</body>
</html>`;
}
