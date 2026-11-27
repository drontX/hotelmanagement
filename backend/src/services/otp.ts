import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../config/database';

const OTP_TTL_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

export async function sendOtp(phone: string): Promise<{
  sent: boolean;
  expiresAt: Date;
  devCode?: string;
}> {
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      phone,
      code,
      expiresAt,
      verified: false,
      attempts: 0,
    },
  });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && fromPhone) {
    try {
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams({
        To: phone,
        From: fromPhone,
        Body: `[Grand Saigon Hotel] Ma xac thuc OTP cua ban la: ${code}. Hieu luc trong 5 phut.`,
      });

      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        params.toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 5000,
        }
      );
      return { sent: true, expiresAt };
    } catch (err) {
      console.warn('[OTP] Twilio send failed, falling back to dev log:', (err as Error).message);
    }
  }

  console.info(`[OTP DEV] Phone: ${phone} -> Code: ${code}`);
  return {
    sent: true,
    expiresAt,
    devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
  };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: {
      phone,
      verified: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new Error('Không tìm thấy mã OTP cho số điện thoại này');
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw new Error('Mã OTP đã hết hạn');
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new Error('Bạn đã nhập sai quá số lần cho phép');
  }

  if (record.code !== code) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error('Mã OTP không chính xác');
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return true;
}
