import crypto from 'crypto';
import axios from 'axios';
import Stripe from 'stripe';
import {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from '@hotel/shared';
import { prisma } from '../config/database';
import { toNumber } from '../utils/helpers';
import { emitBookingEvent, emitPaymentEvent } from './socket';

export interface InitPaymentInput {
  bookingId: string;
  provider: PaymentProvider | string;
  amount: number;
  paymentType: PaymentType | string;
  currency?: string;
  returnUrl?: string;
  clientIp?: string;
}

export interface InitPaymentResult {
  payment: {
    id: string;
    bookingId: string;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    paymentType: string;
    transactionId: string | null;
  };
  paymentUrl?: string;
  clientSecret?: string;
  isSandbox: boolean;
}

function generateTransactionId(provider: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${provider.slice(0, 3).toUpperCase()}-${ts}-${rnd}`;
}

function sortObject(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  }
  return sorted;
}

function formatVnpayDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    String(date.getFullYear()) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

export async function initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { room: true },
  });

  if (!booking) {
    throw new Error('Không tìm thấy đơn đặt phòng');
  }
  if (booking.status === BookingStatus.CANCELED) {
    throw new Error('Không thể thanh toán cho đơn đặt phòng đã hủy');
  }

  const transactionId = generateTransactionId(input.provider);
  const currency = (input.currency || 'VND').toUpperCase();
  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:8000';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const returnUrl = input.returnUrl || `${clientUrl}/payment/callback`;

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: input.provider,
      amount: input.amount,
      currency,
      status: PaymentStatus.INITIATED,
      paymentType: input.paymentType,
      transactionId,
      metadata: {
        bookingCode: booking.bookingCode,
        returnUrl,
      },
    },
  });

  const basePaymentDto = {
    id: payment.id,
    bookingId: payment.bookingId,
    provider: payment.provider,
    amount: toNumber(payment.amount),
    currency: payment.currency,
    status: payment.status,
    paymentType: payment.paymentType,
    transactionId: payment.transactionId,
  };

  if (input.provider === PaymentProvider.VNPAY) {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const vnpUrl =
      process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const vnpReturnUrl =
      process.env.VNPAY_RETURN_URL || `${appBaseUrl}/api/payments/vnpay/callback`;

    if (tmnCode && hashSecret) {
      const now = new Date();
      const params: Record<string, string> = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: tmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: transactionId,
        vnp_OrderInfo: `Thanh toan dat phong ${booking.bookingCode}`,
        vnp_OrderType: 'other',
        vnp_Amount: String(Math.round(input.amount * 100)),
        vnp_ReturnUrl: vnpReturnUrl,
        vnp_IpAddr: input.clientIp || '127.0.0.1',
        vnp_CreateDate: formatVnpayDate(now),
      };

      const sorted = sortObject(params);
      const signData = Object.entries(sorted)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      const hmac = crypto.createHmac('sha512', hashSecret);
      const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      return {
        payment: basePaymentDto,
        paymentUrl: `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`,
        isSandbox: false,
      };
    }

    return {
      payment: basePaymentDto,
      paymentUrl: `${returnUrl}?provider=VNPAY&paymentId=${payment.id}&transactionId=${transactionId}&sandbox=true`,
      isSandbox: true,
    };
  }

  if (input.provider === PaymentProvider.MOMO) {
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const endpoint =
      process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';

    if (partnerCode && accessKey && secretKey) {
      const requestId = transactionId;
      const orderId = transactionId;
      const orderInfo = `Thanh toan dat phong ${booking.bookingCode}`;
      const ipnUrl = `${appBaseUrl}/api/payments/momo/callback`;
      const amountStr = String(Math.round(input.amount));
      const extraData = '';
      const requestType = 'captureWallet';

      const rawSignature = `accessKey=${accessKey}&amount=${amountStr}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

      try {
        const resp = await axios.post(endpoint, {
          partnerCode,
          accessKey,
          requestId,
          amount: amountStr,
          orderId,
          orderInfo,
          redirectUrl: returnUrl,
          ipnUrl,
          extraData,
          requestType,
          signature,
          lang: 'vi',
        });

        return {
          payment: basePaymentDto,
          paymentUrl: resp.data?.payUrl || `${returnUrl}?provider=MOMO&paymentId=${payment.id}`,
          isSandbox: false,
        };
      } catch {
        // Fall back to sandbox if MoMo test gateway is unreachable
      }
    }

    return {
      payment: basePaymentDto,
      paymentUrl: `${returnUrl}?provider=MOMO&paymentId=${payment.id}&transactionId=${transactionId}&sandbox=true`,
      isSandbox: true,
    };
  }

  if (input.provider === PaymentProvider.STRIPE) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      const stripe = new Stripe(stripeKey);
      const zeroDecimal = currency === 'VND' || currency === 'JPY';
      const stripeAmount = zeroDecimal
        ? Math.round(input.amount)
        : Math.round(input.amount * 100);

      const intent = await stripe.paymentIntents.create({
        amount: stripeAmount,
        currency: currency.toLowerCase(),
        metadata: {
          paymentId: payment.id,
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          transactionId,
        },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { gatewayRef: intent.id },
      });

      return {
        payment: basePaymentDto,
        clientSecret: intent.client_secret || undefined,
        isSandbox: false,
      };
    }

    return {
      payment: basePaymentDto,
      clientSecret: `pi_sandbox_${payment.id}_secret`,
      paymentUrl: `${returnUrl}?provider=STRIPE&paymentId=${payment.id}&transactionId=${transactionId}&sandbox=true`,
      isSandbox: true,
    };
  }

  if (input.provider === PaymentProvider.PAYPAL) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const paypalBase =
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (clientId && clientSecret) {
      try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenResp = await axios.post(
          `${paypalBase}/v1/oauth2/token`,
          'grant_type=client_credentials',
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        const accessToken = tokenResp.data.access_token;
        const usdAmount =
          currency === 'VND' ? (input.amount / 25000).toFixed(2) : input.amount.toFixed(2);

        const orderResp = await axios.post(
          `${paypalBase}/v2/checkout/orders`,
          {
            intent: 'CAPTURE',
            purchase_units: [
              {
                reference_id: transactionId,
                amount: {
                  currency_code: currency === 'VND' ? 'USD' : currency,
                  value: usdAmount,
                },
              },
            ],
            application_context: {
              return_url: `${returnUrl}?provider=PAYPAL&paymentId=${payment.id}`,
              cancel_url: `${returnUrl}?provider=PAYPAL&paymentId=${payment.id}&canceled=true`,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const approveLink = (orderResp.data?.links as Array<{ rel: string; href: string }> | undefined)?.find(
          (l) => l.rel === 'approve'
        )?.href;

        await prisma.payment.update({
          where: { id: payment.id },
          data: { gatewayRef: orderResp.data?.id || null },
        });

        return {
          payment: basePaymentDto,
          paymentUrl: approveLink || `${returnUrl}?provider=PAYPAL&paymentId=${payment.id}&sandbox=true`,
          isSandbox: false,
        };
      } catch {
        // Fallback to sandbox URL
      }
    }

    return {
      payment: basePaymentDto,
      paymentUrl: `${returnUrl}?provider=PAYPAL&paymentId=${payment.id}&transactionId=${transactionId}&sandbox=true`,
      isSandbox: true,
    };
  }

  // CASH payment
  return {
    payment: basePaymentDto,
    isSandbox: true,
  };
}

export async function completePayment(
  paymentIdOrTxnId: string,
  gatewayRef?: string,
  metadata?: Record<string, unknown>
) {
  const existing = await prisma.payment.findFirst({
    where: {
      OR: [{ id: paymentIdOrTxnId }, { transactionId: paymentIdOrTxnId }],
    },
    include: {
      booking: true,
    },
  });

  if (!existing) {
    throw new Error('Không tìm thấy giao dịch thanh toán');
  }

  if (existing.status === PaymentStatus.COMPLETED) {
    return existing;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: existing.id },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        gatewayRef: gatewayRef || existing.gatewayRef || `SBX-${Date.now()}`,
        metadata: metadata
          ? {
              ...(typeof existing.metadata === 'object' && existing.metadata !== null
                ? existing.metadata
                : {}),
              ...metadata,
            }
          : existing.metadata ?? undefined,
      },
    });

    const paidAmount = toNumber(existing.booking.paidAmount) + toNumber(existing.amount);
    const nextStatus =
      existing.booking.status === BookingStatus.PENDING
        ? BookingStatus.CONFIRMED
        : existing.booking.status;

    const updatedBooking = await tx.booking.update({
      where: { id: existing.bookingId },
      data: {
        paidAmount,
        status: nextStatus,
      },
    });

    if (existing.booking.userId) {
      const earnedPoints = Math.floor(toNumber(existing.amount) / 10000);
      if (earnedPoints > 0) {
        await tx.user.update({
          where: { id: existing.booking.userId },
          data: {
            points: { increment: earnedPoints },
          },
        });
        await tx.pointHistory.create({
          data: {
            userId: existing.booking.userId,
            points: earnedPoints,
            type: 'EARN',
            description: `Tích điểm thanh toán đơn ${existing.booking.bookingCode}`,
            bookingId: existing.bookingId,
          },
        });
      }
    }

    return { payment: updatedPayment, booking: updatedBooking };
  });

  emitPaymentEvent('payment:completed', {
    paymentId: result.payment.id,
    bookingId: result.booking.id,
    bookingCode: result.booking.bookingCode,
    amount: toNumber(result.payment.amount),
    provider: result.payment.provider,
  });

  emitBookingEvent('booking:updated', {
    bookingId: result.booking.id,
    bookingCode: result.booking.bookingCode,
    status: result.booking.status,
    paidAmount: toNumber(result.booking.paidAmount),
  });

  return result.payment;
}

