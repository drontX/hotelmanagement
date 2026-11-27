import { Card, Divider, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import {
  BookingType,
  DEFAULT_DEPOSIT_RATE,
  DEFAULT_VAT_RATE,
  formatVND,
} from '@/types';
import type { ExtraChargeItem, PriceBreakdown, RoomType } from '@/types';

const { Text } = Typography;

interface ComputePriceParams {
  roomType?: RoomType;
  checkIn: string;
  checkOut: string;
  bookingType: BookingType;
  hours?: number;
  extraServices?: ExtraChargeItem[];
  earlyCheckInFee?: number;
  lateCheckOutFee?: number;
  redeemPoints?: number;
}

export function computePriceBreakdown({
  roomType,
  checkIn,
  checkOut,
  bookingType,
  hours = 2,
  extraServices = [],
  earlyCheckInFee = 0,
  lateCheckOutFee = 0,
  redeemPoints = 0,
}: ComputePriceParams): PriceBreakdown {
  const baseDaily = roomType?.baseRateDaily ?? 1500000;
  const baseHourly = roomType?.baseRateHourly ?? 350000;

  let baseAmount = 0;
  let durationLabel = '';

  if (bookingType === BookingType.HOURLY) {
    const safeHours = Math.max(1, hours);
    if (safeHours <= 2) {
      baseAmount = baseHourly;
    } else {
      const extraHours = safeHours - 2;
      baseAmount = Math.round(baseHourly + extraHours * (baseHourly * 0.3));
    }
    if (baseAmount > baseDaily) {
      baseAmount = baseDaily;
    }
    durationLabel = `${safeHours} giờ`;
  } else {
    const start = dayjs(checkIn).startOf('day');
    const end = dayjs(checkOut).startOf('day');
    const nights = Math.max(1, end.diff(start, 'day'));
    baseAmount = nights * baseDaily;
    durationLabel = `${nights} đêm`;
  }

  let extraServicesTotal = 0;
  let specialTaxAmount = 0;

  for (const item of extraServices) {
    const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
    extraServicesTotal += lineTotal;
    if (item.category === 'ALCOHOL') {
      specialTaxAmount += Math.round(lineTotal * (item.specialTaxRate ?? 0.65));
    } else if (item.category === 'TOBACCO') {
      specialTaxAmount += Math.round(lineTotal * (item.specialTaxRate ?? 0.75));
    }
  }

  const surchargeAmount = earlyCheckInFee + lateCheckOutFee;
  const discountAmount = Math.min(baseAmount, Math.max(0, redeemPoints * 1000));
  const netAmount = Math.max(0, baseAmount + surchargeAmount + extraServicesTotal + specialTaxAmount - discountAmount);
  const vatAmount = Math.round(netAmount * DEFAULT_VAT_RATE);
  const totalAmount = netAmount + vatAmount;
  const depositAmount = Math.round(totalAmount * DEFAULT_DEPOSIT_RATE);

  const details: { label: string; amount: number }[] = [
    { label: `Tiền phòng (${durationLabel})`, amount: baseAmount },
  ];
  if (earlyCheckInFee > 0) details.push({ label: 'Phụ thu nhận phòng sớm', amount: earlyCheckInFee });
  if (lateCheckOutFee > 0) details.push({ label: 'Phụ thu trả phòng muộn', amount: lateCheckOutFee });
  if (extraServicesTotal > 0) details.push({ label: 'Dịch vụ & Minibar', amount: extraServicesTotal });
  if (specialTaxAmount > 0) details.push({ label: 'Thuế TTĐB (Rượu/Bia 65%, Thuốc lá 75%)', amount: specialTaxAmount });
  if (discountAmount > 0) details.push({ label: 'Quy đổi điểm thành viên', amount: -discountAmount });

  return {
    baseAmount,
    surchargeAmount,
    earlyCheckInFee,
    lateCheckOutFee,
    extraServicesTotal,
    specialTaxAmount,
    discountAmount,
    netAmount,
    vatAmount,
    totalAmount,
    depositAmount,
    durationLabel,
    details,
  };
}

interface PriceCalculatorProps {
  breakdown: PriceBreakdown;
  paymentType?: 'FULL' | 'DEPOSIT';
}

export default function PriceCalculator({ breakdown, paymentType = 'FULL' }: PriceCalculatorProps) {
  return (
    <Card
      size="small"
      title={<Text strong>Chi tiết tạm tính & Thuế (VAT 8%)</Text>}
      style={{ backgroundColor: '#f8fafc', borderRadius: 10 }}
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {breakdown.details.map((row) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <Text type="secondary">{row.label}</Text>
            <Text strong={row.amount < 0} style={{ color: row.amount < 0 ? '#16a34a' : undefined }}>
              {row.amount < 0 ? `-${formatVND(Math.abs(row.amount))}` : formatVND(row.amount)}
            </Text>
          </div>
        ))}

        <Divider style={{ margin: '6px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <Text type="secondary">Tổng trước thuế</Text>
          <Text>{formatVND(breakdown.netAmount)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <Space size={4}>
            <Text type="secondary">Thuế GTGT (VAT)</Text>
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              {Math.round(DEFAULT_VAT_RATE * 100)}%
            </Tag>
          </Space>
          <Text>{formatVND(breakdown.vatAmount)}</Text>
        </div>

        <Divider style={{ margin: '6px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: 15 }}>
            Tổng thanh toán
          </Text>
          <Text strong style={{ fontSize: 18, color: '#b45309' }}>
            {formatVND(breakdown.totalAmount)}
          </Text>
        </div>

        {paymentType === 'DEPOSIT' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <Text type="secondary">Tiền đặt cọc (30%)</Text>
            <Text strong style={{ color: '#1d4ed8' }}>
              {formatVND(breakdown.depositAmount)}
            </Text>
          </div>
        )}
      </Space>
    </Card>
  );
}
