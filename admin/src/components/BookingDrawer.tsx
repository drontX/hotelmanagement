import { useEffect, useMemo, useState } from 'react';
import {
  DeleteOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import PriceCalculator, { computePriceBreakdown } from '@/components/PriceCalculator';
import { bookingsApi, extractErrorMessage } from '@/services/api';
import { useHotelStore } from '@/store/hotelStore';
import {
  BOOKING_SOURCE_META,
  BOOKING_STATUS_META,
  BookingSource,
  BookingStatus,
  BookingType,
  PAYMENT_PROVIDER_LABELS,
  PaymentProvider,
  PaymentType,
  RoomStatus,
  formatVND,
} from '@/types';
import type { Booking, ExtraChargeCategory, ExtraChargeItem, Room } from '@/types';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface BookingDrawerProps {
  open: boolean;
  booking?: Booking | null;
  initialRoom?: Room | null;
  onClose: () => void;
  onSaved?: (booking: Booking) => void;
}

interface BookingFormValues {
  roomId: string;
  bookingType: BookingType;
  dateRange: [Dayjs, Dayjs];
  hours: number;
  guests: number;
  childrenCount: number;
  source: BookingSource;
  paymentType: PaymentType;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestIdCard?: string;
  notes?: string;
}

export default function BookingDrawer({
  open,
  booking,
  initialRoom,
  onClose,
  onSaved,
}: BookingDrawerProps) {
  const [form] = Form.useForm<BookingFormValues>();
  const { rooms, addOrUpdateBookingLocal, updateRoomStatus, pushNotification } = useHotelStore();
  const [submitting, setSubmitting] = useState(false);
  const [extraServices, setExtraServices] = useState<ExtraChargeItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ExtraChargeCategory>('STANDARD');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(50000);
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentProvider>(PaymentProvider.CASH);

  const isDetailMode = Boolean(booking);

  const watchedRoomId = Form.useWatch('roomId', form);
  const watchedBookingType = Form.useWatch('bookingType', form) || BookingType.DAILY;
  const watchedRange = Form.useWatch('dateRange', form);
  const watchedHours = Form.useWatch('hours', form) || 2;
  const watchedPaymentType = Form.useWatch('paymentType', form) || PaymentType.FULL;

  useEffect(() => {
    if (!open) return;
    if (booking) {
      setExtraServices(booking.extraServices || []);
    } else {
      setExtraServices([]);
      form.setFieldsValue({
        roomId: initialRoom?.id || rooms.find((r) => r.status === RoomStatus.EMPTY)?.id,
        bookingType: BookingType.DAILY,
        dateRange: [dayjs(), dayjs().add(1, 'day')],
        hours: 3,
        guests: 2,
        childrenCount: 0,
        source: BookingSource.WALK_IN,
        paymentType: PaymentType.FULL,
      });
    }
  }, [open, booking, initialRoom, rooms, form]);

  const selectedRoom = useMemo(() => {
    if (booking?.room) return booking.room;
    const id = watchedRoomId || initialRoom?.id;
    return rooms.find((r) => r.id === id);
  }, [booking, watchedRoomId, initialRoom, rooms]);

  const breakdown = useMemo(() => {
    const checkIn = booking
      ? booking.checkIn
      : watchedRange?.[0]?.toISOString() || dayjs().toISOString();
    const checkOut = booking
      ? booking.checkOut
      : watchedRange?.[1]?.toISOString() || dayjs().add(1, 'day').toISOString();

    return computePriceBreakdown({
      roomType: selectedRoom?.roomType,
      checkIn,
      checkOut,
      bookingType: booking ? booking.bookingType : watchedBookingType,
      hours: booking ? booking.hours : watchedHours,
      extraServices,
    });
  }, [booking, selectedRoom, watchedRange, watchedBookingType, watchedHours, extraServices]);

  const handleAddExtra = () => {
    if (!newItemName.trim()) {
      message.warning('Vui lòng nhập tên dịch vụ / sản phẩm');
      return;
    }
    const item: ExtraChargeItem = {
      id: `extra-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: newItemQty,
      unitPrice: newItemPrice,
    };
    setExtraServices((prev) => [...prev, item]);
    setNewItemName('');
    setNewItemQty(1);
  };

  const handleRemoveExtra = (index: number) => {
    setExtraServices((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateSubmit = async (values: BookingFormValues) => {
    setSubmitting(true);
    const checkInIso =
      values.bookingType === BookingType.HOURLY
        ? dayjs().toISOString()
        : values.dateRange[0].hour(14).minute(0).toISOString();
    const checkOutIso =
      values.bookingType === BookingType.HOURLY
        ? dayjs().add(values.hours, 'hour').toISOString()
        : values.dateRange[1].hour(12).minute(0).toISOString();

    try {
      const created = await bookingsApi.create({
        roomId: values.roomId,
        checkIn: checkInIso,
        checkOut: checkOutIso,
        guests: values.guests,
        childrenCount: values.childrenCount,
        bookingType: values.bookingType,
        hours: values.bookingType === BookingType.HOURLY ? values.hours : undefined,
        paymentType: values.paymentType,
        source: values.source,
        guestName: values.guestName,
        guestPhone: values.guestPhone,
        guestEmail: values.guestEmail,
        guestIdCard: values.guestIdCard,
        notes: values.notes,
        redeemPoints: 0,
        extraServices,
      });
      addOrUpdateBookingLocal(created);
      message.success('Tạo đơn đặt phòng thành công');
      onSaved?.(created);
      onClose();
    } catch {
      const localBooking: Booking = {
        id: `bk-${Date.now()}`,
        bookingCode: `GSH-${dayjs().format('YYYY')}-${Math.floor(1000 + Math.random() * 9000)}`,
        roomId: values.roomId,
        room: selectedRoom,
        guestName: values.guestName,
        guestPhone: values.guestPhone,
        guestEmail: values.guestEmail,
        guestIdCard: values.guestIdCard,
        checkIn: checkInIso,
        checkOut: checkOutIso,
        guests: values.guests,
        childrenCount: values.childrenCount,
        bookingType: values.bookingType,
        hours: values.bookingType === BookingType.HOURLY ? values.hours : undefined,
        status: values.source === BookingSource.WALK_IN ? BookingStatus.CHECKED_IN : BookingStatus.CONFIRMED,
        source: values.source,
        paymentType: values.paymentType,
        roomCharge: breakdown.baseAmount,
        extraChargesTotal: breakdown.extraServicesTotal,
        specialTaxAmount: breakdown.specialTaxAmount,
        vatAmount: breakdown.vatAmount,
        totalAmount: breakdown.totalAmount,
        depositAmount: values.paymentType === PaymentType.DEPOSIT ? breakdown.depositAmount : undefined,
        extraServices,
        notes: values.notes,
        createdAt: new Date().toISOString(),
      };
      addOrUpdateBookingLocal(localBooking);
      if (localBooking.status === BookingStatus.CHECKED_IN) {
        await updateRoomStatus(values.roomId, RoomStatus.OCCUPIED);
      }
      pushNotification({
        title: 'Đã tạo đơn đặt phòng',
        description: `${localBooking.guestName} — Phòng ${selectedRoom?.roomNumber || ''}`,
        type: 'success',
      });
      message.success('Đã lưu đơn đặt phòng');
      onSaved?.(localBooking);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      const updated = await bookingsApi.checkIn(booking.id, { guestIdCard: booking.guestIdCard });
      addOrUpdateBookingLocal(updated);
    } catch {
      addOrUpdateBookingLocal({ ...booking, status: BookingStatus.CHECKED_IN, actualCheckIn: new Date().toISOString() });
    }
    await updateRoomStatus(booking.roomId, RoomStatus.OCCUPIED);
    message.success('Check-in thành công!');
    setSubmitting(false);
    onClose();
  };

  const handleCheckOut = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      const updated = await bookingsApi.checkOut(booking.id, {
        extraServices,
        paymentMethod: checkoutMethod,
      });
      addOrUpdateBookingLocal(updated);
    } catch (err) {
      if (err instanceof Error && !err.message) {
        message.error(extractErrorMessage(err));
      }
      addOrUpdateBookingLocal({
        ...booking,
        status: BookingStatus.CHECKED_OUT,
        actualCheckOut: new Date().toISOString(),
        extraServices,
        extraChargesTotal: breakdown.extraServicesTotal,
        specialTaxAmount: breakdown.specialTaxAmount,
        vatAmount: breakdown.vatAmount,
        totalAmount: breakdown.totalAmount,
        paidAmount: breakdown.totalAmount,
      });
    }
    await updateRoomStatus(booking.roomId, RoomStatus.CLEANING);
    message.success('Đã Check-out và chuyển phòng sang trạng thái Đang dọn dẹp');
    setSubmitting(false);
    onClose();
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      const updated = await bookingsApi.cancel(booking.id, 'Hủy bởi quản trị viên');
      addOrUpdateBookingLocal(updated);
    } catch {
      addOrUpdateBookingLocal({ ...booking, status: BookingStatus.CANCELED });
    }
    if (booking.roomId) {
      await updateRoomStatus(booking.roomId, RoomStatus.EMPTY);
    }
    message.success('Đã hủy đơn đặt phòng');
    setSubmitting(false);
    onClose();
  };

  return (
    <Drawer
      title={
        isDetailMode
          ? `Chi tiết đặt phòng ${booking?.bookingCode || booking?.id}`
          : 'Tạo đơn đặt phòng mới'
      }
      width={640}
      open={open}
      onClose={onClose}
      destroyOnClose
      footer={
        isDetailMode && booking ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space>
              {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                <Popconfirm title="Xác nhận hủy đơn đặt phòng này?" onConfirm={handleCancelBooking}>
                  <Button danger icon={<StopOutlined />} loading={submitting}>
                    Hủy đặt phòng
                  </Button>
                </Popconfirm>
              )}
            </Space>
            <Space>
              <Button onClick={onClose}>Đóng</Button>
              {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                <Button type="primary" icon={<LoginOutlined />} loading={submitting} onClick={handleCheckIn}>
                  Nhận phòng (Check-in)
                </Button>
              )}
              {booking.status === BookingStatus.CHECKED_IN && (
                <Button type="primary" danger icon={<LogoutOutlined />} loading={submitting} onClick={handleCheckOut}>
                  Trả phòng & Thu tiền
                </Button>
              )}
            </Space>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onClose}>Hủy</Button>
            <Button type="primary" loading={submitting} onClick={() => form.submit()}>
              Xác nhận đặt phòng
            </Button>
          </div>
        )
      }
    >
      {isDetailMode && booking ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Mã đặt phòng">
              <Text strong>{booking.bookingCode || booking.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={BOOKING_STATUS_META[booking.status].color}>
                {BOOKING_STATUS_META[booking.status].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Khách lưu trú">{booking.guestName}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{booking.guestPhone}</Descriptions.Item>
            <Descriptions.Item label="Phòng">
              Phòng {booking.room?.roomNumber || selectedRoom?.roomNumber || booking.roomId}
            </Descriptions.Item>
            <Descriptions.Item label="Nguồn đặt">
              <Tag color={BOOKING_SOURCE_META[booking.source].color}>
                {BOOKING_SOURCE_META[booking.source].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Nhận phòng">
              {dayjs(booking.checkIn).format('HH:mm DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Trả phòng">
              {dayjs(booking.checkOut).format('HH:mm DD/MM/YYYY')}
            </Descriptions.Item>
          </Descriptions>

          {booking.status === BookingStatus.CHECKED_IN && (
            <>
              <Divider orientation="left" style={{ margin: '8px 0' }}>
                Phụ thu dịch vụ / Minibar
              </Divider>
              <Row gutter={[8, 8]} align="middle">
                <Col span={8}>
                  <Input
                    placeholder="Tên món / dịch vụ"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                </Col>
                <Col span={6}>
                  <Select
                    value={newItemCategory}
                    onChange={setNewItemCategory}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'STANDARD', label: 'Tiêu chuẩn' },
                      { value: 'ALCOHOL', label: 'Rượu/Bia (65%)' },
                      { value: 'TOBACCO', label: 'Thuốc lá (75%)' },
                      { value: 'OTHER', label: 'Khác' },
                    ]}
                  />
                </Col>
                <Col span={4}>
                  <InputNumber min={1} value={newItemQty} onChange={(v) => setNewItemQty(v || 1)} style={{ width: '100%' }} />
                </Col>
                <Col span={6}>
                  <Space>
                    <InputNumber
                      min={0}
                      step={10000}
                      value={newItemPrice}
                      onChange={(v) => setNewItemPrice(v || 0)}
                      style={{ width: 95 }}
                    />
                    <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddExtra} />
                  </Space>
                </Col>
              </Row>

              {extraServices.length > 0 && (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {extraServices.map((item, index) => (
                    <div
                      key={item.id || index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                      }}
                    >
                      <Text>
                        {item.name} × {item.quantity} ({item.category})
                      </Text>
                      <Space>
                        <Text strong>{formatVND(item.quantity * item.unitPrice)}</Text>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveExtra(index)}
                        />
                      </Space>
                    </div>
                  ))}
                </Space>
              )}

              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  Phương thức thanh toán khi Check-out
                </Text>
                <Select
                  value={checkoutMethod}
                  onChange={setCheckoutMethod}
                  style={{ width: '100%' }}
                  options={Object.entries(PAYMENT_PROVIDER_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                />
              </div>
            </>
          )}

          <PriceCalculator breakdown={breakdown} paymentType={booking.paymentType} />
        </Space>
      ) : (
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="roomId"
                label="Chọn phòng"
                rules={[{ required: true, message: 'Vui lòng chọn phòng' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={rooms.map((r) => ({
                    value: r.id,
                    label: `P.${r.roomNumber} - ${r.roomType?.name || ''} (${formatVND(r.roomType?.baseRateDaily)})`,
                    disabled: r.status === RoomStatus.MAINTENANCE,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bookingType" label="Hình thức thuê" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: BookingType.DAILY, label: 'Theo ngày / đêm' },
                    { value: BookingType.HOURLY, label: 'Theo giờ (Day-use)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            {watchedBookingType === BookingType.DAILY ? (
              <Col span={14}>
                <Form.Item
                  name="dateRange"
                  label="Ngày nhận - Ngày trả"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày lưu trú' }]}
                >
                  <RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            ) : (
              <Col span={14}>
                <Form.Item name="hours" label="Số giờ lưu trú" rules={[{ required: true }]}>
                  <InputNumber min={1} max={24} style={{ width: '100%' }} addonAfter="giờ" />
                </Form.Item>
              </Col>
            )}
            <Col span={5}>
              <Form.Item name="guests" label="Người lớn" rules={[{ required: true }]}>
                <InputNumber min={1} max={12} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="childrenCount" label="Trẻ em">
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="guestName"
                label="Họ tên khách hàng"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên khách' }]}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="guestPhone"
                label="Số điện thoại"
                rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
              >
                <Input placeholder="0901234567" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="guestEmail" label="Email">
                <Input placeholder="khachhang@email.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="guestIdCard" label="CCCD / Passport">
                <Input placeholder="07909..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="source" label="Nguồn khách">
                <Select
                  options={Object.entries(BOOKING_SOURCE_META).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentType" label="Hình thức thanh toán">
                <Select
                  options={[
                    { value: PaymentType.FULL, label: 'Thanh toán toàn bộ (100%)' },
                    { value: PaymentType.DEPOSIT, label: 'Đặt cọc trước (30%)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Ghi chú đặc biệt">
            <Input.TextArea rows={2} placeholder="Yêu cầu nhận phòng sớm, tầng cao, đón sân bay..." />
          </Form.Item>

          <PriceCalculator breakdown={breakdown} paymentType={watchedPaymentType} />
        </Form>
      )}
    </Drawer>
  );
}