export async function failPayment(paymentIdOrTxnId: string, reason?: string) {
  const existing = await prisma.payment.findFirst({
    where: {
      OR: [{ id: paymentIdOrTxnId }, { transactionId: paymentIdOrTxnId }],
    },
  });
  if (!existing) {
    throw new Error('Không tìm thấy giao dịch thanh toán');
  }

  return prisma.payment.update({
    where: { id: existing.id },
    data: {
      status: PaymentStatus.FAILED,
      metadata: {
        ...(typeof existing.metadata === 'object' && existing.metadata !== null
          ? existing.metadata
          : {}),
        failureReason: reason || 'Payment failed',
      },
    },
  });
}

export function verifyVnpayChecksum(query: Record<string, string>): boolean {
  const hashSecret = process.env.VNPAY_HASH_SECRET;
  if (!hashSecret) return true; // Sandbox fallback

  const secureHash = query.vnp_SecureHash;
  const clone: Record<string, string> = {};
  for (const [key, val] of Object.entries(query)) {
    if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      clone[key] = val;
    }
  }
  const sorted = sortObject(clone);
  const signData = Object.entries(sorted)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const signed = crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return signed === secureHash;
}

export function verifyMomoSignature(body: Record<string, unknown>): boolean {
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  if (!accessKey || !secretKey) return true;

  const signature = String(body.signature || '');
  const rawSignature = `accessKey=${accessKey}&amount=${body.amount}&extraData=${body.extraData || ''}&message=${body.message || ''}&orderId=${body.orderId}&orderInfo=${body.orderInfo}&orderType=${body.orderType || ''}&partnerCode=${body.partnerCode}&payType=${body.payType || ''}&requestId=${body.requestId}&responseTime=${body.responseTime}&resultCode=${body.resultCode}&transId=${body.transId}`;
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignature)
    .digest('hex');

  return signature === expected;
}
