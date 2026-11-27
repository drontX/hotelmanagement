import { useMemo, useState } from 'react';
import {
  EyeOutlined,
  LoginOutlined,
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Card, Input, Space, Table, Tabs, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import BookingDrawer from '@/components/BookingDrawer';
import { bookingsApi } from '@/services/api';
import { useHotelStore } from '@/store/hotelStore';
import {
  BOOKING_SOURCE_META,
  BOOKING_STATUS_META,
  BookingStatus,
  BookingType,
  RoomStatus,
  formatVND,
} from '@/types';
import type { Booking } from '@/types';

const { Text, Title } = Typography;

export default function Bookings() {
  const { bookings, loadingBookings, addOrUpdateBookingLocal, updateRoomStatus } = useHotelStore();
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusTab !== 'ALL' && b.status !== statusTab) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${b.bookingCode || b.id} ${b.guestName} ${b.guestPhone} ${b.room?.roomNumber || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, statusTab, search]);

  const handleQuickCheckIn = async (record: Booking) => {
    try {
      const updated = await bookingsApi.checkIn(record.id);
      addOrUpdateBookingLocal(updated);
    } catch {
      addOrUpdateBookingLocal({ ...record, status: BookingStatus.CHECKED_IN, actualCheckIn: new Date().toISOString() });
    }
    await updateRoomStatus(record.roomId, RoomStatus.OCCUPIED);
    message.success(`Đã Check-in cho khách ${record.guestName}`);
  };

  const handleQuickCheckOut = async (record: Booking) => {
    try {
      const updated = await bookingsApi.checkOut(record.id);
      addOrUpdateBookingLocal(updated);
    } catch {
      addOrUpdateBookingLocal({ ...record, status: BookingStatus.CHECKED_OUT, actualCheckOut: new Date().toISOString() });
    }
    await updateRoomStatus(record.roomId, RoomStatus.CLEANING);
    message.success(`Đã Check-out cho khách ${record.guestName}`);
  };

  const columns: ColumnsType<Booking> = [
    {
      title: 'Mã đơn',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      width: 145,
      render: (code: string, record) => <Text strong>{code || record.id}</Text>,
    },
    {
      title: 'Khách hàng',
      key: 'guest',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.guestName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.guestPhone}
          </Text>
        </div>
      ),
    },
    {
      title: 'Phòng / Hình thức',
      key: 'room',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="default">P.{record.room?.roomNumber || record.roomId}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.bookingType === BookingType.HOURLY ? `Theo giờ (${record.hours || 2}h)` : 'Theo ngày'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Nhận - Trả phòng',
      key: 'dates',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>Nhận: {dayjs(record.checkIn).format('HH:mm DD/MM/YY')}</div>
          <div>Trả: {dayjs(record.checkOut).format('HH:mm DD/MM/YY')}</div>
        </div>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      key: 'source',
      render: (source: Booking['source']) => (
        <Tag color={BOOKING_SOURCE_META[source].color}>{BOOKING_SOURCE_META[source].label}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: BookingStatus) => (
        <Tag color={BOOKING_STATUS_META[status].color}>{BOOKING_STATUS_META[status].label}</Tag>
      ),
    },
    {
      title: 'Tổng thanh toán',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (amount: number) => <Text strong>{formatVND(amount)}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedBooking(record);
                setDrawerOpen(true);
              }}
            />
          </Tooltip>
          {(record.status === BookingStatus.PENDING || record.status === BookingStatus.CONFIRMED) && (
            <Tooltip title="Nhận phòng">
              <Button
                size="small"
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => handleQuickCheckIn(record)}
              />
            </Tooltip>
          )}
          {record.status === BookingStatus.CHECKED_IN && (
            <Tooltip title="Trả phòng">
              <Button
                size="small"
                danger
                icon={<LogoutOutlined />}
                onClick={() => handleQuickCheckOut(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'ALL', label: `Tất cả (${bookings.length})` },
    ...(Object.values(BookingStatus) as BookingStatus[]).map((st) => ({
      key: st,
      label: `${BOOKING_STATUS_META[st].label} (${bookings.filter((b) => b.status === st).length})`,
    })),
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-header-row" style={{ marginBottom: 0 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý đặt phòng
          </Title>
          <Text type="secondary">Điều phối đặt phòng trực tiếp, khách vãng lai và đơn từ các kênh OTA</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setSelectedBooking(null);
            setDrawerOpen(true);
          }}
        >
          Tạo đặt phòng mới
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <Tabs activeKey={statusTab} onChange={setStatusTab} items={tabItems} style={{ marginBottom: 0 }} />
          <Input
            placeholder="Tìm mã đơn, tên khách, SĐT, số phòng..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
        </div>

        <Table
          rowKey="id"
          loading={loadingBookings}
          columns={columns}
          dataSource={filteredBookings}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 960 }}
        />
      </Card>

      <BookingDrawer
        open={drawerOpen}
        booking={selectedBooking}
        onClose={() => setDrawerOpen(false)}
      />
    </Space>
  );
}
